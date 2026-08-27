"""Deterministic assertion guards."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

ALLOWED_DIRECTIONS = {"increase", "decrease", "no_effect", "mixed", "not_applicable"}
ALLOWED_EPISTEMIC = {
    "measured_result",
    "author_inference",
    "cited_from_other_work",
    "hypothesis",
    "limitation",
    "background_assumption",
}
ALLOWED_DESIGNS = {
    "experimental",
    "BACI",
    "observational",
    "modelling",
    "review",
    "meta-analysis",
    None,
}


class AssertionGuards:
    """Validate assertions before persistence."""

    @staticmethod
    def run(
        assertion: Dict[str, Any],
        source_text: str,
        allowed_predicates: Optional[Set[str]] = None,
    ) -> List[str]:
        failures: List[str] = []

        evidence = assertion.get("evidence") or []
        if not evidence:
            failures.append("missing_evidence")

        for ev in evidence:
            quote = (ev.get("quote") or "").strip()
            if quote and quote not in source_text:
                # Soft match: allow whitespace-normalized containment
                norm_quote = " ".join(quote.split())
                norm_src = " ".join(source_text.split())
                if norm_quote and norm_quote not in norm_src:
                    failures.append("span_mismatch")
                    break

        direction = assertion.get("direction")
        if direction not in ALLOWED_DIRECTIONS:
            failures.append("invalid_direction")

        epistemic = assertion.get("epistemic_status")
        if epistemic not in ALLOWED_EPISTEMIC:
            failures.append("invalid_epistemic_status")

        qualifiers = assertion.get("qualifiers") or {}
        design = qualifiers.get("study_design")
        if design not in ALLOWED_DESIGNS:
            failures.append("invalid_study_design")

        predicate = assertion.get("predicate")
        if allowed_predicates and predicate not in allowed_predicates:
            failures.append("invalid_predicate")

        effect = assertion.get("effect")
        if effect:
            verbatim = (effect.get("verbatim") or "").strip()
            value = effect.get("value")
            if value is not None:
                if not verbatim:
                    failures.append("effect_missing_verbatim")
                elif verbatim not in source_text and " ".join(verbatim.split()) not in " ".join(
                    source_text.split()
                ):
                    failures.append("effect_verbatim_not_in_source")

        if (
            epistemic == "measured_result"
            and evidence
            and all((e.get("section") or "") == "discussion" for e in evidence)
        ):
            failures.append("measured_result_from_discussion_only")

        conf = assertion.get("confidence")
        if conf is not None and (conf < 0 or conf > 1):
            failures.append("invalid_confidence")

        return failures

    @staticmethod
    def needs_human_review(assertion: Dict[str, Any], failures: List[str]) -> bool:
        if failures:
            return True
        if assertion.get("confidence", 1.0) < 0.6:
            return True
        if assertion.get("effect") and assertion["effect"].get("value") is not None:
            return True
        return False
