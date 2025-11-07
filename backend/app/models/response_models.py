"""Response models for API endpoints"""

from multiprocessing import Value
from token import OP
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class ExtractionStatus(str, Enum):
    """Status of extraction job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CategoryExtraction(BaseModel):
    value: Optional[str] = Field(default=None, description="Extracted value or null if not found")
    sentence_numbers: List[int] = Field(default_factory=list, description="1-based indices of supporting sentences")
    span_offset: Optional[List[Tuple[int, int]]] = Field(default=None, description="Optional character spans in full text")
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    rationale: Optional[str] = Field(default=None, description="Optional brief reason/citation note")

class ExtractionResultItem(BaseModel):
    """Single extraction result"""
    row_id: str = Field(..., description="Row identifier from input data")
    extracted_data: Dict[str, CategoryExtraction] = Field(..., description="Extracted categories and values")
    confidence: float = Field(default=1.0, ge=0, le=1)
    errors: Optional[List[str]] = Field(default=None, description="Any extraction errors")

class ExtractionResult(BaseModel):
    """Complete extraction resutls"""
    job_id: str
    status: ExtractionStatus
    progress_percent: float = Field(ge=0, le=100)
    current_row: Optional[int] = None
    total_rows: Optional[int] = None
    processed_rows: int = 0
    estimated_time_remaining: Optional[float] = None
    message: Optional[str] = None

class ProviderInfo(BaseModel):
    """Information about a provider"""
    name: str
    available_models: List[str]
    requires_api_key: bool
    base_url_required: bool = False

class ConfigurationResponse(BaseModel):
    """Current configuration"""
    providers: Dict[str, ProviderInfo]
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    temperature_range: tuple = (0.0, 2.0)

class CSVColumnsResponse(BaseModel):
    """Available columns in CSV"""
    columns: List[str]
    sample_data: Dict[str, List[str]]

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    database_connected: bool
    timestamp: datetime