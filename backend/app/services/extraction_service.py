"""Core extraction logic service"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
import uuid
from datetime import datetime

from app.models.request_models import CategoryField, ExtractionRequest
from app.models.response_models import ExtractionResultItem, ExtractionResult, ExtractionStatus
from app.services.llm_providers import get_provider

logger = logging.getLogger(__name__)

class ExtractionService:
    """Service for managing extraction logic"""
    
    MAX_RETRIES = 3

    @staticmethod
    def construct_extraction_prompt(
        text: str,
        categories: List[CategoryField]
    ) -> str:
        """
        Construct extraction prompt with category definitions

        Args:
            text: Text to extract from 
            categories: List of categories to extract

        Returns:
            Formatted prompt
        """
        category_desctiptions = []
        category_names = []

        for cat in categories:
            category_desctiptions.append(f"- {cat.name}: {cat:prompt}")
            category_names.append(cat.name)

        expected_output_example = {cat.name: "value" for cat in categories}

        prompt = f"""Extract the following information from the text below.
        For each category, provide the extracted value or null if not found.and
        Categories to extract:
        {chr(10).join(category_desctiptions)}
        Return ONLY valid JSON objects with these exact keys: {json.dumps(category_names)}
        Text to analyze:
        ---
        {text}
        ---
        Return only valid JSON, no other text:"""
        
        return prompt

    @staticmethod
    def parse_llm_response(
        response_text: str,
        row_id: str
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """
        Parse LLM response and extract structured data

        Args:
            response_text: Raw response from LLM
            row_id: ID of row being processed

        Returns:
            Tuple of (parsed_data, error_message)
        """
        try:
            data = json.loads(response_text)
            
            if not isinstance(data, dict):
                return {}, f"LLM response is not a JSON object for row {row_id}"

            return data, None

        except json.JSONDecodeError as e:
            try:
                start = response_text.find("{")
                end = response_text.rfind("}")+1

                if start != -1 and end > start:
                    json_str = response_text[start:end]
                    data = json.loads(json_str)
                    return data, None
            except:
                pass

        logger.warning(f"Could not parse LLM response for row {row_id}: {response_text[:100]}")
        return {}, f"Invalid JSON in LLM response for row {row_id}"

    @staticmethod
    def validate_extracted_data(
        data: Dict[str, Any],
        categories: List[CategoryField]
    ) -> Tuple[bool, List[str]]:
        """
        Validate extracted data against category expectations
        
        Args:
            data: Extracted data dictionary
            categories: Category definitions
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        for category in categories:
            value = data.get(category.name)
            
            if category.expected_values and value is not None:
                if value not in category.expected_values:
                    errors.append(
                        f"{category.name}: '{value}' not in expected values "
                        f"{category.expected_values}"
                    )
        
        return len(errors) == 0, errors

    @staticmethod
    def process_extraction(
        rows: List[Dict[str, str]],
        categories: List[CategoryField],
        provider_name: str,
        model_name: str,
        api_key: Optional[str],
        temperature: float = 0.7,
        base_url: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> List[ExtractionResultItem]:
        """
        Process extraction for multiple rows
        
        Args:
            rows: List of rows with 'id' and 'text' keys
            categories: Categories to extract
            provider_name: LLM provider to use
            model_name: Model to use
            api_key: API key for provider
            temperature: Generation temperature
            base_url: Optional custom base URL
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of extraction results
        """
        results = []
        
        # Initialize provider
        try:
            provider = get_provider(
                provider_name=provider_name,
                model_name=model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=temperature
            )
        except Exception as e:
            logger.error(f"Failed to initialize provider: {str(e)}")
            raise
        
        total_rows = len(rows)
        
        for idx, row in enumerate(rows):
            row_id = row.get("id", str(idx))
            text = row.get("text", "")
            
            # Construct prompt
            prompt = ExtractionService.construct_extraction_prompt(text, categories)
            
            # Get LLM response
            llm_response = provider.generate_response(prompt)
            
            if not llm_response.get("success"):
                results.append(ExtractionResultItem(
                    row_id=row_id,
                    extracted_data={},
                    errors=[llm_response.get("error", "LLM error")]
                ))
                logger.error(f"LLM error for row {row_id}: {llm_response.get('error')}")
                continue
            
            # Parse response
            extracted_data, parse_error = ExtractionService.parse_llm_response(
                llm_response.get("response", ""),
                row_id
            )
            
            errors = []
            if parse_error:
                errors.append(parse_error)
            
            # Validate extracted data
            is_valid, validation_errors = ExtractionService.validate_extracted_data(
                extracted_data,
                categories
            )
            
            errors.extend(validation_errors)
            
            results.append(ExtractionResultItem(
                row_id=row_id,
                extracted_data=extracted_data,
                errors=errors if errors else None
            ))
            
            # Call progress callback
            if progress_callback:
                progress_callback(
                    processed=idx + 1,
                    total=total_rows,
                    current_row_id=row_id
                )
        
        return results
