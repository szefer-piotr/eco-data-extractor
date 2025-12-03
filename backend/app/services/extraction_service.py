"""Core extraction logic service"""

from ast import Return
import json
import logging
from multiprocessing import process
import re
from typing import Dict, List, Any, Optional, Tuple
import uuid
from datetime import datetime

from app.models.request_models import CategoryField, ExtractionRequest
from app.models.response_models import ExtractionResultItem, ExtractionResult, ExtractionStatus, CategoryExtraction
from app.services.llm_providers import get_provider
from app.services.text_processing_service import TextProcessingService
from app.config import settings

logger = logging.getLogger(__name__)

class ExtractionService:
    """Service for managing extraction logic"""
    
    MAX_RETRIES = 3

    @staticmethod
    def construct_extractio_prompt_with_validation(
        text: str,
        enumerated_text: str,
        categories: List[CategoryField],
        previous_feedback: Optional[List[Dict]] = None
    ) -> str:
        """
        Construct enhanced extraction prompt with sentence references

        Args:
            text: Original text
            enumerated_text: Text with enumerated sentences
            categories: Categories to extract
            previous_feedback: Previous validation feedback for learning

        Returns:
            Enhanced prompt with sentence enumeration
        """
        category_descriptions = []
        category_names = []

        for cat in categories:
            category_descriptions.append(f"- {cat.name}: {cat.prompt}")
            category_names.append(cat.name)

        prompt = f"""
        You are an expert information extractor. Your task is to extract specific information from the given text.
        IMPORTANT: You must reference SPECIFIC SENTENCES by their [ID] when justifying your extractions.
        ENUMERATED TEXT FOR REFERENCE:
        {enumerated_text}

        ORIGINAL TEXT TO ANALYZE:
        ---
        {text}
        ---

        CATEGORIES TO EXTRACT:
        {chr(10).join(category_descriptions)}

        INSTRUCTIONS:
        1. For EACH category, provide:
        - "value": The extracted value (or null if not found)
        - "confidence": Your confidence (0.0 to 1.0)
        - "supporting_sentence_ids": Array of sentence IDs that support this extraction (e.g., [1, 3, 5])
        - "justification": Explain which sentences support this and why
        
        2. For MISSING categories (not found):
        - Return value as null
        - Provide "candidate_sentence_ids": Up to 5 sentence IDs where information might be found
        - "candidate_justifications": Why you think these sentences are relevant
        - "candidate_relevance": Object with sentence IDs as key and relevance scores (0.0-1.0) as values

        3. Return ONLY valid JSON, no other text.

        RESPONSE FORMAT:
        {{
            "category_name": {{
                "value": "extracted value or null",
                "confidence": 0.95,
                "supporting_sentence_ids": [1, 3, 5],
                "justification": "Sentences [1] and [3] mention X, which indicates...",
                "candidate_sentence_ids": [],
                "candidate_sentence_ids": [7, 9, 11],
                "candidate_justifications": "Sentence [7] mentions Y which could be related. Sentence [9] discusses Z...",
                "candidate_relevance": {{"7": 0.6, "9": 0.5, "11": 0.4}}
            }},
            ...
        }}

        {self._build_refinement_context(previous_feedback)}

        Return only valid JSON:
        """
        return prompt

    @staticmethod
    def _build_refinement_context(previous_feedback: Optional[List[Dict]]) -> str:
        """Build learning context from previous feedback"""
        if not previous_feedback:
            return ""

        context_lines = ["\nLEARNING FROM PREVIOUS CORRECTIONS:"]
        for feedback in previous_feedback[-5:]:
            if feedback.get('validation_status') == 'confirmed':
                context_lines.append(
                    f"- {feedback['category']}: User confirmed value '{feedback.get('manual_value', 'N/A')}' "
                    f"using sentences {feedback.get('user_validated_sentences', [])}"
                )
        
        return "\n".join(context_lines)

    @staticmethod
    def parse_llm_response_with_validation(
        response_text: str, 
        row_id: str,
        enumerated_sentences: List[dict]
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """
        Parse enhanced LLM response with sentence references

        Args:
            response_text: Raw response from LLM
            row_id: ID of row being processed
            enumerated_sentences: List of enumerated sentences for mapping

        Returns:
            Tuple of (parsed_data_with_validation, error_message)
        """
        try:
            data = json.lads(response_text)

            if not isinstance(data, dict):
                return {}, f"LLM response is not a JSON object for now {row_id}"

            processed_data = {}
            for category, extraction_data in data.items():
                if not isinstance(extraction_data, dict):
                    continue

                # This part is for categories that were successfully extracted
                supporting_sentences = []
                if "supporting_sentence_ids" in extraction_data:
                    for sid in extraction_data.get("supporting_sentence_ids", []):
                        sent_text = TextProcessingService.get_sentence_by_id(enumerated_sentences, sid)
                        if sent_text:
                            supporting_sentences.append({
                                "sentence_id": sid,
                                "sentence_text": sent_text,
                                "justification": extraction_data.get("justification")
                            })

                candidates = []
                if extraction_data.get("value") is None and "candidate_sentence_ids" in extraction_data:
                    for sid in extraction_data.get("candidate_sentence_ids", []):
                        sent_text = TextProcessingService.get_sentence_by_id(enumerated_sentences, sid)
                        if sent_text:
                            relevance_dict = extraction_data.get("candidate_relevance", {})
                            relevance_score = relevance_dict.get(str(sid), 0.5)

                            candidates.append({
                                "sentence_id": sid,
                                "sentence_text": sent_text,
                                "relevance_score": extraction_data.get("candidate_relevance", {}).get(str(sid), 0.5),
                                "reason": extraction_data.get("candidate_justifications", "")
                            })

                processed_data[category] = {
                    "value": extraction_data.get("value"),
                    "confidence": extraction_data.get("confidence", 0.0),
                    "supporting_sentences": supporting_sentences,
                    "justification": extraction_data.get("justification", ""),
                    "validation_status": "pending",
                    "user_validated_sentences": [],
                    "candidate_sentences": candidates
                }

            return processed_data, None

        except json.JSONDecodeError as e:
            logger.warning(f"Could not parse LLM response for now {row_id}: {response_text[:100]}")
            return {}, f"Invalid JSON in LLM response for row {row_id}"

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
            
            # Construct prompt
            prompt = ExtractionService.construct_extraction_prompt(text, categories)
            logger.info(f"Row {row_id}: Sending prompt to LLM (text length: {len(text)} chars)")
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
            
            # Parse response
            extracted_data, parse_error = ExtractionService.parse_llm_response_with_validation(
                raw_response,
                row_id
            )
            
            logger.info(f"Row {row_id}: Parsed extracted_data: {extracted_data}")
            if parse_error:
                logger.warning(f"Row {row_id}: Parse error: {parse_error}")
            
            errors = []
            if parse_error:
                errors.append(parse_error)
            
            # Validate extracted data
            is_valid, validation_errors = ExtractionService.validate_extracted_data(
                extracted_data,
                categories
            )
            
            logger.info(f"Row {row_id}: Validation result - Valid: {is_valid}, Errors: {validation_errors}")
            
            errors.extend(validation_errors)
            
            # Convert extracted data to CategoryExtraction objects
            category_extraction_data = {}
            for key, value in extracted_data.items():
                category_extraction_data[key] = CategoryExtraction(
                    value=value if value else None,
                    sentence_numbers=[],
                    confidence=0.9 if value else 0.0
                )
            
            results.append(ExtractionResultItem(
                row_id=row_id,
                extracted_data=category_extraction_data,  # ← Use the converted data
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
