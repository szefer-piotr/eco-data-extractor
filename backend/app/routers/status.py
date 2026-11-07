"""Status and health check endpoints"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.database.session import SessionLocal
from app.models.response_models import HealthCheckResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health_check():
    """Health check endpoint"""
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db_ok = True
        db.close()
    except Exception as exc:  # noqa: BLE001
        logger.warning("DB health check failed: %s", exc)

    return HealthCheckResponse(
        status="healthy" if db_ok else "degraded",
        version=settings.API_VERSION,
        database_connected=db_ok,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/info")
async def get_info():
    """Get application information"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "features": ["extraction", "evidence_synthesis"],
        "timestamp": datetime.now(timezone.utc),
    }
