"""SQLAlchemy database models"""

from pyexpat import model
from ssl import create_default_context
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Boolean, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone
from typing import Optional

Base = declarative_base()

class ExtractionJob(Base):
    """Tracks extraction processing jobs"""
    __tablename__ = "extraction_jobs"
    
    id = Column(String(36), primary_key=True)  # UUID
    file_name = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)
    
    categories = Column(JSON, nullable=False)  # Stored as JSON
    
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    error_message = Column(Text, nullable=True)

    def __repr__(self):
        return f"<ExtractionJob(id={self.id}, status={self.status})"

class ExtractionResult(Base):
    """Stores individual extraction results"""
    __tablename__ = "extraction_results"
    
    id = Column(String(36), primary_key=True)  # UUID
    job_id = Column(String(36), nullable=False)  # Foreign key
    
    row_id = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    extracted_data = Column(JSON, nullable=False)  # Category -> extracted values
    
    confidence = Column(Float, default=1.0)
    processing_time = Column(Float, nullable=True)  # seconds
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<ExtractionResult(job_id={self.job_id}, row_id={self.row_id})>"

class APIKeyStorage(Base):
    """Securely stores API keys (in production, use encryption)"""
    __tablename__ = "api_keys"
    
    id = Column(String(36), primary_key=True)  # UUID
    provider = Column(String(50), unique=True, nullable=False)
    encrypted_key = Column(Text, nullable=False)  # Should be encrypted in production
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<APIKeyStorage(provider={self.provider})>"

class SavedConfiguration(Base):
    """User preferences and configurations"""
    __tablename__ = "saved_configurations"
    
    id = Column(String(36), primary_key=True)  # UUID
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)
    categories = Column(JSON, nullable=False)
    
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SavedConfiguration(name={self.name})>"