"""Database session management"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.database_models import Base

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    """Get database session"""
    return SessionLocal()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def close_db():
    """Close database connection"""
    engine.dispose()