"""Assertion extraction prompts and parsing for synthesis templates."""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any, Dict, List, Optional

from app.services.synthesis.templates import ExtractionTemplate, get_template

logger = logging.getLogger(__name__)

PROMPT_VERSION = "assertion_v1"


def build_assertion_prompt(
    window_text: str,
    section: str,
    template: ExtractionTemplate,
    peco: Optional[Dict[str, Any]] = None,
    numbered_sentences: Optional[List[str]] = None,
) -> str:
    peco_block = ""
    if peco:
        peco_block = (
            f"\nProject PECO:\n"
            f"- Population: {peco.get('population')}\n"
            f"- Exposure: {peco.get('exposure')}\n"
            f"- Comparator: {peco.get('comparator')}\n"
            f"- Outcome: {peco.get('outcome')}\n"
        )

    fields_desc = "\n".join(
        f"- {f.name}: {f.description}"
        + (f" Allowed: {f.allowed_values}" if f.allowed_values else "")
        for f in template.fields
    )

    sentences_block = window_text
    if numbered_sentences:
        sentences_block = "\n".join(f"[{i+1}] {s}" for i, s in enumerate(numbered_sentences))

    return f"""Extract scientific findings from the text as JSON assertions for an ecological evidence synthesis.

Template: {template.name} ({template.id})
Document section: {section}
{peco_block}
Allowed predicates: {template.predicates}

Fields of interest:
{fields_desc}

Rules:
1. Only extract information present in the text. Do not invent data.
2. Each assertion MUST include evidence with verbatim quotes and sentence numbers when numbered.
3. Set epistemic_status carefully: measured_result only for own study findings (prefer Results);
   author_inference for Discussion interpretations; cited_from_other_work for references to others.
4. If an effect size / number is extracted, include effect.verbatim as the exact substring from the text.
5. Prefer direction increase/decrease/no_effect/mixed when an effect is described.
6. Respond with JSON ONLY:
{{
  "assertions": [
    {{
      "subject": {{"surface": "...", "entity_type": "platform|taxon|other"}},
      "predicate": "...",
      "object": {{"surface": "...", "entity_type": "response_variable|taxon|other"}},
      "qualifiers": {{
        "platform": null,
        "sensor": null,
        "taxon": [{{"surface": "..."}}],
        "environment": [{{"surface": "..."}}],
        "location": {{"surface": "..."}},
        "study_design": null,
        "sample_size": null,
        "response_variable": null
      }},
      "direction": "increase|decrease|no_effect|mixed|not_applicable",
      "effect": {{"metric": "other", "value": null, "verbatim": null}},
      "epistemic_status": "measured_result",
      "polarity": "supports|refutes|neutral",
      "evidence": [{{"sentence_numbers": [1], "quote": "..."}}],
      "rationale": "...",
      "is_inferred": false,
      "confidence": 0.0
    }}
  ]
}}

If no findings, return {{"assertions": []}}.

TEXT:
{sentences_block}
"""


def parse_assertions_response(
    raw: str,
    *,
    work_id: str,
    project_id: str,
    template_id: str,
    section: str,
    span_lookup: Optional[List[Dict[str, Any]]] = None,
    model: Optional[str] = None,
    run_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    data = _extract_json(raw)
    items = data.get("assertions") if isinstance(data, dict) else []
    if not isinstance(items, list):
        return []

    results: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        evidence = []
        for ev in item.get("evidence") or []:
            quote = ev.get("quote") or ""
            sent_nums = ev.get("sentence_numbers") or []
            matched_span = None
            if span_lookup and sent_nums:
                idx = sent_nums[0] - 1
                if 0 <= idx < len(span_lookup):
                    matched_span = span_lookup[idx]
            evidence.append(
                {
                    "span_id": (matched_span or {}).get("id") or str(uuid.uuid4()),
                    "section": (matched_span or {}).get("section") or section,
                    "para_idx": (matched_span or {}).get("para_idx") or 0,
                    "sent_idx": (matched_span or {}).get("sent_idx") or 0,
                    "char_start": (matched_span or {}).get("char_start") or 0,
                    "char_end": (matched_span or {}).get("char_end") or 0,
                    "quote": quote or (matched_span or {}).get("quote") or "",
                }
            )

        subject = item.get("subject") or {"surface": "unknown"}
        obj = item.get("object") or {"surface": "unknown"}
        verbalized = (
            f"{subject.get('surface')} {item.get('predicate')} {obj.get('surface')}; "
            f"{item.get('direction')}; {(item.get('qualifiers') or {}).get('study_design')}"
        )
        results.append(
            {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "work_id": work_id,
                "subject": subject,
                "predicate": item.get("predicate") or "affects",
                "object": obj,
                "qualifiers": item.get("qualifiers") or {},
                "direction": item.get("direction") or "not_applicable",
                "effect": item.get("effect"),
                "epistemic_status": item.get("epistemic_status") or "measured_result",
                "polarity": item.get("polarity") or "neutral",
                "evidence": evidence,
                "rationale": item.get("rationale") or "",
                "is_inferred": bool(item.get("is_inferred", False)),
                "confidence": float(item.get("confidence") or 0.5),
                "template_id": template_id,
                "extractor_model": model,
                "prompt_version": PROMPT_VERSION,
                "run_id": run_id,
                "verbalized": verbalized,
                "review_status": "pending",
                "guard_failures": [],
            }
        )
    return results


def _extract_json(raw: str) -> Any:
    raw = (raw or "").strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
    return {}
