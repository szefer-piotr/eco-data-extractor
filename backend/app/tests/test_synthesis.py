"""Unit tests for evidence synthesis core (no LLM required)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.database.session import SessionLocal, init_db
from app.main import app
from app.models.database_models import Assertion, Project, Work
from app.services.synthesis.guards import AssertionGuards
from app.services.synthesis.windowing import (
    build_spans_for_text,
    screener_heuristic,
    window_spans,
)
from app.services.synthesis.gaps import GapService
from app.services.synthesis.comparison import ComparisonService
from app.services.synthesis.templates import get_template, list_templates


@pytest.fixture(scope="module", autouse=True)
def _db():
    init_db()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_templates_endpoint(client):
    resp = client.get("/api/synthesis/templates")
    assert resp.status_code == 200
    data = resp.json()
    assert any(t["id"] == "uas_biodiversity_v1" for t in data)


def test_create_and_list_project(client):
    payload = {
        "name": "UAS monitoring",
        "question": "How do drones affect wildlife?",
        "peco": {
            "population": "wildlife",
            "exposure": "UAS overflight",
            "comparator": "no overflight",
            "outcome": "vigilance",
        },
        "template_id": "uas_biodiversity_v1",
    }
    resp = client.post("/api/synthesis/projects", json=payload)
    assert resp.status_code == 200, resp.text
    project = resp.json()
    assert project["name"] == "UAS monitoring"

    listed = client.get("/api/synthesis/projects")
    assert listed.status_code == 200
    assert any(p["id"] == project["id"] for p in listed.json())


def test_csv_upload_and_comparison(client):
    create = client.post(
        "/api/synthesis/projects",
        json={
            "name": "CSV project",
            "question": "Patterns in UAS monitoring",
            "peco": {
                "population": "wildlife",
                "exposure": "drone",
                "outcome": "detection",
            },
            "template_id": "uas_biodiversity_v1",
        },
    )
    project_id = create.json()["id"]

    csv_body = (
        "title,text\n"
        "Polar bears,Drone overflights increased vigilance behaviour in polar bears.\n"
        "Cattle,UAS models overestimated cattle densities in rangelands.\n"
    )
    resp = client.post(
        f"/api/synthesis/projects/{project_id}/works/csv",
        files={"file": ("test.csv", csv_body, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    works = resp.json()
    assert len(works) == 2

    # Seed assertions without LLM for comparison/gaps
    db = SessionLocal()
    for i, work in enumerate(works):
        db.add(
            Assertion(
                id=str(uuid.uuid4()),
                project_id=project_id,
                work_id=work["id"],
                subject={"surface": "UAS", "entity_type": "platform"},
                predicate="affects",
                object={"surface": "vigilance" if i == 0 else "density", "entity_type": "response_variable"},
                qualifiers={
                    "platform": "multirotor_uas",
                    "taxon": [{"surface": "polar bear" if i == 0 else "cattle"}],
                    "environment": [{"surface": "arctic" if i == 0 else "rangeland"}],
                    "response_variable": "vigilance" if i == 0 else "density",
                    "study_design": "observational",
                },
                direction="increase" if i == 0 else "mixed",
                epistemic_status="measured_result",
                polarity="supports",
                evidence=[{"span_id": "x", "section": "abstract", "quote": "test", "para_idx": 0, "sent_idx": 0, "char_start": 0, "char_end": 4}],
                rationale="seed",
                confidence=0.9,
                review_status="accepted",
                template_id="uas_biodiversity_v1",
            )
        )
    db.commit()
    db.close()

    client.post(f"/api/synthesis/projects/{project_id}/canonicalize")
    client.post(f"/api/synthesis/projects/{project_id}/rebuild-synthesis")

    comparison = client.get(f"/api/synthesis/projects/{project_id}/comparison")
    assert comparison.status_code == 200
    assert len(comparison.json()["rows"]) == 2

    gaps = client.get(f"/api/synthesis/projects/{project_id}/gaps")
    assert gaps.status_code == 200
    assert isinstance(gaps.json(), list)

    heatmap = client.get(f"/api/synthesis/projects/{project_id}/gaps/heatmap")
    assert heatmap.status_code == 200
    assert "matrix" in heatmap.json()

    qa = client.post(
        f"/api/synthesis/projects/{project_id}/qa",
        json={"query": "How many studies?", "mode": "aggregate"},
    )
    assert qa.status_code == 200
    assert "works" in qa.json()["answer"].lower() or "2" in qa.json()["answer"]

    hyps = client.post(f"/api/synthesis/projects/{project_id}/hypotheses/generate")
    assert hyps.status_code == 200


def test_windowing_and_guards():
    text = (
        "Introduction\nBackground text.\n\n"
        "Results\nThe drone survey showed a significant increase in vigilance (n = 12). "
        "Detection probability was estimated at 0.8. "
        "Animals responded within 30 seconds of overflight. "
        "Another sentence with findings about density estimates.\n"
    )
    spans = build_spans_for_text(str(uuid.uuid4()), text, default_section="other")
    assert len(spans) >= 2
    windows = window_spans(spans, max_words=40)
    assert windows
    assert any(screener_heuristic(w["text"]) for w in windows)

    source = "Effect size Hedges g = 0.65 was observed"
    ok = {
        "evidence": [{"quote": "Effect size Hedges g = 0.65 was observed", "section": "results"}],
        "direction": "increase",
        "epistemic_status": "measured_result",
        "qualifiers": {"study_design": "observational"},
        "predicate": "increases",
        "effect": {"value": 0.65, "verbatim": "Hedges g = 0.65"},
        "confidence": 0.9,
    }
    assert AssertionGuards.run(ok, source, allowed_predicates={"increases"}) == []

    bad = {
        **ok,
        "effect": {"value": 0.99, "verbatim": "not in text"},
        "evidence": [],
    }
    failures = AssertionGuards.run(bad, source)
    assert "missing_evidence" in failures
    assert "effect_verbatim_not_in_source" in failures


def test_template_registry():
    t = get_template("uas_biodiversity_v1")
    assert "affects" in t.predicates
    assert len(list_templates()) >= 2


def test_batch_pdf_upload(client, monkeypatch):
    create = client.post(
        "/api/synthesis/projects",
        json={
            "name": "PDF batch",
            "question": "UAS effects",
            "peco": {
                "population": "wildlife",
                "exposure": "UAS",
                "outcome": "vigilance",
            },
            "template_id": "uas_biodiversity_v1",
        },
    )
    project_id = create.json()["id"]

    def fake_extract(_path: str):
        return (
            "Multirotor UAS surveys increased vigilance behaviour in polar bears.",
            {"parser": "test"},
        )

    monkeypatch.setattr(
        "app.services.synthesis.service.DocumentIngestService.extract_pdf_text",
        fake_extract,
    )
    monkeypatch.setattr(
        "app.services.synthesis.service.DocumentIngestService.enrich_metadata",
        lambda **_kwargs: {},
    )

    # Minimal PDF-looking bytes; content is ignored because extract is mocked
    pdf_bytes = b"%PDF-1.4 fake content"
    resp = client.post(
        f"/api/synthesis/projects/{project_id}/works/pdfs",
        files=[
            ("files", ("paper_a.pdf", pdf_bytes, "application/pdf")),
            ("files", ("paper_b.pdf", pdf_bytes, "application/pdf")),
            ("files", ("notes.txt", b"not a pdf", "text/plain")),
        ],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["uploaded"] == 2
    assert data["failed"] == 0
    assert len(data["works"]) == 2
    titles = {w["title"] for w in data["works"]}
    assert titles == {"paper_a.pdf", "paper_b.pdf"}

    empty = client.post(
        f"/api/synthesis/projects/{project_id}/works/pdfs",
        files=[("files", ("readme.txt", b"x", "text/plain"))],
    )
    assert empty.status_code == 400
