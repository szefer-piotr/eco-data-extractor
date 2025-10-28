"""Status and health check endpoints"""
import logging
from time import timezone
from fastapi import APIRouter
from datetime import datetime, timezone

from app.config import settings
from app.models.response_models import HealthCheckResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health_check():
    """
    Health check endpoint
    
    Returns application health status
    """
    return HealthCheckResponse(
        status="healthy",
        version=settings.API_VERSION,
        database_connected=False,
        timestamp=datetime.now(timezone.utc)
    )


@router.get("/info")
async def get_info():
    """
    Get application information
    """
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc)
    }