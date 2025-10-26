"""Extraction API endpoints"""
import logging
from signal import default_int_handler
from unittest import result
from backend.app.models.request_models import CategoryField, ExtractionRequest
from backend.app.models.response_models import ExtractionStatus
from backend.app.routers import status
from backend.app.services.data_storage_service import DataStorageService
from backend.app.services.extraction_service import ExtractionService
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.services.job_service import JobManager
from typing import List, Dict, Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/status/{job_id}")
def get_status(job_id: str):
    """Get extraction job status"""
    job = JobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job_id, 
        "status": job["status"].value,
        "progress_percent": job["progress_percent"],
        "processed_rows": job["processed_rows"],
        "total_rows": job["total_rows"],
    }


@router.get("/results/{job_id}")
def get_results(job_id: str):
    """Get extraction results"""

    job = JobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] == ExtractionStatus.PROCESSING:
        raise HTTPException(status_code=202, detail="Job still processing")

    results = DataStorageService.get_job_results(job_id)

    return {
        "job_id": job_id, 
        "status": job["status"].value, 
        "results": results
    }
