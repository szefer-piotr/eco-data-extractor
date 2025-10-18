"""Status and health check endpoints"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    """Health check"""
    return {"status": "healthy"}