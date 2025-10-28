import pytest
from app.models.response_models import ExtractionStatus
from app.services.job_service import JobManager


class TestJobCreation:
    def test_create_job_returns_uuid(self):
        """Test that creating a job returns a valid job_id"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        assert job_id is not None
        assert isinstance(job_id, str)
        assert len(job_id) > 0

    def test_create_job_initializes_correctly(self):
        """Test that job is initialized with correct values"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        job = JobManager.get_job(job_id)
        
        assert job is not None
        assert job["job_id"] == job_id
        assert job["status"] == ExtractionStatus.PENDING
        assert job["total_rows"] == 10
        assert job["processed_rows"] == 0
        assert job["progress_percent"] == 0.0
        assert job["created_at"] is not None


class TestJobRetrieval:
    def test_get_existing_job(self):
        """Test retrieving an existing job"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        job = JobManager.get_job(job_id)
        assert job is not None
        assert job["job_id"] == job_id

    def test_get_nonexistent_job(self):
        """Test retrieving a non-existent job returns None"""
        job = JobManager.get_job("invalid-id")
        assert job is None


class TestJobProgress:
    def test_update_job_progress(self):
        """Test updating job progress"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        
        JobManager.update_job_progress(job_id, 5, "row_1")
        job = JobManager.get_job(job_id)
        
        assert job["processed_rows"] == 5
        assert job["progress_percent"] == 50.0
        assert job["current_row"] == "row_1"

    def test_update_job_progress_sets_started_at(self):
        """Test that started_at is set when status changes to PROCESSING"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        
        JobManager.update_job_progress(
            job_id, 
            5, 
            "row_1",
            status=ExtractionStatus.PROCESSING
        )
        job = JobManager.get_job(job_id)
        
        assert job["started_at"] is not None
        assert job["status"] == ExtractionStatus.PROCESSING


class TestJobCompletion:
    def test_complete_job(self):
        """Test completing a job"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        
        result = JobManager.complete_job(job_id, ExtractionStatus.COMPLETED)
        assert result is True
        
        job = JobManager.get_job(job_id)
        assert job["status"] == ExtractionStatus.COMPLETED
        assert job["completed_at"] is not None

    def test_cancel_job(self):
        """Test cancelling a job"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        
        result = JobManager.cancel_job(job_id)
        assert result is True
        
        job = JobManager.get_job(job_id)
        assert job["status"] == ExtractionStatus.CANCELLED
        assert job["completed_at"] is not None

    def test_cannot_cancel_completed_job(self):
        """Test that completed jobs cannot be cancelled"""
        job_id = JobManager.create_job(
            categories=[],
            provider="openai",
            model="gpt-4o-mini",
            rows=10
        )
        
        JobManager.complete_job(job_id, ExtractionStatus.COMPLETED)
        result = JobManager.cancel_job(job_id)
        
        assert result is False