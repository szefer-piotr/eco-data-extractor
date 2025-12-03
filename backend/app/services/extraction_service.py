"""Core extraction logic service"""

import json
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
import uuid
from datetime import datetime

from app.models.request_models import CategoryField, ExtractionRequest
from app.models.response_models import ExtractionResultItem, ExtractionResult, ExtractionStatus, CategoryExtraction, ExtractionEvidence
from app.services.llm_providers import get_provider
from app.config import settings

logger = logging.getLogger(__name__)

class ExtractionService:
    """Service for managing extraction logic"""
    
    MAX_RETRIES = 3

    @staticmethod
    def numerate_text(text: str, sentences: List[str]) -> str:
        """
        Create a numbered version of the text for extraction.

        Args:
            text: Original text
            sentences: Pre-split sentences from TextProcessor

        Returns:
            Text with numbered sentences: "[1] First sentence. [2] Second sentence..."
        """
        if not sentences:
            return f"[1] {text}"
        
        numbered_parts = []
        for idx, sentence in enumerate(sentences, start=1):
            numbered_parts.append(f"[{idx}] {sentence}")

        return " ".join(numbered_parts)

    @staticmethod
    def construct_extraction_prompt_with_validation(
        text: str,
        sentences: List[str],
        categories: List[CategoryField]
    ) -> str:
        """
        Construct extraction prompt with sentence numbering and validation requirements.
        
        Args:
            text: Original text
            sentences: Pre-split sentences
            categories: List of categories to extract
            
        Returns:
            Formatted prompt with numbered text and validation instructions
        """
        # Numerate the text
        numbered_text = ExtractionService.numerate_text(text, sentences)
        
        # Build category descriptions
        category_descriptions = []
        category_names = []
        for cat in categories:
            category_descriptions.append(f"- {cat.name}: {cat.prompt}")
            category_names.append(cat.name)
        
        # Build expected output schema example
        example_output = {
            "example_category": {
                "values": [
                    {
                        "value": "extracted value or null",
                        "sentence_numbers": [1, 3],
                        "rationale": "Brief explanation of why this value was extracted from these sentences",
                        "is_inferred": False,
                        "confidence": 0.95
                    }
                ],
                "primary_value": "the most confident value"
            }
        }
        
        prompt = f"""You are extracting structured information from scientific text. The text has been split into numbered sentences for precise citation.

## INSTRUCTIONS:

1. For each category, extract ALL relevant values found in the text.
2. For EACH extracted value, you MUST provide:
   - `value`: The extracted value (use null if not found)
   - `sentence_numbers`: Array of 1-based sentence numbers that support this extraction
   - `rationale`: A brief justification explaining WHY this value was extracted and HOW the cited sentences support it
   - `is_inferred`: Set to true if the value was inferred/deduced rather than directly stated
   - `confidence`: A score from 0-1 indicating your confidence in the extraction

3. If multiple values exist for a category, include ALL of them in the `values` array.
4. Set `primary_value` to the most confident or most relevant value.
5. If a value is inferred from context (not explicitly stated), mark `is_inferred: true` and explain the inference in the rationale.

## CATEGORIES TO EXTRACT:
{chr(10).join(category_descriptions)}

## EXPECTED OUTPUT FORMAT:
```json
{json.dumps(example_output, indent=2)}
```

## TEXT TO ANALYZE (sentences are numbered [1], [2], etc.):
---
{numbered_text}
---

## IMPORTANT RULES:
- Sentence numbers MUST match the [N] markers in the text above
- Every extraction MUST have at least one supporting sentence number
- Rationale MUST reference the specific content from the cited sentences
- Do NOT make up information not present in the text
- If information is not found, return empty values array and null primary_value

Return ONLY valid JSON, no other text:"""

        return prompt

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
            category_desctiptions.append(f"- {cat.name}: {cat.prompt}")
            category_names.append(cat.name)

        expected_output_example = {cat.name: "value" for cat in categories}

        prompt = f"""Extract the following information from the text below.
        For each category, provide the extracted value or null if not found. And
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
    def parse_validated_llm_response(
        response_text: str,
        row_id: str,
        categories: List[CategoryField]
    ) -> Tuple[Dict[str, CategoryExtraction], Optional[str]]:
        """
        Parse LLM response with validation data into CategoryExtraction objects.
        
        Args:
            response_text: Raw response from LLM
            row_id: ID of row being processed
            categories: Category definitions
            
        Returns:
            Tuple of (dict of CategoryExtraction objects, error_message)
        """
        try:
            # Try to parse JSON
            data = json.loads(response_text)
            
            if not isinstance(data, dict):
                return {}, f"LLM response is not a JSON object for row {row_id}"
            
            result = {}
            for cat in categories:
                cat_data = data.get(cat.name, {})
                
                if isinstance(cat_data, dict):
                    values_data = cat_data.get("values", [])
                    primary_value = cat_data.get("primary_value")
                    
                    # Parse evidence items
                    evidence_list = []
                    all_sentence_nums = []
                    
                    for v in values_data:
                        if isinstance(v, dict):
                            sent_nums = v.get("sentence_numbers", [])
                            all_sentence_nums.extend(sent_nums)
                            
                            evidence = ExtractionEvidence(
                                value=v.get("value"),
                                sentence_numbers=sent_nums,
                                rationale=v.get("rationale", ""),
                                is_inferred=v.get("is_inferred", False),
                                confidence=v.get("confidence", 0.9)
                            )
                            evidence_list.append(evidence)
                    
                    # Build CategoryExtraction
                    result[cat.name] = CategoryExtraction(
                        values=evidence_list,
                        primary_value=primary_value,
                        value=primary_value,  # Backward compatibility
                        sentence_numbers=list(set(all_sentence_nums)),
                        confidence=evidence_list[0].confidence if evidence_list else 0.0,
                        rationale=evidence_list[0].rationale if evidence_list else None
                    )
                else:
                    # Handle old-style simple value response
                    result[cat.name] = CategoryExtraction(
                        values=[],
                        primary_value=str(cat_data) if cat_data else None,
                        value=str(cat_data) if cat_data else None
                    )
            
            return result, None
            
        except json.JSONDecodeError as e:
            # Try to extract JSON from response
            try:
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start != -1 and end > start:
                    return ExtractionService.parse_validated_llm_response(
                        response_text[start:end], row_id, categories
                    )
            except:
                pass
            
            logger.warning(f"Could not parse LLM response for row {row_id}: {response_text[:200]}")
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
    ) -> List[Dict]:
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
            sentences = row.get("sentences", [])  # Use pre-computed sentences
            
            # Use new prompt with validation
            prompt = ExtractionService.construct_extraction_prompt_with_validation(
                text, sentences, categories
            )
            
            logger.info(f"Row {row_id}: Sending validated prompt (text length: {len(text)}, sentences: {len(sentences)})")
            logger.debug(f"Row {row_id}: Full prompt:\n{prompt}")
            
            # Get LLM response
            llm_response = provider.generate_response(prompt)
            logger.info(f"Row {row_id}: LLM response status: {llm_response.get('success')}")
            
            if not llm_response.get("success"):
                error_msg = llm_response.get("error", "LLM error")
                logger.error(f"Row {row_id}: LLM error: {error_msg}")
                results.append(ExtractionResultItem(
                    row_id=row_id,
                    extracted_data={},
                    errors=[error_msg]
                ))
                continue
            
            raw_response = llm_response.get("response", "")
            logger.info(f"Row {row_id}: Raw LLM response:\n{raw_response}")
            
            # Parse with new validated parser
            extracted_data, parse_error = ExtractionService.parse_validated_llm_response(
                raw_response, row_id, categories
            )
            
            logger.info(f"Row {row_id}: Parsed extracted_data: {extracted_data}")
            if parse_error:
                logger.warning(f"Row {row_id}: Parse error: {parse_error}")
            
            errors = []
            if parse_error:
                errors.append(parse_error)
            
            # Validate sentence numbers are within bounds
            max_sentence = len(sentences)
            for cat_name, cat_extraction in extracted_data.items():
                for sent_num in cat_extraction.sentence_numbers:
                    if sent_num < 1 or sent_num > max_sentence:
                        errors.append(f"{cat_name}: Invalid sentence number {sent_num} (max: {max_sentence})")
            
            # Validate extracted data against category expectations
            is_valid, validation_errors = ExtractionService.validate_extracted_data(
                {k: v.primary_value for k, v in extracted_data.items()},
                categories
            )
            
            logger.info(f"Row {row_id}: Validation result - Valid: {is_valid}, Errors: {validation_errors}")
            
            errors.extend(validation_errors)
            
            results.append(ExtractionResultItem(
                row_id=row_id,
                extracted_data=extracted_data,
                errors=errors if errors else None
            ))
            
            logger.info(f"Row {row_id}: Final result - extracted_data: {extracted_data}, errors: {errors}")
            
            # Call progress callback
            if progress_callback:
                progress_callback(
                    processed=idx + 1,
                    total=total_rows,
                    current_row_id=row_id
                )

        logger.info(f"Extraction complete. Total results: {len(results)}")
        final_results = [
            {
                "row_id": r.row_id,
                "extracted_data": r.extracted_data,
                "errors": r.errors
            }
            for r in results
        ]
        logger.info(f"Final results to store: {final_results}")
        return final_results
