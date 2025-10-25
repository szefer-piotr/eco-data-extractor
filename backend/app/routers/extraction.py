"""Extraction API endpoints"""
import logging
from backend.app.models.request_models import CategoryField, ExtractionRequest
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.services.job_service import JobManager
from typing import List, Dict, Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)
router = APIRouter()


def validate_extraction_request(request: ExtractionRequest):
    """Validate incoming extraction request"""
    # Check 1: file_content not empty
    if not request.file_content


@router.post("/extract")
def extract_data(
    categories: List[CategoryField],
    provider: str,
    model: str,
    data: pd.DataFrame | List[str]) -> Dict[str, Any]:
    """Start extraction process"""

    rows = len(data)

    job_id = JobManager.create_job(
        categories=categories,
        provider="openai"
        model="gpt-4o",
        rows=rows
    )
    
    return {
        "job_id": job_id,
        "status": submitted,
        "message": "Job {job_id} started. Use the id to check progress"}

@router.get("/status/{job_id}")
def get_status(job_id: str):
    """Get extraction job status"""
    return {"job_id": job_id, "status": "pending"}

@router.get("/results/{job_id}")
def get_results(job_id: str):
    """Get extraction results"""
    return {"job_id": job_id, "results": []}