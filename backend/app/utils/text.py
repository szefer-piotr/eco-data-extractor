import re
from typing import List, Tuple

class TextProcessor:
    """Utilities for text processing and sentence splitting"""

    # Find sentence patterns but do not break at abbreviations.
    SENTENCE_REGEX = re.compile(
        r'(?<![A-Z]\.)(?<![A-Z][a-z]\.)(?<!\be\.g\.)(?<!\bi\.e\.)'
        r'(?<![A-Z]{2}\.)(?<!\b[A-Z]\.)'
        r'(?<!\b[A-Z][a-z]\.)(?<!\b[A-Z]{2}\.)(?<!\bvs\.)(?<!\bSr\.)(?<!\bJr\.)'
        r'(?<!\bDr\.)(?<!\bProf\.)(?<!\bMr\.)(?<!\bMrs\.)(?<!\bMs\.)(?<!\bDr\.)'
        r'(?<!\brev\.)(?<!\bvol\.)(?<!\bpp\.)(?<!\beq\.)(?<!\bfig\.)(?<!\bno\.)(?<!\bno\.)'
        r'(?<!\bet\s+al\.)(?<!\band\s+Co\.)(?<!\bp\.)(?<!\bpp\.)'
        r'(?<!\bca\.)(?<!\bapprox\.)(?<!\bDec\.)(?<!\bJan\.)(?<!\bFeb\.)'
        r'(?<!\bMar\.)(?<!\bApr\.)(?<!\bMay\.)(?<!\bJun\.)(?<!\bJul\.)'
        r'(?<!\bAug\.)(?<!\bSep\.)(?<!\bOct\.)(?<!\bNov\.)(?<!\bSc\.)(?<!\bSci\.)(?<!\bCorp\.)'
        r'(?<!\bInc\.)(?<!\bLtd\.)(?<!\bCo\.)(?<!\bComm\.)(?<!\bDept\.)'
        r'(?<!\bU\.S\.)(?<!\bU\.K\.)(?<!\bE\.U\.)(?<!\bno\.)(?<!\bso\.)(?<!\bst\.)'
        r'(?<!\bsp\.)(?<!\bsubsp\.)(?<!\bvar\.)(?<!\bform\.)(?<!\bsubform\.)(?<!\bmorph\.)'
        r'(?<![0-9]\.)(?<![0-9][0-9]\.)(?<![0-9][0-9][0-9]\.)'
        r'([.!?])\s+(?=[A-Z]|$)',
        re.MULTILINE
    )

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """
        Split text into sentences.
        Args:
            text: Input text
        Returns:
            List of sentences (stripped)
        """
        if not text or len(text.strip())==0:
            return []

        sentences = TextProcessor.SENTENCE_REGEX.split(text)
        result = []
        for i in range(0, len(sentences), 2):
            if i + 1 < len(sentences):
                sent = sentences[i] + sentences[i + 1]
            else:
                sent = sentences[i]
            sent = sent.strip()
            if sent:
                result.append(sent)

        return

    @staticmethod
    def get_sentence_offsets(text: str, sentences: List[str]) -> List[Tuple[int, int]]:
        """
        Get character offsets for each sentence in the original text.
        
        Args:
            text: Original text
            sentences: List of sentences from split_sentences()
        
        Returns:
            List of (startn end) character indices per sentence
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