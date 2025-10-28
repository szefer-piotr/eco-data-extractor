"""Configuration endpoints"""
import logging
from zoneinfo import available_timezones

from requests import status_codes
from fastapi import APIRouter, HTTPException
from typing import Dict

from app.models.request_models import APIKeyRequest, ProviderEnum
from app.models.response_models import ProviderInfo, ConfigurationResponse
from app.services.llm_providers import get_available_providers

router = APIRouter()
logger = logging.getLogger(__name__)

# Temporary API key storage
_api_keys: Dict[str, str] = {}


@router.post("/api-keys")
def set_api_key(request: APIKeyRequest):
    """
    Store API key for a provider
    WARNING: Temporary solution. In production, encrypted storage or secrets manager will be used.
    """
    try:
        available_providers = get_available_providers()
        if request.provider.value not in available_providers:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")
        if not request.api_key or len(request.api_key.strip()) == 0:
            raise HTTPException(status_code=400, detail="API key cannot be empty")

        _api_keys[request.provider.value] = request.api_key

        logger.info(f"API key set for provider: {request.provider}")

        return {
            "provider": request.provider.value,
            "status": "stored",
            "message": "API key stored successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting API key: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to set API key: {str(e)}")


@router.get("/api-key/{provider}")
def get_api_key(provider: str):
    try:
        if provider not in _api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"No API key configured for provider: {provider}"
            )

        return {
            "provider": provider,
            "has_key": True,
            "api_key": _api_keys[provider]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving API key: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve API key: {str(e)}")


@router.get("/models")
def get_models(provider: str = None):
    """
    Get available models per provider
    
    Query Parameters:
        provider (optional): Filter by specific provider name
                            (openai, google, deepseek, grok, ollama)
    
    Returns:
        Dictionary with provider information including:
        - name: Provider display name
        - models: List of available models
        - requires_api_key: Whether API key is needed
        - default_model: Default model to use
    
    Examples:
        GET /api/config/models 
        → All providers and models
        
        GET /api/config/models?provider=openai
        → Only OpenAI models
    """
    try:
        all_providers = get_available_providers()

        if provider:
            if provider not in all_providers:
                raise HTTPException(
                    status_code=404,
                    detail=f"Unknown provider: {provider}. Available: {', '.join(all_providers.keys())}"
                )
            return {
                provider: all_providers[provider]
            }
        
        return all_providers

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@router.get("/")
def get_configuration():
    """
    Get current configuration
    """
    try:
        available_providers = get_available_providers()
        providers_dict = {}
        
        for prov_name, config in available_providers.items():
            providers_dict[prov_name] = ProviderInfo(
                name=config["name"],
                available_models=config["models"],
                requires_api_key=config["requires_api_key"],
                base_url_required=config.get("base_url_required", False)
            )
        
        return {
            "providers": providers_dict,
            "default_provider": "openai",
            "default_model": "gpt-4o",
            "temperature_range": {"min": 0.0, "max": 2.0}
        }
    
    except Exception as e:
        logger.error(f"Error getting configuration: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")