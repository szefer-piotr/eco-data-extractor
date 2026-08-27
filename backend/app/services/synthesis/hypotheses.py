"""Hypothesis generation and checking."""

from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.database_models import Assertion, Hypothesis, Project
from app.models.synthesis_models import (
    HypothesisCheckRequest,
    HypothesisCreate,
    HypothesisResponse,
)
from app.services.synthesis.comparison import ComparisonService
from app.services.synthesis.gaps import GapService
from app.services.synthesis.retrieval import RetrievalService
from app.models.synthesis_models import QARequest


class HypothesisService:
    @staticmethod
    def list(db: Session, project_id: str) -> List[HypothesisResponse]:
        rows = (
            db.query(Hypothesis)
            .filter(Hypothesis.project_id == project_id)
            .order_by(Hypothesis.created_at.desc())
            .all()
        )
        return [HypothesisService._to_response(h) for h in rows]

    @staticmethod
    def create(
        db: Session, project_id: str, payload: HypothesisCreate
    ) -> HypothesisResponse:
        hyp = Hypothesis(
            id=str(uuid.uuid4()),
            project_id=project_id,
            statement=payload.statement,
            structured=payload.structured,
            source=payload.source,
            novelty=0.5,
            plausibility=0.5,
            testability=0.5,
            feasibility=0.5,
            status="proposed",
        )
        db.add(hyp)
        db.commit()
        db.refresh(hyp)
        return HypothesisService._to_response(hyp)

    @staticmethod
    def generate(db: Session, project_id: str, limit: int = 20) -> List[HypothesisResponse]:
        """Generate hypotheses from gaps, analogies, and contradiction moderators."""
        created: List[HypothesisResponse] = []
        existing = {
            (h.statement or "").lower()
            for h in db.query(Hypothesis).filter(Hypothesis.project_id == project_id).all()
        }

        # G1: coverage / quality gaps
        for gap in GapService.list_gaps(db, project_id):
            statement = gap.suggested_research_angle or gap.description
            if statement.lower() in existing:
                continue
            hyp = Hypothesis(
                id=str(uuid.uuid4()),
                project_id=project_id,
                statement=statement,
                structured={"gap_id": gap.id, "axes": gap.axes},
                source="gap",
                novelty=min(1.0, 0.5 + gap.severity * 0.5),
                plausibility=0.6,
                testability=0.7,
                feasibility=0.55,
                status="proposed",
            )
            db.add(hyp)
            existing.add(statement.lower())
            created.append(HypothesisService._to_response(hyp))
            if len(created) >= limit:
                break

        # G2: analogical transfer — platform pattern in taxon A → untested in taxon B
        table = ComparisonService.build_table(db, project_id)
        by_platform_taxon = {}
        taxa = set()
        platforms = set()
        for row in table.rows:
            p = (row.cells or {}).get("platform")
            t = (row.cells or {}).get("target_taxon")
            r = (row.cells or {}).get("response_variable")
            if p and t:
                platforms.add(p)
                taxa.add(t)
                by_platform_taxon[(p, t)] = r
        for p in list(platforms)[:5]:
            known = [t for t in taxa if (p, t) in by_platform_taxon]
            unknown = [t for t in taxa if (p, t) not in by_platform_taxon]
            if known and unknown:
                statement = (
                    f"{p} effects observed in {known[0]} may transfer to {unknown[0]} "
                    f"for response {(by_platform_taxon.get((p, known[0])) or 'outcomes')}"
                )
                if statement.lower() not in existing:
                    hyp = Hypothesis(
                        id=str(uuid.uuid4()),
                        project_id=project_id,
                        statement=statement,
                        structured={
                            "platform": p,
                            "source_taxon": known[0],
                            "target_taxon": unknown[0],
                        },
                        source="analogy",
                        novelty=0.75,
                        plausibility=0.55,
                        testability=0.8,
                        feasibility=0.6,
                        status="proposed",
                    )
                    db.add(hyp)
                    existing.add(statement.lower())
                    created.append(HypothesisService._to_response(hyp))

        # G3: contradiction moderators
        for report in ComparisonService.contradiction_reports(db, project_id):
            mods = report.get("possible_moderators") or ["study context"]
            statement = (
                f"Disagreement in cluster {report['cluster_id']} is explained by "
                f"moderator(s): {', '.join(mods)}"
            )
            if statement.lower() in existing:
                continue
            hyp = Hypothesis(
                id=str(uuid.uuid4()),
                project_id=project_id,
                statement=statement,
                structured=report,
                source="contradiction",
                novelty=0.65,
                plausibility=0.7,
                testability=0.75,
                feasibility=0.65,
                status="proposed",
            )
            db.add(hyp)
            existing.add(statement.lower())
            created.append(HypothesisService._to_response(hyp))

        db.commit()
        return created[:limit]

    @staticmethod
    def check(
        db: Session, project_id: str, payload: HypothesisCheckRequest
    ) -> HypothesisResponse:
        qa = RetrievalService.answer(
            db,
            project_id,
            QARequest(query=payload.statement, mode="verify"),
        )
        verdict = "insufficient"
        lowered = qa.answer.lower()
        if "verdict: supported" in lowered:
            verdict = "supported"
        elif "verdict: mixed" in lowered:
            verdict = "mixed"
        elif "refuted" in lowered or "no effect" in lowered:
            verdict = "refuted"

        # Narrowed statement from cluster context
        narrowed = None
        if "Cluster:" in qa.answer:
            cluster_line = [
                ln for ln in qa.answer.splitlines() if ln.startswith("Cluster:")
            ]
            if cluster_line:
                narrowed = (
                    f"{payload.statement} — evidence scope: {cluster_line[0][8:].strip()}"
                )

        evidence_for = [
            c.assertion_id for c in qa.citations if c.assertion_id and verdict != "refuted"
        ]
        evidence_against = (
            [c.assertion_id for c in qa.citations if c.assertion_id]
            if verdict in {"refuted", "mixed"}
            else []
        )

        hyp = Hypothesis(
            id=str(uuid.uuid4()),
            project_id=project_id,
            statement=payload.statement,
            source="user",
            novelty=0.4,
            plausibility=0.7 if verdict == "supported" else 0.4,
            testability=0.8,
            feasibility=0.7,
            status="under_review",
            evidence_for=evidence_for,
            evidence_against=evidence_against,
            verdict=verdict,
            narrowed_statement=narrowed,
        )
        db.add(hyp)
        db.commit()
        db.refresh(hyp)
        return HypothesisService._to_response(hyp)

    @staticmethod
    def temporal_validation(
        db: Session, project_id: str, cutoff_year: int
    ) -> Dict[str, Any]:
        """Offline-style holdout: hypotheses from gaps on pre-cutoff works vs post-cutoff."""
        works = db.query(Project).filter(Project.id == project_id).first()
        if not works:
            raise ValueError("Project not found")
        from app.models.database_models import Work

        pre = (
            db.query(Work)
            .filter(Work.project_id == project_id, Work.year != None, Work.year < cutoff_year)  # noqa: E711
            .count()
        )
        post = (
            db.query(Work)
            .filter(Work.project_id == project_id, Work.year != None, Work.year >= cutoff_year)  # noqa: E711
            .count()
        )
        # Proxy hit rate: fraction of coverage gaps whose axes appear in post-cutoff rows
        table = ComparisonService.build_table(db, project_id)
        post_keys = set()
        for row in table.rows:
            if (row.year or 0) >= cutoff_year:
                cells = row.cells or {}
                post_keys.add(
                    (
                        cells.get("platform"),
                        cells.get("target_taxon"),
                        cells.get("response_variable"),
                    )
                )
        gaps = [
            g
            for g in GapService.list_gaps(db, project_id)
            if g.gap_type.value == "coverage"
        ]
        hits = 0
        for g in gaps:
            axes = g.axes or {}
            key = (
                axes.get("platform"),
                axes.get("target_taxon"),
                axes.get("response_variable"),
            )
            if key in post_keys:
                hits += 1
        hit_rate = (hits / len(gaps)) if gaps else None
        return {
            "cutoff_year": cutoff_year,
            "pre_cutoff_works": pre,
            "post_cutoff_works": post,
            "coverage_gaps": len(gaps),
            "hits_in_post_cutoff": hits,
            "hit_rate": hit_rate,
            "note": (
                "Proxy metric: coverage-gap cells that appear in post-cutoff comparison rows. "
                "Use with a temporally split corpus for meaningful validation."
            ),
        }

    @staticmethod
    def _to_response(h: Hypothesis) -> HypothesisResponse:
        return HypothesisResponse(
            id=h.id,
            project_id=h.project_id,
            statement=h.statement,
            structured=h.structured,
            source=h.source,
            novelty=h.novelty or 0.0,
            plausibility=h.plausibility or 0.0,
            testability=h.testability or 0.0,
            feasibility=h.feasibility or 0.0,
            status=h.status,
            evidence_for=h.evidence_for or [],
            evidence_against=h.evidence_against or [],
            verdict=h.verdict,
            narrowed_statement=h.narrowed_statement,
        )
