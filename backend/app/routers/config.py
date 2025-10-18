"""Configuration endpoints"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/models")
def get_models():
    """Get available models per provider"""
    return {"providers": {}}


@router.post("/api-keys")
def set_api_key():
    """Set API key for provider"""
    return {"status": "success"}