"""Ollama Local LLM Provider"""

import time
import json
import logging
from typing import Dict, Any, Optional
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

class OllamaProvider(BaseLLMProvider):
    """Ollama local provider implementation"""
    
    def _setup_client(self):
        """Setup Ollama client"""
        try:
            import requests
            self.base_url = self.base_url or "http://localhost:11434"
            self.session = requests.Session()
        except ImportError:
            raise ImportError(
                "Requests library not installed. "
                "Install with: pip install requests>=2.28.0"
            )
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """Generate response using Ollama API"""
        start_time = time.time()
        
        try:
            import requests
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": self.temperature
                },
                timeout=300  # 5 minute timeout for local LLMs
            )
            response.raise_for_status()
            
            time_taken = time.time() - start_time
            response_data = response.json()
            
            return self._format_response(
                response=response_data.get("response", ""),
                time_taken=time_taken,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Ollama API error: {str(e)}")
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=json.dumps({"error": str(e)}),
                time_taken=time_taken,
                success=False,
                error=str(e)
            )