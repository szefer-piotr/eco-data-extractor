"""Eco Data Extractor API - FastAPI application entry point"""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.session import close_db, init_db
from app.routers import config, extraction, status, upload
from app.routers import synthesis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Application initialized")
logger.info("Environment: %s", settings.ENVIRONMENT)

app.include_router(extraction.router, prefix="/api/extraction", tags=["extraction"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(status.router, prefix="/api/status", tags=["status"])
app.include_router(synthesis.router, prefix="/api/synthesis", tags=["synthesis"])


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "database_initialized": True,
    }


@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "features": ["extraction", "evidence_synthesis"],
    }


@app.on_event("startup")
def startup_event():
    """Application startup handler"""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    Path("./logs").mkdir(parents=True, exist_ok=True)
    init_db()
    logger.info("Database initialized")
    logger.info("FastAPI application started")


@app.on_event("shutdown")
def shutdown_event():
    """Application shutdown handler"""
    close_db()
    logger.info("FastAPI application stopped")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
    )
