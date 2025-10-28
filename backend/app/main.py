"""Eco Data Extractr API - FastAPI application entry point"""


import logging
from contextlib import contextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import extraction, upload, config, status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
    allow_headers=["*"]
)

logger.info("Application initialized")
logger.info(f"Environment: {settings.ENVIRONMENT}")

app.include_router(extraction.router, prefix="/api/extraction", tags=["extraction"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(status.router, prefix="/api/status", tags=["status"])

# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.API_VERSION}


# Root endpoint (synchronous)
@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.on_event("startup")
def startup_event():
    """Application startup handler"""
    logger.info(" FastAPI application started")


@app.on_event("shutdown")
def shutdown_event():
    """Application shutdown handler"""
    logger.info(" FastAPI application stopped")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
    )