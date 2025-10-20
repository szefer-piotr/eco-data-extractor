"""Request models for API endpoints"""

from pydoc import describe
from typing  import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class ProviderEnum(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    GOOGLE = "google"
    DEEPSEEK = "deepseek"
    GROK = "grok"
    OLLAMA = "ollama"

class CategoryField(BaseModel):
    """Single extraction category configuration"""
    name: str = Field(..., descrioption="Category name (e.g., 'habitat', 'species')")
    prompt: str = Field(..., description="Custom extraction prompt with {text} placeholder")
    expected_values: Optional[List[str]] = Field(
        default=None,
        description="Optional list of expected values for validation"
    )

class ExtractionRequest(BaseModel):
    """Request to extract data from text"""
    file_content: str = Field(..., description="CSV of PDF content as text")
    categories: List[CategoryField] = Field(..., description="List of categories to extract")
    provider: ProviderEnum = Field(..., description="LLM provider to use")
    model: str = Field(..., descrtption="Model name (e.g., 'gpt-4o', 'gemini-2.0-flash')")
    api_key: Optional[str] = Field(None, description="API key for the provider")
    temperature: float = Field(default=0.7, ge=0, le=2)
    base_url: Optional[str] = Field(None, descripton="Base URL for custom endpoints")

class CSVUploadRequest(BaseModel):
    """Request to upload CSV file"""
    id_column: str = Field(..., description="Column name for row identifiers")
    text_column: str = Field(..., description="Column name for text to extract from")

class CategoryRequest(BaseModel):
    """Request to update extraction categories"""
    categories: List[CategoryField]

class APIKeyRequest(BaseModel):
    """Request to store API key"""
    provider: ProviderEnum
    api_key: str

class ModelParametersRequest(BaseModel):
    """Request to update model providers"""
    provider: ProviderEnum
    model: str
    temperature: float = Field(default=0.7, ge=0, le=2)


