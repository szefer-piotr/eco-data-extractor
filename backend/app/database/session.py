"""Database session management"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models.database_models import Base

connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DATABASE_ECHO,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session() -> Session:
    """Get a raw database session (caller must close)."""
    return SessionLocal()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a session and closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def close_db() -> None:
    """Close database connection"""
    engine.dispose()
