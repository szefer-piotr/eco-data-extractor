"""Abstract base class for LLM providers"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import time
import json
import logging

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    """Abstract base class for LLM provider"""

    def __init__(
        self,
        model_name: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.7
    ):
        """
        Initialize provider

        Args:
            model_name: Name of the model (e.g. 'gpt-4o')
            api_key: API key for authentication
            base_url: Optional custom base URL
            temperature: Generation temperature (0-2)
        """
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = base_url
        self.temperature = temperature
        self._setup_client()


    @abstractmethod
    def _setup_client(self):
        """Setup the client for specific provider - must be implemented by subclasses"""
        pass

    @abstractmethod
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """
        Generate response from the model

        Args:
            prompt: Text prompt to send to model

        Returns:
            Dict with keys:
                - response: str - Model response
                - time_taken: float - Processing time in seconds
                - success: bool - Whether request succeeded
                - tokens_used: Optional[int] - Number of tokens used
        """
        pass

    def _get_generation_params(self) -> Dict[str, Any]:
        """Get generation parameters, including temperature"""
        return {"temperature": self.temperature}
    
    def _format_response(
        self,
        response: str,
        time_taken: float,
        success: bool,
        tokens_used: Optional[int] = None,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Format response in standard format
        
        Args:
            response: The generated response
            time_taken: Time taken to generate
            success: Whether generation was successful
            tokens_used: Optional token count
            error: Optional error message
            
        Returns:
            Formatted response dictionary
        """
        return {
            "response": response,
            "time_taken": time_taken,
            "success": success,
            "tokens_used": tokens_used,
            "error": error
        }
    
    def _create_system_prompt(self) -> str:
        """Create standard system prompt for extraction tasks"""
        return (
            "You are a research assistant specialized in data extraction. "
            "You carefully read the provided text, extract the requested information, "
            "and respond ONLY in valid JSON format as instructed. "
            "You never make up data that is not present in the text. "
            "If information is not available, use null values."
        )