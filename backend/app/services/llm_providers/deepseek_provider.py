"""DeepSeek LLM Provider (OpenAI-compatible API)"""

import time
import json
import logging
from typing import Dict, Any, Optional
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)

class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek provider implementation (uses OpenAI SDK)"""
    
    def _setup_client(self):
        """Setup DeepSeek client"""
        try:
            from openai import OpenAI
            
            if not self.api_key:
                raise ValueError("DeepSeek API key is required")
            
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or "https://api.deepseek.com/v1"
            )
            
        except ImportError:
            raise ImportError(
                "OpenAI library not installed. "
                "Install with: pip install openai>=1.0.0"
            )
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """Generate response using DeepSeek API"""
        start_time = time.time()
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": self._create_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature
            )
            
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=response.choices[0].message.content,
                time_taken=time_taken,
                success=True,
                tokens_used=response.usage.total_tokens
            )
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {str(e)}")
            time_taken = time.time() - start_time
            
            return self._format_response(
                response=json.dumps({"error": str(e)}),
                time_taken=time_taken,
                success=False,
                error=str(e)
            )