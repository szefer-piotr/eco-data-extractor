import nltk
import re
from typing import List, Tuple

# Download punkt tokenizer on first import
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class TextProcessor:
    """Utilities for text processing and sentence splitting"""
    
    @staticmethod
    def _fallback_split(text: str) -> List[str]:
        """
        Regex-based fallback for poor NLTK results.
        
        Used when NLTK returns a single very long sentence,
        which often happens with PDF text that has unusual formatting.
        
        Args:
            text: Input text
            
        Returns:
            List of sentences
        """
        # Split on sentence-ending punctuation followed by space and capital letter
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        result = [s.strip() for s in sentences if s.strip()]
        
        # If still single long sentence, try splitting on double newlines
        if len(result) == 1 and len(result[0]) > 1500:
            sentences = re.split(r'\n\s*\n', text)
            result = [s.strip() for s in sentences if s.strip()]
        
        # If still single long sentence, try splitting on single newlines followed by capital
        if len(result) == 1 and len(result[0]) > 1500:
            sentences = re.split(r'\n(?=[A-Z])', text)
            result = [s.strip() for s in sentences if s.strip()]
        
        return result if result else [text.strip()]
    
    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """
        Split text into sentences using NLTK punkt tokenizer.
        
        Handles abbreviations (Dr., Mr., et al., etc.) robustly.
        Falls back to regex-based splitting if NLTK produces poor results.
        
        Args:
            text: Input text
            
        Returns:
            List of sentences (stripped)
        """
        if not text or len(text.strip()) == 0:
            return []
        
        try:
            sentences = nltk.sent_tokenize(text)
            # Strip whitespace
            result = [sent.strip() for sent in sentences if sent.strip()]
            
            # If NLTK returns single sentence > 2000 chars, try regex fallback
            # This often happens with PDF text that lacks proper punctuation
            if len(result) == 1 and len(result[0]) > 2000:
                result = TextProcessor._fallback_split(text)
            
            return result if result else [text.strip()]
        except Exception:
            # Fallback to regex-based split if NLTK fails
            return TextProcessor._fallback_split(text)
    
    @staticmethod
    def get_sentence_offsets(text: str, sentences: List[str]) -> List[Tuple[int, int]]:
        """
        Get character offsets for each sentence in the original text.
        
        Args:
            text: Original text
            sentences: List of sentences from split_sentences()
            
        Returns:
            List of (start, end) character indices per sentence
        """
        offsets = []
        search_start = 0
        
        for sentence in sentences:
            start = text.find(sentence, search_start)
            if start == -1:
                start = search_start
            
            end = start + len(sentence)
            offsets.append((start, end))
            search_start = end
        
        return offsets