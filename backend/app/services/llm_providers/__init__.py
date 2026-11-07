"""LLM Providers Module - Factory pattern for provider selection"""

from typing import Optional, Type, Dict
from .base import BaseLLMProvider

# Lazy imports to avoid circular dependencies
_PROVIDERS: Dict[str, Type[BaseLLMProvider]] = {}

def _register_providers():
    """Register all available providers"""
    global _PROVIDERS
    if not _PROVIDERS:
        from .openai_provider import OpenAIProvider
        from .google_provider import GoogleProvider
        from .deepseek_provider import DeepSeekProvider
        from .grok_provider import GrokProvider
        from .ollama_provider import OllamaProvider
        
        _PROVIDERS = {
            "openai": OpenAIProvider,
            "google": GoogleProvider,
            "deepseek": DeepSeekProvider,
            "grok": GrokProvider,
            "ollama": OllamaProvider,
        }

_ENV_KEY_ATTRS = {
    "openai": "OPENAI_API_KEY",
    "google": "GOOGLE_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "grok": "GROK_API_KEY",
}


def resolve_api_key(provider_name: str, api_key: Optional[str] = None) -> Optional[str]:
    """Prefer an explicit key, then the matching value from .env / environment."""
    if api_key and api_key.strip():
        return api_key.strip()
    from app.config import settings

    attr = _ENV_KEY_ATTRS.get(provider_name.lower())
    if not attr:
        return None
    env_key = getattr(settings, attr, "") or ""
    return env_key.strip() or None


def get_provider(
    provider_name: str,
    model_name: str,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.7
) -> BaseLLMProvider:
    """
    Factory function to get provider instance
    
    Args:
        provider_name: Name of provider ('openai', 'google', etc.)
        model_name: Model to use
        api_key: API key for authentication
        base_url: Optional custom base URL
        temperature: Generation temperature
        
    Returns:
        Initialized provider instance
        
    Raises:
        ValueError: If provider not found
    """
    _register_providers()
    
    provider_class = _PROVIDERS.get(provider_name.lower())
    if not provider_class:
        available = ", ".join(_PROVIDERS.keys())
        raise ValueError(
            f"Unknown provider '{provider_name}'. "
            f"Available providers: {available}"
        )
    
    return provider_class(
        model_name=model_name,
        api_key=resolve_api_key(provider_name, api_key),
        base_url=base_url,
        temperature=temperature
    )

def get_available_providers() -> Dict[str, dict]:
    """Get information about all available providers"""
    return {
        "openai": {
            "name": "OpenAI",
            "models": ["gpt-4o", "gpt-4o-mini", "o4-mini", "gpt-4.1"],
            "requires_api_key": True,
            "default_model": "gpt-4o-mini"
        },
        "google": {
            "name": "Google Generative AI",
            "models": ["gemini-2.5-pro-preview-03-25", "gemini-2.0-flash-001"],
            "requires_api_key": True,
            "default_model": "gemini-2.0-flash-001"
        },
        "deepseek": {
            "name": "DeepSeek",
            "models": ["deepseek-chat", "deepseek-reasoner"],
            "requires_api_key": True,
            "default_model": "deepseek-chat"
        },
        "grok": {
            "name": "Grok (X AI)",
            "models": ["grok-3", "grok-2", "grok-2-vision"],
            "requires_api_key": True,
            "default_model": "grok-2"
        },
        "ollama": {
            "name": "Ollama (Local)",
            "models": ["llama2", "neural-chat", "mistral"],
            "requires_api_key": False,
            "default_model": "llama2"
        }
    }

__all__ = ["BaseLLMProvider", "get_provider", "get_available_providers", "resolve_api_key"]