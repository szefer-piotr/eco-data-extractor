"""Comparison table and evidence cluster builder."""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from typing import Any, Dict, List, Set

from sqlalchemy.orm import Session

from app.models.database_models import Assertion, EvidenceClusterRecord, Project, Work
from app.models.synthesis_models import (
    ComparisonRow,
    ComparisonTableResponse,
    EvidenceCluster,
)
from app.services.synthesis.templates import get_template


COMPARISON_COLUMNS = [
    "title",
    "year",
    "platform",
    "sensor",
    "target_taxon",
    "biome",
    "study_design",
    "response_variable",
    "direction",
    "effect_size",
    "sample_size",
    "location",
    "epistemic_status",
]


class ComparisonService:
    @staticmethod
    def build_table(db: Session, project_id: str) -> ComparisonTableResponse:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        works = {
            w.id: w
            for w in db.query(Work).filter(Work.project_id == project_id).all()
        }
        assertions = (
            db.query(Assertion)
            .filter(
                Assertion.project_id == project_id,
                Assertion.review_status.in_(["accepted", "edited", "pending"]),
            )
            .all()
        )

        # One row per work; merge fields from assertions
        by_work: Dict[str, List[Assertion]] = defaultdict(list)
        for a in assertions:
            by_work[a.work_id].append(a)

        rows: List[ComparisonRow] = []
        filled: Dict[str, int] = Counter()

        for work_id, work in works.items():
            cells: Dict[str, Any] = {
                "title": work.title,
                "year": work.year,
            }
            assertion_ids: List[str] = []
            for a in by_work.get(work_id, []):
                assertion_ids.append(a.id)
                quals = a.qualifiers or {}
                cells.setdefault("platform", quals.get("platform") or _surface(a.subject, "platform"))
                cells.setdefault("sensor", quals.get("sensor"))
                tax = quals.get("taxon") or []
                if tax and isinstance(tax, list) and tax:
                    cells.setdefault(
                        "target_taxon",
                        tax[0].get("canonical_label") or tax[0].get("surface"),
                    )
                else:
                    cells.setdefault("target_taxon", _surface(a.subject, "taxon") or _surface(a.object, "taxon"))
                env = quals.get("environment") or []
                if env and isinstance(env, list) and env:
                    cells.setdefault(
                        "biome",
                        env[0].get("canonical_label") or env[0].get("surface"),
                    )
                cells.setdefault("study_design", quals.get("study_design"))
                cells.setdefault(
                    "response_variable",
                    quals.get("response_variable") or _surface(a.object, "response_variable"),
                )
                cells.setdefault("direction", a.direction)
                if a.effect and a.effect.get("value") is not None:
                    cells.setdefault(
                        "effect_size",
                        f"{a.effect.get('value')} ({a.effect.get('metric')})",
                    )
                cells.setdefault("sample_size", quals.get("sample_size"))
                loc = quals.get("location")
                if isinstance(loc, dict):
                    cells.setdefault("location", loc.get("canonical_label") or loc.get("surface"))
                elif loc:
                    cells.setdefault("location", loc)
                cells.setdefault("epistemic_status", a.epistemic_status)

            for col in COMPARISON_COLUMNS:
                if cells.get(col) not in (None, "", []):
                    filled[col] += 1

            rows.append(
                ComparisonRow(
                    work_id=work_id,
                    title=work.title,
                    year=work.year,
                    cells=cells,
                    assertion_ids=assertion_ids,
                )
            )

        n = max(len(rows), 1)
        completeness = {col: round(filled.get(col, 0) / n, 3) for col in COMPARISON_COLUMNS}
        return ComparisonTableResponse(
            project_id=project_id,
            columns=COMPARISON_COLUMNS,
            rows=rows,
            completeness=completeness,
        )

    @staticmethod
    def build_clusters(db: Session, project_id: str) -> List[EvidenceCluster]:
        # Clear old clusters
        db.query(EvidenceClusterRecord).filter(
            EvidenceClusterRecord.project_id == project_id
        ).delete()
        db.commit()

        assertions = (
            db.query(Assertion)
            .filter(
                Assertion.project_id == project_id,
                Assertion.review_status.in_(["accepted", "edited"]),
            )
            .all()
        )
        groups: Dict[tuple, List[Assertion]] = defaultdict(list)
        for a in assertions:
            subj = (a.subject or {}).get("canonical_label") or (a.subject or {}).get("surface") or "?"
            obj = (a.object or {}).get("canonical_label") or (a.object or {}).get("surface") or "?"
            design = (a.qualifiers or {}).get("study_design") or ""
            key = (subj.lower(), a.predicate, obj.lower(), design)
            groups[key].append(a)

        clusters: List[EvidenceCluster] = []
        for (subj, pred, obj, _), items in groups.items():
            hist = Counter(a.direction for a in items)
            work_ids: Set[str] = {a.work_id for a in items}
            contested = (
                hist.get("increase", 0) > 0
                and (hist.get("decrease", 0) > 0 or hist.get("no_effect", 0) > 0)
            ) or (hist.get("decrease", 0) > 0 and hist.get("no_effect", 0) > 0)
            synthesis = (
                f"{len(work_ids)} studies report that {subj} {pred} {obj}. "
                f"Directions: {dict(hist)}."
            )
            if contested:
                synthesis += " Evidence is contested across studies."

            record = EvidenceClusterRecord(
                id=str(uuid.uuid4()),
                project_id=project_id,
                subject_label=subj,
                predicate=pred,
                object_label=obj,
                n_studies=len(work_ids),
                n_assertions=len(items),
                direction_histogram=dict(hist),
                synthesis=synthesis,
                assertion_ids=[a.id for a in items],
                contested=contested,
            )
            db.add(record)
            clusters.append(
                EvidenceCluster(
                    id=record.id,
                    project_id=project_id,
                    subject_label=subj,
                    predicate=pred,
                    object_label=obj,
                    n_studies=len(work_ids),
                    n_assertions=len(items),
                    direction_histogram=dict(hist),
                    synthesis=synthesis,
                    assertion_ids=[a.id for a in items],
                    contested=contested,
                )
            )
        db.commit()
        return clusters

    @staticmethod
    def list_clusters(db: Session, project_id: str) -> List[EvidenceCluster]:
        rows = (
            db.query(EvidenceClusterRecord)
            .filter(EvidenceClusterRecord.project_id == project_id)
            .all()
        )
        return [
            EvidenceCluster(
                id=r.id,
                project_id=r.project_id,
                subject_label=r.subject_label,
                predicate=r.predicate,
                object_label=r.object_label,
                n_studies=r.n_studies,
                n_assertions=r.n_assertions,
                direction_histogram=r.direction_histogram or {},
                synthesis=r.synthesis,
                assertion_ids=r.assertion_ids or [],
                contested=bool(r.contested),
            )
            for r in rows
        ]

    @staticmethod
    def contradiction_reports(db: Session, project_id: str) -> List[Dict[str, Any]]:
        clusters = ComparisonService.list_clusters(db, project_id)
        reports = []
        for c in clusters:
            if not c.contested:
                continue
            assertions = (
                db.query(Assertion).filter(Assertion.id.in_(c.assertion_ids or [])).all()
            )
            supporting = [
                a.id for a in assertions if a.direction in {"increase", "decrease"}
            ]
            opposing = [a.id for a in assertions if a.direction == "no_effect"]
            # Also split increase vs decrease
            inc = [a.id for a in assertions if a.direction == "increase"]
            dec = [a.id for a in assertions if a.direction == "decrease"]
            moderators = []
            designs = {(a.qualifiers or {}).get("study_design") for a in assertions}
            biomes = set()
            for a in assertions:
                for env in (a.qualifiers or {}).get("environment") or []:
                    if isinstance(env, dict):
                        biomes.add(env.get("canonical_label") or env.get("surface"))
            if len([d for d in designs if d]) > 1:
                moderators.append("study_design")
            if len([b for b in biomes if b]) > 1:
                moderators.append("biome")
            reports.append(
                {
                    "cluster_id": c.id,
                    "supporting": supporting or inc,
                    "opposing": opposing or dec,
                    "possible_moderators": moderators,
                    "summary": c.synthesis or "",
                }
            )
        return reports


def _surface(mention: Any, hint: str) -> Any:
    if not isinstance(mention, dict):
        return None
    et = (mention.get("entity_type") or "").lower()
    if hint in et or not hint:
        return mention.get("canonical_label") or mention.get("surface")
    return mention.get("canonical_label") or mention.get("surface")
