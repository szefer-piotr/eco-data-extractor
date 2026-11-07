"""Hybrid retrieval, grounded Q&A, review drafting, faithfulness checks."""

from __future__ import annotations

import re
import uuid
from collections import Counter
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.database_models import Assertion, Project, Span, Work
from app.models.synthesis_models import (
    QACitation,
    QARequest,
    QAResponse,
    ReviewDraftRequest,
    ReviewDraftResponse,
    ReviewSection,
)
from app.services.synthesis.comparison import ComparisonService
from app.services.synthesis.gaps import GapService


OVERCLAIM_PATTERNS = [
    (r"\bproves?\b", "causal certainty without experimental design"),
    (r"\bcauses?\b", "causal language"),
    (r"\balways\b", "absolute language"),
    (r"\bnever\b", "absolute language"),
    (r"\bdefinitively\b", "overclaim"),
    (r"\bundoubtedly\b", "overclaim"),
]


class RetrievalService:
    """Router over lexical, structured, and cluster retrieval."""

    @staticmethod
    def answer(db: Session, project_id: str, request: QARequest) -> QAResponse:
        mode = request.mode
        if mode == "aggregate" or _looks_like_aggregate(request.query):
            return RetrievalService._aggregate(db, project_id, request.query)
        if mode == "verify" or _looks_like_verify(request.query):
            return RetrievalService._verify(db, project_id, request.query)
        if mode == "lookup":
            return RetrievalService._lookup(db, project_id, request.query)
        if mode == "review_section":
            return RetrievalService._synthesize(db, project_id, request.query, reviewish=True)
        return RetrievalService._synthesize(db, project_id, request.query)

    @staticmethod
    def _aggregate(db: Session, project_id: str, query: str) -> QAResponse:
        table = ComparisonService.build_table(db, project_id)
        works = db.query(Work).filter(Work.project_id == project_id).count()
        assertions = db.query(Assertion).filter(Assertion.project_id == project_id).count()
        designs = Counter(
            (r.cells or {}).get("study_design")
            for r in table.rows
            if (r.cells or {}).get("study_design")
        )
        platforms = Counter(
            (r.cells or {}).get("platform")
            for r in table.rows
            if (r.cells or {}).get("platform")
        )
        answer = (
            f"Corpus size: {works} works, {assertions} assertions, "
            f"{len(table.rows)} comparison rows.\n"
            f"Study designs: {dict(designs)}\n"
            f"Platforms: {dict(platforms)}"
        )
        # Filter if query mentions a specific field
        q = query.lower()
        if "baci" in q:
            n = sum(
                1
                for r in table.rows
                if str((r.cells or {}).get("study_design") or "").lower() == "baci"
            )
            answer = f"{n} BACI studies in this project."
        return QAResponse(
            answer=answer,
            mode="aggregate",
            confidence=1.0,
            assembly_trace={"retriever": "R3_sql"},
        )

    @staticmethod
    def _lookup(db: Session, project_id: str, query: str) -> QAResponse:
        tokens = [t for t in re.split(r"\W+", query.lower()) if len(t) > 2]
        works = db.query(Work).filter(Work.project_id == project_id).all()
        hits = []
        for w in works:
            blob = f"{w.title or ''} {w.authors or ''} {w.year or ''}".lower()
            if any(t in blob for t in tokens):
                hits.append(w)
        if not hits:
            # Fall back to span search
            spans = (
                db.query(Span)
                .join(Work)
                .filter(Work.project_id == project_id)
                .limit(2000)
                .all()
            )
            citations = []
            snippets = []
            for s in spans:
                if any(t in s.quote.lower() for t in tokens):
                    snippets.append(s.quote)
                    citations.append(
                        QACitation(work_id=s.work_id, quote=s.quote[:300])
                    )
                    if len(snippets) >= 5:
                        break
            answer = "\n".join(f"- {s}" for s in snippets) or "No matching passages found."
            return QAResponse(
                answer=answer,
                mode="lookup",
                citations=citations,
                confidence=0.5 if snippets else 0.0,
                assembly_trace={"retriever": "R1_bm25_spans"},
            )

        parts = []
        citations = []
        for w in hits[:5]:
            parts.append(f"{w.title or w.id} ({w.year})")
            assertions = (
                db.query(Assertion)
                .filter(Assertion.work_id == w.id)
                .limit(5)
                .all()
            )
            for a in assertions:
                parts.append(f"  • {a.verbalized or a.predicate}")
                citations.append(QACitation(assertion_id=a.id, work_id=w.id))
        return QAResponse(
            answer="\n".join(parts),
            mode="lookup",
            citations=citations,
            confidence=0.8,
            assembly_trace={"retriever": "R1_works"},
        )

    @staticmethod
    def _verify(db: Session, project_id: str, query: str) -> QAResponse:
        clusters = ComparisonService.list_clusters(db, project_id)
        tokens = set(re.split(r"\W+", query.lower()))
        best = None
        best_score = 0
        for c in clusters:
            blob = f"{c.subject_label} {c.predicate} {c.object_label}".lower()
            score = sum(1 for t in tokens if t and t in blob)
            if score > best_score:
                best_score = score
                best = c
        if not best:
            return QAResponse(
                answer="Insufficient evidence in the project corpus to verify this claim.",
                mode="verify",
                confidence=0.2,
                limitations="No matching evidence cluster",
                assembly_trace={"retriever": "R6_cluster"},
            )

        hist = best.direction_histogram or {}
        if best.contested:
            verdict = "mixed"
        elif hist.get("increase", 0) > hist.get("decrease", 0) and hist.get(
            "increase", 0
        ) > hist.get("no_effect", 0):
            verdict = "supported"
        elif hist.get("decrease", 0) > hist.get("increase", 0):
            verdict = "supported (decrease)"
        elif hist.get("no_effect", 0) > 0:
            verdict = "refuted / no effect"
        else:
            verdict = "insufficient evidence"

        citations = [QACitation(assertion_id=aid) for aid in (best.assertion_ids or [])[:8]]
        answer = (
            f"Verdict: {verdict}\n"
            f"Cluster: {best.subject_label} —{best.predicate}→ {best.object_label}\n"
            f"Studies: {best.n_studies}; directions: {hist}\n"
            f"{best.synthesis or ''}"
        )
        return QAResponse(
            answer=answer,
            mode="verify",
            citations=citations,
            confidence=0.75 if best.n_studies >= 2 else 0.45,
            assembly_trace={"retriever": "R6_cluster", "cluster_id": best.id},
        )

    @staticmethod
    def _synthesize(
        db: Session, project_id: str, query: str, reviewish: bool = False
    ) -> QAResponse:
        clusters = ComparisonService.list_clusters(db, project_id)
        gaps = GapService.list_gaps(db, project_id)
        table = ComparisonService.build_table(db, project_id)

        top = sorted(clusters, key=lambda c: -c.n_studies)[:8]
        lines = [f"Synthesis for query: {query}", "", "Key findings:"]
        citations: List[QACitation] = []
        for c in top:
            lines.append(f"- {c.synthesis}")
            for aid in (c.assertion_ids or [])[:2]:
                citations.append(QACitation(assertion_id=aid))

        if gaps:
            lines.append("")
            lines.append("Notable gaps:")
            for g in sorted(gaps, key=lambda x: -x.severity)[:5]:
                lines.append(f"- [{g.gap_type.value}] {g.description}")

        lines.append("")
        lines.append(
            f"Based on {len(table.rows)} comparison rows and {len(clusters)} evidence clusters."
        )
        answer = "\n".join(lines)
        flagged = detect_overclaims(answer)
        return QAResponse(
            answer=answer,
            mode="review_section" if reviewish else "synthesize",
            citations=citations,
            confidence=0.7,
            flagged_claims=flagged,
            limitations="Generated from project evidence table; expert review required.",
            assembly_trace={
                "retriever": "R5_clusters+R3_table",
                "n_clusters": len(top),
                "n_gaps": min(5, len(gaps)),
            },
        )


