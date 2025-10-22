"""Google Generative AI Provider"""

import time
import json
import logging
from typing import Dict, Any, Optional
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

class GoogleProvider(BaseLLMProvider):
    """Google Generative AI provider implementation"""
    
    def _setup_client(self):
        """Setup Google AI client"""
        try:
            import google.generativeai as genai
            
            if not self.api_key:
                raise ValueError("Google API key is required")
            
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
            
        except ImportError:
            raise ImportError(
                "Google AI library not installed. "
                "Install with: pip install google-generativeai>=0.3.0"
            )
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """Generate response using Google API"""
        start_time = time.time()
        
        try:
            response = self.model.generate_content(
                content=prompt,
                generation_config={
                    "temperature": self.temperature
                }
            )
            
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=response.text,
                time_taken=time_taken,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Google API error: {str(e)}")
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=json.dumps({"error": str(e)}),
                time_taken=time_taken,
                success=False,
                error=str(e)
            )