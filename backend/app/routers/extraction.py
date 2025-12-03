"""Extraction API endpoints"""
from json import detect_encoding
import logging
from signal import default_int_handler
from unittest import result
from app.models.request_models import CategoryField, ExtractionRequest
from app.models.response_models import ExtractionFeedback, ExtractionStatus
from app.routers import status
from app.services.data_storage_service import DataStorageService
from app.services.extraction_service import ExtractionService
from app.services.text_processing_service import TextProcessingService
from app.services.validation_service import ValidationService
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.services.job_service import JobManager
from typing import List, Dict, Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)
router = APIRouter()
validation_service = ValidationService()

@router.post("/validate-extraction/{job_id}")
async def validate_extraction(
    job_id: str,
    feedback: List[ExtractionFeedback]
) -> Dict[str, Any]:
    """
    Accept user validation feedback for an extraction job.

    Args:
        job_id: Job ID
        feedback: List of validation feedback

    Returns:
        Confirmation of saved feedback
    """
    try:
        feedback_list = [f.model_dump() for i in feedback]
        for row_feedback in feedback_list:
            validation_service.save_user_feedback(
                job_id,
                row_feedback.get("row_id"),
                [row_feedback]
            )

        return {
            "status": "success",
            "message": f"Saved feedback for {len(feedback_list)} items",
            "job_id": job_id
        }

    except Exception as e:
        logger.error(f"Error validating extraction {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/extraction-feedback/{job_id}")
async def get_extraction_feedback(job_id: str) -> Dict[str, Any]:
    """
    Retrieve all validation feedback for a job.

    Args:
        job_id: Job ID

    Returns:
        Feedback data
    """
    try:
        feedback = validation_service.get_feedback_for_job(job_id)
        return {
            "job_id": job_id,
            "feedback_items": feedback,
            "total_feedback": len(feedback)
        }
    
    except Exception as e:
        logger.error(f"Error retrieving feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
def get_status(job_id: str):
    """Get extraction job status"""
    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404, 
            detail=f"Job {job_id} not found."
        )

    return {
        "job_id": job_id, 
        "status": job["status"].value,
        "progress_percent": job["progress_percent"],
        "processed_rows": job["processed_rows"],
        "rows_processed": job["processed_rows"],  # Alias for backward compatibility
        "total_rows": job["total_rows"],
        "created_at": job["created_at"].isoformat() if job.get("created_at") else None,
        "updated_at": job["completed_at"].isoformat() if job.get("completed_at") else None,
    }


@router.get("/results/{job_id}")
async def get_results(job_id: str):
    """Get extraction results"""

    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] == ExtractionStatus.PENDING:
        raise HTTPException(
            status_code=202,  # 202 = "Accepted, still processing"
            detail="Job not started yet"
        )

    if job["status"] == ExtractionStatus.PROCESSING:
        raise HTTPException(
            status_code=202, 
            detail=f"Job processing... {job['progress_percent']:.1f}% complete")

    if job["status"] == ExtractionStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"Job failed: {'; '.join(job['errors']) if job['errors'] else 'Unknown error'}"
        ) 

    if job["status"] == ExtractionStatus.COMPLETED:
        return {
            "job_id": job_id, 
            "status": job["status"].value,
            "total_rows": job["total_rows"],
            "processed_rows": job["processed_rows"],
            "progress_percent": job["progress_percent"],
            "categories": job["categories"],
            "provider": job["provider"],
            "model": job["model"],
            "results": DataStorageService.get_job_results(job_id)
        }

    raise HTTPException(status_code=410, detail="Job was cancelled")


@router.delete("/{job_id}")
async def cancel_extraction(job_id: str):
    """
    Cancel an in-progress extraction job
    - Only works if job is still running
    """
    job = JobManager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if not JobManager.cancel_job(job_id):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job['status'].value}"
        )

    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "Job cancelled successfully"
    }