class ReviewService:
    @staticmethod
    def draft(
        db: Session, project_id: str, request: ReviewDraftRequest
    ) -> ReviewDraftResponse:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        sections: List[ReviewSection] = []
        all_citations: List[QACitation] = []
        for name in request.sections:
            prompt = {
                "introduction": f"Introduce the evidence base for: {project.question}",
                "methods": "Summarize the PECO scope, corpus size, and extraction approach used in this project.",
                "results": "Summarize the main comparative findings across studies.",
                "gaps": "Summarize knowledge gaps and contested findings.",
                "conclusion": "Conclude with implications and research priorities.",
            }.get(name, name)
            qa = RetrievalService.answer(
                db,
                project_id,
                QARequest(query=prompt, mode="review_section"),
            )
            appendix = []
            for c in qa.citations:
                appendix.append({"assertion_id": c.assertion_id, "work_id": c.work_id, "quote": c.quote})
            sections.append(
                ReviewSection(
                    name=name,
                    content=qa.answer,
                    citations=qa.citations,
                    evidence_appendix=appendix,
                )
            )
            all_citations.extend(qa.citations)

        # Mechanical bibliography from cited works
        work_ids = {c.work_id for c in all_citations if c.work_id}
        for c in all_citations:
            if c.assertion_id and not c.work_id:
                a = db.query(Assertion).filter(Assertion.id == c.assertion_id).first()
                if a:
                    work_ids.add(a.work_id)
        bibliography = []
        for wid in work_ids:
            w = db.query(Work).filter(Work.id == wid).first()
            if w:
                bibliography.append(
                    {
                        "work_id": w.id,
                        "title": w.title,
                        "authors": w.authors,
                        "year": w.year,
                        "doi": w.doi,
                        "venue": w.venue,
                    }
                )
        bibliography.sort(key=lambda b: (b.get("year") or 0, b.get("title") or ""))
        return ReviewDraftResponse(
            project_id=project_id,
            sections=sections,
            bibliography=bibliography,
        )


def detect_overclaims(text: str) -> List[str]:
    flagged = []
    for pattern, reason in OVERCLAIM_PATTERNS:
        if re.search(pattern, text, re.I):
            flagged.append(f"{reason}: matched {pattern}")
    return flagged


def _looks_like_aggregate(q: str) -> bool:
    return bool(re.search(r"\b(how many|count|number of|proportion|percent)\b", q, re.I))


def _looks_like_verify(q: str) -> bool:
    return bool(re.search(r"\b(does|do|is it true|verify|support|refute)\b", q, re.I))
