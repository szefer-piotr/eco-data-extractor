import nltk
from typing import List, Tuple

# Download punkt tokenizer on first import
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class TextProcessor:
    """Utilities for text processing and sentence splitting"""
    
    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """
        Split text into sentences using NLTK punkt tokenizer.
        
        Handles abbreviations (Dr., Mr., et al., etc.) robustly.
        
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
            return result if result else [text.strip()]
        except Exception:
            # Fallback to simple split if NLTK fails
            return [text.strip()]
    
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