import pytest
from app.services.job_service import JobManager

@pytest.fixture(autouse=True)
def reset_jobs():
    """Clear jobs before each test"""
    JobManager._jobs.clear()
    yield
    JobManager._jobs.clear()