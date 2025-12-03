"""Service for text processing and sentence enumeration"""

import re
import logging
from typing import List, Tuple, Optional
from nltk.tokenize import sent_tokenize
import nltk

logger = logging.getLogger(__name__)

try:
    nltk.data.find('tokenizers/punkt')
except:
    nltk.download('punkt')

class TextProcessingService:
    """Service for processing end enumerating text"""

    @staticmethod
    def split_and_enumerate_sentences(text: str) -> Tuple[List[dict], str]:
        f"""
        Split text into sentences and enumerate them.

        Args:
            text: Raw text to process

        Returns:
            Tuple of:
            - List of dicts with sentence_id, sentence_text
            - Enumerated text string for LLM
        """

        try:
            sentences = sent_tokenize(text)
        except Exception as e:
            logger.warning(f"NLTK tokenizer failed, falling back to simple split: {e}")
            sentences = text.split('. ')
            sentences = [s.strip() + '.' if i < len(sentences) - 1 else s.strip() for i, s in enumerate(sentences)]

        enumerated_sentences = []
        enumerated_text_lines = ["--- ENUMERATED TEXT FOR REFERENCE ==="]

        for i, sentence in enumerate(sentences, start=1):
            sentence = sentence.strip()
            if sentence:
                enumerated_sentences.append({
                    "sentence_id": i,
                    "sentence_text": sentence
                })
                enumerated_text_lines.append(f"[{i}] {sentence}")

        enumerated_text = "\n".join(enumerated_text_lines)
        return enumerated_sentences, enumerated_text

    @staticmethod
    def get_sentence_by_id(enumerated_sentences: List[dict], sentence_id: int) -> Optional[str]:
        """Get sentence text by ID"""
        for sent in enumerated_sentences:
            if sent["sentence_id"] == sentence_id:
                return sent["sentence_text"]
        return None

    @staticmethod
    def validate_sentence_id(sentence_ids: List[int], max_id: int) -> bool:
        """Validate that sentence IDs are within valid range"""
        return all(0 < sid <= max_id for sid in sentence_ids)