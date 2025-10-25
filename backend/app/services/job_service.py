"""Service for managing extraction jobs"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List
import logging

from app.models.request_models import CategoryField
from app.models.response_models import ExtractionStatus

logger = logging.getLogger(__name__)

class JobManager:
    """In memory job manager (temporary)"""

    _jobs: Dict[str, Dict] = {}

    @staticmethod
    def create_job(categories: List[CategoryField],
        provider: str,
        model: str,
        rows: int #total rows calculated internally
    ) -> str:
        
        job_id = str(uuid.uuid4())

        job = {
            "job_id": job_id,
            "status": ExtractionStatus.PENDING,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None,
            "total_rows": rows,
            "processed_rows": 0,
            "current_row": None,
            "progress_percent": 0.0,
            "categories": [],
            "provider": provider,
            "model": model,
            "results": [],
            "errors": []
        }

        JobManager._jobs[job_id] = job
        logger.info(f"Created job {job_id}")
        return job_id

    @staticmethod
    def get_job(job_id: str) -> Optional[Dict]:
        """Retrieve job by id"""
        return JobManager._jobs.get(job_id)

    @staticmethod
    def update_job_progress(
        job_id: str,
        processed_rows: int,
        current_row: Optional[str] = None,
        status: ExtractionStatus = ExtractionStatus.PROCESSING
    ) -> bool:
        """Update job progress"""
        job = JobManager._jobs.get(job_id)
        if not job:
            return False

        job["status"] = status
        job["processed_rows"] = processed_rows
        job["current_row"] = current_row

        if job["total_rows"] > 0:
            job["progress_percent"] = (processed_rows / job["total_rows"]) * 100

        if status == ExtractionStatus.PROCESSING and not job["started_at"]:
            job["started_at"] = datetime.utcnow()

        if status == ExtractionStatus.COMPLETED:
            job["completed_at"] = datetime.utcnow()

        return True

    @staticmethod
    def add_result(job_id:str, result: Dict) -> bool:
        job = JobManager._jobs.get(job_id)
        if not job:
            return False

        job["results"].append(result)
        return True

    @staticmethod
    def complete_job(job_id: str, status: ExtractionStatus) -> bool:
        job = JobManager._jobs.get(job_id)
        if not job:
            return False
        
        job["status"] = status
        job["completed_at"] = datetime.now(timezone.utc)
        logger.info(f"Job {job_id} completed with status {status}")
        return True

    @staticmethod
    def cancel_job(job_id: str) -> bool:
        """Cancel a job"""
        job = JobManager._jobs.get(job_id)
        if not job:
            return False
        
        if job["status"] in [ExtractionStatus.COMPLETED, ExtractionStatus.FAILED]:
            return False

        job["status"] = ExtractionStatus.CANCELLED
        job["completed_at"] = datetime.now(timezone.utc)
        logger.info(f"Job {job_id} cancelled")
        return True