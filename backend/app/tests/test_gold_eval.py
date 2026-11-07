"""Gold-set evaluation harness for assertion extraction quality."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


GOLD_PATH = Path(__file__).parent / "gold" / "uas_biodiversity_gold.json"


def load_gold() -> Dict[str, Any]:
    return json.loads(GOLD_PATH.read_text(encoding="utf-8"))


def score_assertions(
    predicted: List[Dict[str, Any]],
    expected: List[Dict[str, Any]],
) -> Dict[str, float]:
    """Simple field-overlap metrics for CI."""
    if not expected:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}

    hits = 0
    for exp in expected:
        matched = False
        for pred in predicted:
            subj = str((pred.get("subject") or {}).get("surface") or "").lower()
            obj = str((pred.get("object") or {}).get("surface") or "").lower()
            direction = pred.get("direction")
            predicate = pred.get("predicate")
            ok = True
            if exp.get("subject_contains"):
                ok = ok and any(s.lower() in subj for s in exp["subject_contains"])
            if exp.get("object_contains"):
                ok = ok and any(s.lower() in obj for s in exp["object_contains"])
            if exp.get("predicate_in"):
                ok = ok and predicate in exp["predicate_in"]
            if exp.get("direction_in"):
                ok = ok and direction in exp["direction_in"]
            if exp.get("must_have_evidence"):
                ok = ok and bool(pred.get("evidence"))
            if exp.get("must_extract_effect_verbatim"):
                effect = pred.get("effect") or {}
                verb = str(effect.get("verbatim") or "")
                ok = ok and exp["must_extract_effect_verbatim"] in verb
            if ok:
                matched = True
                break
        if matched:
            hits += 1

    recall = hits / len(expected)
    precision = hits / max(len(predicted), 1)
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}


def test_gold_file_loads():
    gold = load_gold()
    assert "items" in gold
    assert len(gold["items"]) >= 2


def test_gold_scoring_smoke():
    predicted = [
        {
            "subject": {"surface": "UAS"},
            "predicate": "affects",
            "object": {"surface": "vigilance behaviour"},
            "direction": "increase",
            "evidence": [{"quote": "vigilance"}],
        }
    ]
    expected = load_gold()["items"][0]["expected_assertions"]
    metrics = score_assertions(predicted, expected)
    assert metrics["recall"] >= 0.5
