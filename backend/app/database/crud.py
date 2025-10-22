"""CRUD operations for database models"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.database_models import (
    ExtractionJob, ExtractionResult, APIKeyStorage, SavedConfiguration
)

class CRUDExtractionJob:
    """CRUD operations for ExtractionJob"""
    
    @staticmethod
    def create(
        db: Session,
        file_name: str,
        provider: str,
        model: str,
        temperature: float,
        categories: List[Dict[str, Any]]
    ) -> ExtractionJob:
        """Create new extraction job"""
        job = ExtractionJob(
            id=str(uuid.uuid4()),
            file_name=file_name,
            provider=provider,
            model=model,
            temperature=temperature,
            categories=categories,
            status="pending"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    
    @staticmethod
    def get_by_id(db: Session, job_id: str) -> Optional[ExtractionJob]:
        """Get job by ID"""
        return db.query(ExtractionJob).filter(ExtractionJob.id == job_id).first()
    
    @staticmethod
    def update_status(db: Session, job_id: str, status: str) -> Optional[ExtractionJob]:
        """Update job status"""
        job = CRUDExtractionJob.get_by_id(db, job_id)
        if job:
            job.status = status
            if status == "processing" and not job.started_at:
                job.started_at = datetime.utcnow()
            elif status == "completed":
                job.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(job)
        return job
    
    @staticmethod
    def update_progress(
        db: Session,
        job_id: str,
        processed_rows: int
    ) -> Optional[ExtractionJob]:
        """Update processed row count"""
        job = CRUDExtractionJob.get_by_id(db, job_id)
        if job:
            job.processed_rows = processed_rows
            db.commit()
            db.refresh(job)
        return job

class CRUDExtractionResult:
    """CRUD operations for ExtractionResult"""
    
    @staticmethod
    def create(
        db: Session,
        job_id: str,
        row_id: str,
        original_text: str,
        extracted_data: Dict[str, Any],
        confidence: float = 1.0,
        processing_time: Optional[float] = None
    ) -> ExtractionResult:
        """Create new extraction result"""
        result = ExtractionResult(
            id=str(uuid.uuid4()),
            job_id=job_id,
            row_id=row_id,
            original_text=original_text,
            extracted_data=extracted_data,
            confidence=confidence,
            processing_time=processing_time
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result
    
    @staticmethod
    def get_by_job_id(db: Session, job_id: str) -> List[ExtractionResult]:
        """Get all results for a job"""
        return db.query(ExtractionResult).filter(ExtractionResult.job_id == job_id).all()