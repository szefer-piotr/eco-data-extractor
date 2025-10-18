"""Extraction API endpoints"""
from fastapi import APIRouter

router = APIRouter()

@router.post("/extract")
def extract_data():
    """Start extraction process"""
    return {"message": "Extraction endpoint - coming soon"}

@router.get("/status/{job_id}")
def get_status(job_id: str):
    """Get extraction job status"""
    return {"job_id": job_id, "status": "pending"}

@router.get("/results/{job_id}")
def get_results(job_id: str):
    """Get extraction results"""
    return {"job_id": job_id, "results": []}