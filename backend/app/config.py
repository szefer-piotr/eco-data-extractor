"""Configuration management for the FastAPI application"""

from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings from environment variables"""

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_TITLE: str = "EcoDataExtractor API"
    API_VERSION: str = "1.0.0"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"

    # Database settings
    DATABASE_URL: str = "sqlite:///./ecodata.db"
    DATABASE_ECHO: bool = False  # Set to True for SQL debugging

    # Job processing settings
    MAX_CONCURRENT_JOBS: int = 5
    JOB_TIMEOUT_SECONDS: int = 3600
    RESULT_RETENTION_DAYS: int = 30

    # LLM settings
    DEFAULT_TEMPERATURE: float = 0.7
    MAX_RETRIES: int = 3
    REQUEST_TIMEOUT_SECONDS: int = 300

    # File upload settings
    ALLOWED_FILE_TYPES: List[str] = ["csv", "pdf"]
    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"

    # LLM Provider settings
    OPENAI_API_KEY: str = ""  # Will be loaded from .env
    GOOGLE_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()