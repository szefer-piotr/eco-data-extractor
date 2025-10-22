"""Grok (X.AI) LLM Provider"""

import time
import json
import logging
from typing import Dict, Any, Optional
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

class GrokProvider(BaseLLMProvider):
    """Grok (X.AI) provider implementation"""
    
    def _setup_client(self):
        """Setup Grok client"""
        try:
            from openai import OpenAI
            
            if not self.api_key:
                raise ValueError("Grok API key is required")
            
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.x.ai/v1"
            )
            
        except ImportError:
            raise ImportError(
                "OpenAI library not installed. "
                "Install with: pip install openai>=1.0.0"
            )
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """Generate response using Grok API"""
        start_time = time.time()
        
        try:
            # Special handling for Grok reasoning models
            kwargs = {
                "model": self.model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": self._create_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": self.temperature
            }
            
            if "grok-3" in self.model_name.lower():
                kwargs["reasoning_effort"] = "high"
            
            response = self.client.chat.completions.create(**kwargs)
            
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=response.choices[0].message.content,
                time_taken=time_taken,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Grok API error: {str(e)}")
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=json.dumps({"error": str(e)}),
                time_taken=time_taken,
                success=False,
                error=str(e)
            )