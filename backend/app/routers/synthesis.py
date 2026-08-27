"""API routes for Evidence Synthesis feature."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.synthesis_models import (
    AssertionResponse,
    AssertionReviewUpdate,
    ComparisonTableResponse,
    CostSummary,
    EvidenceCluster,
    GapRecord,
    HypothesisCheckRequest,
    HypothesisCreate,
    HypothesisResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    QARequest,
    QAResponse,
    ReviewDraftRequest,
    ReviewDraftResponse,
    RunExtractionRequest,
    WorkCreate,
    WorkResponse,
)
from app.services.synthesis import SynthesisService, list_templates
from app.services.synthesis.comparison import ComparisonService
from app.services.synthesis.gaps import GapService
from app.services.synthesis.hypotheses import HypothesisService
from app.services.synthesis.retrieval import ReviewService, RetrievalService
from app.services.synthesis.templates import get_template

router = APIRouter()


# ---- templates ----

@router.get("/templates")
def api_list_templates():
    return [t.model_dump() for t in list_templates()]


@router.get("/templates/{template_id}")
def api_get_template(template_id: str):
    try:
        return get_template(template_id).model_dump()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---- projects ----

@router.post("/projects", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    try:
        return SynthesisService.create_project(db, payload)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return SynthesisService.list_projects(db)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = SynthesisService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = SynthesisService.update_project(db, project_id, payload)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    if not SynthesisService.delete_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


# ---- works ----

@router.post("/projects/{project_id}/works", response_model=WorkResponse)
def add_work(project_id: str, payload: WorkCreate, db: Session = Depends(get_db)):
    try:
        return SynthesisService.add_work(db, project_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/projects/{project_id}/works", response_model=List[WorkResponse])
def list_works(project_id: str, db: Session = Depends(get_db)):
    return SynthesisService.list_works(db, project_id)


@router.post("/projects/{project_id}/works/csv", response_model=List[WorkResponse])
async def upload_works_csv(
    project_id: str,
    file: UploadFile = File(...),
    id_column: Optional[str] = Form(None),
    text_column: Optional[str] = Form(None),
    title_column: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        return SynthesisService.add_works_from_csv(
            db,
            project_id,
            content,
            id_column=id_column,
            text_column=text_column,
            title_column=title_column,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/projects/{project_id}/works/pdf", response_model=WorkResponse)
async def upload_work_pdf(
    project_id: str,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    upload_root = Path(settings.UPLOAD_DIR) / "projects" / project_id
    upload_root.mkdir(parents=True, exist_ok=True)
    dest = upload_root / f"{uuid.uuid4()}_{file.filename}"
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    try:
        return SynthesisService.add_work_from_pdf(
            db, project_id, str(dest), title=title or file.filename
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/works/{work_id}/screening", response_model=WorkResponse)
def update_screening(
    work_id: str,
    status: str,
    rationale: Optional[str] = None,
    db: Session = Depends(get_db),
):
    work = SynthesisService.update_screening(db, work_id, status, rationale)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


# ---- extraction / assertions ----

@router.post("/projects/{project_id}/extract")
def run_extract(
    project_id: str,
    payload: RunExtractionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Run assertion extraction synchronously for MVP reliability (can be backgrounded)."""
    try:
        return SynthesisService.run_assertion_extraction(
            db,
            project_id,
            provider=payload.provider,
            model=payload.model,
            temperature=payload.temperature,
            api_key=payload.api_key,
            work_ids=payload.work_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/projects/{project_id}/assertions", response_model=List[AssertionResponse])
def list_assertions(
    project_id: str,
    review_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return SynthesisService.list_assertions(db, project_id, review_status=review_status)


@router.post("/assertions/{assertion_id}/review", response_model=AssertionResponse)
def review_assertion(
    assertion_id: str,
    payload: AssertionReviewUpdate,
    db: Session = Depends(get_db),
):
    result = SynthesisService.review_assertion(db, assertion_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Assertion not found")
    return result


# ---- canonicalize / comparison / gaps ----

@router.post("/projects/{project_id}/canonicalize")
def canonicalize(project_id: str, db: Session = Depends(get_db)):
    return SynthesisService.canonicalize_project(db, project_id)


@router.get(
    "/projects/{project_id}/comparison",
    response_model=ComparisonTableResponse,
)
def comparison_table(project_id: str, db: Session = Depends(get_db)):
    try:
        return SynthesisService.build_comparison(db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/projects/{project_id}/rebuild-synthesis")
def rebuild_synthesis(project_id: str, db: Session = Depends(get_db)):
    return SynthesisService.rebuild_clusters_and_gaps(db, project_id)


@router.get("/projects/{project_id}/clusters", response_model=List[EvidenceCluster])
def list_clusters(project_id: str, db: Session = Depends(get_db)):
    return ComparisonService.list_clusters(db, project_id)


@router.get("/projects/{project_id}/contradictions")
def contradictions(project_id: str, db: Session = Depends(get_db)):
    return ComparisonService.contradiction_reports(db, project_id)


@router.get("/projects/{project_id}/gaps", response_model=List[GapRecord])
def list_gaps(project_id: str, db: Session = Depends(get_db)):
    return GapService.list_gaps(db, project_id)


@router.get("/projects/{project_id}/gaps/heatmap")
def gaps_heatmap(project_id: str, db: Session = Depends(get_db)):
    return GapService.heatmap(db, project_id)


# ---- Q&A / review ----

@router.post("/projects/{project_id}/qa", response_model=QAResponse)
def project_qa(project_id: str, payload: QARequest, db: Session = Depends(get_db)):
    return RetrievalService.answer(db, project_id, payload)


@router.post(
    "/projects/{project_id}/review-draft",
    response_model=ReviewDraftResponse,
)
def review_draft(
    project_id: str, payload: ReviewDraftRequest, db: Session = Depends(get_db)
):
    try:
        return ReviewService.draft(db, project_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---- hypotheses ----

@router.get("/projects/{project_id}/hypotheses", response_model=List[HypothesisResponse])
def list_hypotheses(project_id: str, db: Session = Depends(get_db)):
    return HypothesisService.list(db, project_id)


@router.post("/projects/{project_id}/hypotheses", response_model=HypothesisResponse)
def create_hypothesis(
    project_id: str, payload: HypothesisCreate, db: Session = Depends(get_db)
):
    return HypothesisService.create(db, project_id, payload)


@router.post(
    "/projects/{project_id}/hypotheses/generate",
    response_model=List[HypothesisResponse],
)
def generate_hypotheses(project_id: str, limit: int = 20, db: Session = Depends(get_db)):
    return HypothesisService.generate(db, project_id, limit=limit)


@router.post(
    "/projects/{project_id}/hypotheses/check",
    response_model=HypothesisResponse,
)
def check_hypothesis(
    project_id: str, payload: HypothesisCheckRequest, db: Session = Depends(get_db)
):
    return HypothesisService.check(db, project_id, payload)


@router.get("/projects/{project_id}/hypotheses/temporal-validation")
def temporal_validation(
    project_id: str, cutoff_year: int = 2022, db: Session = Depends(get_db)
):
    try:
        return HypothesisService.temporal_validation(db, project_id, cutoff_year)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---- cost ----

@router.get("/projects/{project_id}/cost", response_model=CostSummary)
def cost_summary(project_id: str, db: Session = Depends(get_db)):
    return SynthesisService.cost_summary(db, project_id)
