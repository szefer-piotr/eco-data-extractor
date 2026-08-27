"""Project CRUD, work ingest, assertion runs, synthesis orchestration."""

from __future__ import annotations

import csv
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.database_models import (
    Assertion,
    Entity,
    EvidenceClusterRecord,
    GapRecordDB,
    Hypothesis,
    LLMCallLog,
    Project,
    Span,
    Work,
)
from app.models.synthesis_models import (
    AssertionResponse,
    AssertionReviewUpdate,
    CostSummary,
    PECODefinition,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    WorkCreate,
    WorkResponse,
)
from app.services.llm_providers import get_provider
from app.services.synthesis.assertion_extract import (
    PROMPT_VERSION,
    build_assertion_prompt,
    parse_assertions_response,
)
from app.services.synthesis.canonical import CanonicalizationService
from app.services.synthesis.comparison import ComparisonService
from app.services.synthesis.gaps import GapService
from app.services.synthesis.guards import AssertionGuards
from app.services.synthesis.ingest import DocumentIngestService
from app.services.synthesis.llm_gateway import LLMGateway
from app.services.synthesis.templates import get_template, list_templates
from app.services.synthesis.windowing import screener_heuristic, window_spans

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


class SynthesisService:
    """Facade for evidence synthesis operations."""

    # ---- projects ----

    @staticmethod
    def create_project(db: Session, payload: ProjectCreate) -> ProjectResponse:
        project = Project(
            id=str(uuid.uuid4()),
            name=payload.name,
            question=payload.question,
            peco=payload.peco.model_dump(),
            inclusion_criteria=[c.model_dump() for c in payload.inclusion_criteria],
            exclusion_criteria=[c.model_dump() for c in payload.exclusion_criteria],
            review_type=payload.review_type,
            template_id=payload.template_id,
            status="scoping",
        )
        # Validate template exists
        get_template(payload.template_id)
        db.add(project)
        db.commit()
        db.refresh(project)
        return SynthesisService._project_response(db, project)

    @staticmethod
    def list_projects(db: Session) -> List[ProjectResponse]:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
        return [SynthesisService._project_response(db, p) for p in projects]

    @staticmethod
    def get_project(db: Session, project_id: str) -> Optional[ProjectResponse]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        return SynthesisService._project_response(db, project)

    @staticmethod
    def update_project(
        db: Session, project_id: str, payload: ProjectUpdate
    ) -> Optional[ProjectResponse]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        data = payload.model_dump(exclude_unset=True)
        if "peco" in data and data["peco"] is not None:
            data["peco"] = (
                data["peco"]
                if isinstance(data["peco"], dict)
                else PECODefinition(**data["peco"]).model_dump()
            )
        for key, value in data.items():
            setattr(project, key, value)
        project.updated_at = _utcnow()
        db.commit()
        db.refresh(project)
        return SynthesisService._project_response(db, project)

    @staticmethod
    def delete_project(db: Session, project_id: str) -> bool:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True

    @staticmethod
    def _project_response(db: Session, project: Project) -> ProjectResponse:
        work_count = db.query(Work).filter(Work.project_id == project.id).count()
        assertion_count = (
            db.query(Assertion).filter(Assertion.project_id == project.id).count()
        )
        return ProjectResponse(
            id=project.id,
            name=project.name,
            question=project.question,
            peco=PECODefinition(**project.peco),
            inclusion_criteria=project.inclusion_criteria or [],
            exclusion_criteria=project.exclusion_criteria or [],
            review_type=project.review_type,
            template_id=project.template_id,
            status=project.status,
            work_count=work_count,
            assertion_count=assertion_count,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    # ---- works ----

    @staticmethod
    def add_work(db: Session, project_id: str, payload: WorkCreate) -> WorkResponse:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        text = payload.abstract or ""
        prepared = DocumentIngestService.prepare_work_from_text(
            project_id,
            text,
            title=payload.title,
            doi=payload.doi,
            year=payload.year,
            authors=payload.authors,
            source_type=payload.source_type,
            external_id=payload.external_id,
            default_section="abstract",
            enrich=bool(payload.doi or payload.title),
        )
        return SynthesisService._persist_prepared_work(db, prepared, venue=payload.venue)

    @staticmethod
    def add_works_from_csv(
        db: Session,
        project_id: str,
        content: bytes,
        id_column: Optional[str] = None,
        text_column: Optional[str] = None,
        title_column: Optional[str] = None,
    ) -> List[WorkResponse]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        # Detect encoding lightly
        text = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return []

        columns = reader.fieldnames or list(rows[0].keys())
        id_col = id_column or ("id" if "id" in columns else columns[0])
        text_col = text_column or (
            "abstract"
            if "abstract" in columns
            else "text"
            if "text" in columns
            else columns[1] if len(columns) > 1 else columns[0]
        )
        title_col = title_column or ("title" if "title" in columns else None)

        seen: set = set()
        results: List[WorkResponse] = []
        for row in rows:
            body = (row.get(text_col) or "").strip()
            if not body:
                continue
            title = row.get(title_col) if title_col else None
            external_id = str(row.get(id_col) or "")
            key = DocumentIngestService.dedupe_key(row.get("doi"), title, row.get("authors"))
            if key in seen:
                continue
            seen.add(key)
            prepared = DocumentIngestService.prepare_work_from_text(
                project_id,
                body,
                title=title,
                doi=row.get("doi"),
                year=int(row["year"]) if row.get("year") and str(row["year"]).isdigit() else None,
                authors=row.get("authors"),
                source_type="csv_row",
                external_id=external_id or None,
                default_section="abstract",
            )
            results.append(SynthesisService._persist_prepared_work(db, prepared))
        project.status = "screening"
        project.updated_at = _utcnow()
        db.commit()
        return results

    @staticmethod
    def add_work_from_pdf(
        db: Session,
        project_id: str,
        file_path: str,
        title: Optional[str] = None,
    ) -> WorkResponse:
        text, meta = DocumentIngestService.extract_pdf_text(file_path)
        prepared = DocumentIngestService.prepare_work_from_text(
            project_id,
            text,
            title=title or Path_name(file_path),
            source_type="pdf",
            file_path=file_path,
            default_section="other",
            enrich=True,
        )
        prepared["metadata_json"] = {**(prepared.get("metadata_json") or {}), **meta}
        work = SynthesisService._persist_prepared_work(db, prepared)
        return work

    @staticmethod
    def _persist_prepared_work(
        db: Session, prepared: Dict[str, Any], venue: Optional[str] = None
    ) -> WorkResponse:
        work = Work(
            id=prepared["id"],
            project_id=prepared["project_id"],
            title=prepared.get("title"),
            abstract=prepared.get("abstract"),
            full_text=prepared.get("full_text"),
            doi=prepared.get("doi"),
            year=prepared.get("year"),
            authors=prepared.get("authors"),
            venue=venue,
            source_type=prepared.get("source_type") or "abstract",
            external_id=prepared.get("external_id"),
            file_path=prepared.get("file_path"),
            screening_status="included",
            metadata_json=prepared.get("metadata_json") or {},
        )
        db.add(work)
        for span in prepared.get("spans") or []:
            db.add(
                Span(
                    id=span["id"],
                    work_id=work.id,
                    section=span["section"],
                    para_idx=span["para_idx"],
                    sent_idx=span["sent_idx"],
                    char_start=span["char_start"],
                    char_end=span["char_end"],
                    quote=span["quote"],
                )
            )
        db.commit()
        db.refresh(work)
        return WorkResponse(
            id=work.id,
            project_id=work.project_id,
            title=work.title,
            doi=work.doi,
            year=work.year,
            authors=work.authors,
            venue=work.venue,
            source_type=work.source_type,
            screening_status=work.screening_status,
            screening_rationale=work.screening_rationale,
            created_at=work.created_at,
        )

    @staticmethod
    def list_works(db: Session, project_id: str) -> List[WorkResponse]:
        works = db.query(Work).filter(Work.project_id == project_id).all()
        return [
            WorkResponse(
                id=w.id,
                project_id=w.project_id,
                title=w.title,
                doi=w.doi,
                year=w.year,
                authors=w.authors,
                venue=w.venue,
                source_type=w.source_type,
                screening_status=w.screening_status,
                screening_rationale=w.screening_rationale,
                created_at=w.created_at,
            )
            for w in works
        ]

    @staticmethod
    def update_screening(
        db: Session, work_id: str, status: str, rationale: Optional[str] = None
    ) -> Optional[WorkResponse]:
        work = db.query(Work).filter(Work.id == work_id).first()
        if not work:
            return None
        work.screening_status = status
        work.screening_rationale = rationale
        db.commit()
        db.refresh(work)
        return WorkResponse(
            id=work.id,
            project_id=work.project_id,
            title=work.title,
            doi=work.doi,
            year=work.year,
            authors=work.authors,
            venue=work.venue,
            source_type=work.source_type,
            screening_status=work.screening_status,
            screening_rationale=work.screening_rationale,
            created_at=work.created_at,
        )

    # ---- extraction ----

    @staticmethod
    def run_assertion_extraction(
        db: Session,
        project_id: str,
        *,
        provider: str,
        model: str,
        temperature: float = 0.0,
        api_key: Optional[str] = None,
        work_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")
        template = get_template(project.template_id)
        allowed_predicates = set(template.predicates)

        q = db.query(Work).filter(
            Work.project_id == project_id, Work.screening_status == "included"
        )
        if work_ids:
            q = q.filter(Work.id.in_(work_ids))
        works = q.all()

        llm_provider = get_provider(
            provider_name=provider,
            model_name=model,
            api_key=api_key,
            temperature=temperature,
        )
        run_id = str(uuid.uuid4())
        gateway = LLMGateway(
            llm_provider,
            db=db,
            project_id=project_id,
            run_id=run_id,
            stage="extract",
            prompt_version=PROMPT_VERSION,
        )

        created = 0
        reviewed = 0
        windows_seen = 0
        windows_extracted = 0

        for work in works:
            spans = (
                db.query(Span)
                .filter(Span.work_id == work.id)
                .order_by(Span.para_idx, Span.sent_idx)
                .all()
            )
            span_dicts = [
                {
                    "id": s.id,
                    "section": s.section,
                    "para_idx": s.para_idx,
                    "sent_idx": s.sent_idx,
                    "char_start": s.char_start,
                    "char_end": s.char_end,
                    "quote": s.quote,
                }
                for s in spans
            ]
            windows = window_spans(span_dicts)
            source_text = work.full_text or work.abstract or ""

            for window in windows:
                windows_seen += 1
                if not screener_heuristic(window["text"]):
                    continue
                windows_extracted += 1
                numbered = [s["quote"] for s in window["spans"]]
                prompt = build_assertion_prompt(
                    window["text"],
                    window["section"],
                    template,
                    peco=project.peco,
                    numbered_sentences=numbered,
                )
                result = gateway.generate(prompt)
                if not result.get("success"):
                    continue
                assertions = parse_assertions_response(
                    result.get("response", ""),
                    work_id=work.id,
                    project_id=project_id,
                    template_id=template.id,
                    section=window["section"],
                    span_lookup=window["spans"],
                    model=model,
                    run_id=run_id,
                )
                for assertion in assertions:
                    failures = AssertionGuards.run(
                        assertion, source_text, allowed_predicates=allowed_predicates
                    )
                    assertion["guard_failures"] = failures
                    if AssertionGuards.needs_human_review(assertion, failures):
                        assertion["review_status"] = "pending"
                        reviewed += 1
                    else:
                        assertion["review_status"] = "accepted"
                    db.add(Assertion(**{k: v for k, v in assertion.items() if k in Assertion.__table__.columns.keys()}))
                    created += 1
            db.commit()

        project.status = "extracting"
        project.updated_at = _utcnow()
        db.commit()

        return {
            "run_id": run_id,
            "works_processed": len(works),
            "windows_seen": windows_seen,
            "windows_extracted": windows_extracted,
            "assertions_created": created,
            "queued_for_review": reviewed,
            "tokens_used": gateway.total_tokens,
            "estimated_cost_usd": gateway.total_cost,
        }

    @staticmethod
    def list_assertions(
        db: Session,
        project_id: str,
        review_status: Optional[str] = None,
    ) -> List[AssertionResponse]:
        q = db.query(Assertion).filter(Assertion.project_id == project_id)
        if review_status:
            q = q.filter(Assertion.review_status == review_status)
        rows = q.order_by(Assertion.created_at.desc()).all()
        return [SynthesisService._assertion_response(a) for a in rows]

    @staticmethod
    def review_assertion(
        db: Session, assertion_id: str, payload: AssertionReviewUpdate
    ) -> Optional[AssertionResponse]:
        assertion = db.query(Assertion).filter(Assertion.id == assertion_id).first()
        if not assertion:
            return None
        assertion.review_status = payload.review_status
        if payload.edits:
            for key, value in payload.edits.items():
                if hasattr(assertion, key):
                    setattr(assertion, key, value)
        db.commit()
        db.refresh(assertion)
        return SynthesisService._assertion_response(assertion)

    @staticmethod
    def _assertion_response(a: Assertion) -> AssertionResponse:
        return AssertionResponse(
            id=a.id,
            project_id=a.project_id,
            work_id=a.work_id,
            subject=a.subject,
            predicate=a.predicate,
            object=a.object,
            qualifiers=a.qualifiers or {},
            direction=a.direction,
            effect=a.effect,
            epistemic_status=a.epistemic_status,
            polarity=a.polarity,
            evidence=a.evidence or [],
            rationale=a.rationale or "",
            is_inferred=bool(a.is_inferred),
            confidence=a.confidence or 0.0,
            template_id=a.template_id or "",
            review_status=a.review_status,
            guard_failures=a.guard_failures or [],
            extractor_model=a.extractor_model,
            prompt_version=a.prompt_version,
            run_id=a.run_id,
            created_at=a.created_at,
        )

    # ---- synthesize pipeline ----

    @staticmethod
    def canonicalize_project(db: Session, project_id: str) -> Dict[str, Any]:
        return CanonicalizationService.canonicalize_project(db, project_id)

    @staticmethod
    def build_comparison(db: Session, project_id: str):
        return ComparisonService.build_table(db, project_id)

    @staticmethod
    def rebuild_clusters_and_gaps(db: Session, project_id: str) -> Dict[str, Any]:
        clusters = ComparisonService.build_clusters(db, project_id)
        gaps = GapService.detect_gaps(db, project_id)
        return {"clusters": len(clusters), "gaps": len(gaps)}

    @staticmethod
    def cost_summary(db: Session, project_id: str) -> CostSummary:
        logs = db.query(LLMCallLog).filter(LLMCallLog.project_id == project_id).all()
        by_stage: Dict[str, Dict[str, Any]] = {}
        total_tokens = 0
        total_cost = 0.0
        for log in logs:
            total_tokens += log.tokens_used or 0
            total_cost += log.estimated_cost_usd or 0.0
            stage = by_stage.setdefault(
                log.stage, {"tokens": 0, "cost_usd": 0.0, "calls": 0, "cached": 0}
            )
            stage["tokens"] += log.tokens_used or 0
            stage["cost_usd"] += log.estimated_cost_usd or 0.0
            stage["calls"] += 1
            if log.cached:
                stage["cached"] += 1
        return CostSummary(
            project_id=project_id,
            total_tokens=total_tokens,
            total_calls=len(logs),
            estimated_cost_usd=round(total_cost, 6),
            by_stage=by_stage,
        )


def Path_name(file_path: str) -> str:
    from pathlib import Path

    return Path(file_path).stem
