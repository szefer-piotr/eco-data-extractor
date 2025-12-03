"""PDF file processing service"""

import logging
import re
from typing import List, Dict, Optional, Tuple
import io

logger = logging.getLogger(__name__)

class PDFService:
    """Service for processing PDF files"""

    @staticmethod
    def remove_references(text: str) -> str:
        """
        Remove common reference/bibliography sections from text

        Args:
            text: Full PDF text

        Returns:
            Text with references section removed
        """
        reference_markers = [
            r'(?i)\n\s*(references|bibliography|works cited|citations)\s*\n',
            r'(?i)\n\s*\[?references?\]?\s*\n',
        ]

        for marker in reference_markers:
            match = re.search(marker, text)
            if match:
                text = text[:match.start()]
                logger.info("Removed references section from PDF")
                break

        return text.strip()

    @staticmethod
    def remove_title(text: str, max_title_lines: int = 3) -> str:
        """
        Remove title from PDF text (typically first few lines).
        
        Titles are usually:
        - At the very beginning
        - Short lines (< 100 characters each)
        - 1-3 lines long
        
        Args:
            text: Full PDF text
            max_title_lines: Maximum lines to consider as title (default: 3)
            
        Returns:
            Text with title removed
        """
        lines = text.split('\n')

        if len(lines) <= max_title_lines:
            return text
        
        title_end = 0
        for i in range(min(max_title_lines, len(lines))):
            line = lines[i].strip()
            if len(line) < 100 and line:
                title_end = i+1
            else:
                break

        return '\n'.join(lines[title_end:]).strip()
        
    @staticmethod
    def remove_abstract(text: str) -> str:
        """
        Remove abstract section from PDF text.
        
        Abstracts are typically:
        - Marked with "Abstract" or "Summary" heading
        - Followed by introduction section
        
        Args:
            text: PDF text (title already removed)
            
        Returns:
            Text with abstract removed
        """
        # Common abstract markers (case-insensitive)
        abstract_patterns = [
            r'(?i)\n\s*abstract\s*\n',           # "Abstract" on its own line
            r'(?i)\n\s*summary\s*\n',            # "Summary" on its own line
            r'(?i)^\s*abstract\s*\n',            # "Abstract" at start
        ]
        
        # Introduction markers (where abstract ends)
        introduction_patterns = [
            r'(?i)\n\s*(?:1\.|introduction|background)\s*\n',  # "1. Introduction" or "Introduction"
            r'(?i)\n\s*(?:1\s+introduction)\s*\n',            # "1 Introduction"
        ]
        
        # Search for abstract marker
        for pattern in abstract_patterns:
            match = re.search(pattern, text)
            if match:
                abstract_start = match.end()  # Where abstract content begins
                
                # Find where introduction starts (end of abstract)
                intro_match = re.search(introduction_patterns[0], text[abstract_start:])
                if intro_match:
                    # Found introduction - remove everything from abstract start to intro start
                    return text[:match.start()] + text[abstract_start + intro_match.start():]
                
                # If no introduction found, look for first numbered section
                section_match = re.search(r'\n\s*\d+\.', text[abstract_start:])
                if section_match:
                    return text[:match.start()] + text[abstract_start + section_match.start():]
                
                # If nothing found, just remove the abstract marker line
                return text[:match.start()] + text[abstract_start:].lstrip()
        
        # No abstract found, return original text
        return text

    @staticmethod
    def remove_in_text_citations(text: str) -> str:
        """
        Remove in-text citations from PDF text.
        
        Handles multiple citation formats:
        - (Author, Year) or (Author et al., Year)
        - [1], [2-5], [1,2,3] (numeric)
        - [Author et al. Year] (bracketed author-year)
        
        Args:
            text: PDF text
            
        Returns:
            Text with citations removed
        """
        # Pattern 1: (Author, Year) or (Author et al., Year)
        # Matches: (Smith, 2023), (Smith et al., 2023), (Smith et al. 2023)
        pattern1 = r'\([A-Z][a-zA-Z\s]+(?:et\s+al\.)?,?\s*\d{4}[a-z]?\)'
        
        # Pattern 2: [1], [2-5], [1,2,3] (numeric citations)
        pattern2 = r'\[\d+(?:[-\s,]\d+)*\]'
        
        # Pattern 3: [Author et al. Year] (bracketed author-year)
        pattern3 = r'\[[A-Z][a-zA-Z\s]+(?:et\s+al\.)?\s+\d{4}\]'
        
        # Remove all patterns
        text = re.sub(pattern1, '', text)
        text = re.sub(pattern2, '', text)
        text = re.sub(pattern3, '', text)
        
        # Clean up extra spaces left behind
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        # Fix spaces before punctuation
        text = re.sub(r'\s+\.', '.', text)
        text = re.sub(r'\s+,', ',', text)
        
        return text.strip()

    @staticmethod
    def parse_pdf_text():
        # https://onlyoneaman.medium.com/i-tested-7-python-pdf-extractors-so-you-dont-have-to-2025-edition-c88013922257
        pass

    @staticmethod
    def clean_pdf_text(text: str) -> str:
        """
        Comprehensive PDF text cleaning.
        
        Removes in order:
        1. References/Bibliography (already exists)
        2. Title
        3. Abstract
        4. In-text citations
        
        Args:
            text: Raw PDF text
            
        Returns:
            Cleaned text ready for extraction
        """
        cleaned = text
        
        # Step 1: Remove references (already exists)
        cleaned = PDFService.remove_references(cleaned)
        
        # Step 2: Remove title
        cleaned = PDFService.remove_title(cleaned)
        
        # Step 3: Remove abstract
        cleaned = PDFService.remove_abstract(cleaned)
        
        # Step 4: Remove in-text citations
        cleaned = PDFService.remove_in_text_citations(cleaned)
        
        return cleaned.strip()

    @staticmethod
    def extract_text(pdf_content: bytes) -> str:
        """
        Extract text from PDF bytes
        
        Args:
            pdf_content: PDF file as bytes
            
        Returns:
            Extracted text
            
        Raises:
            ValueError: If PDF cannot be read
        """
        try:
            import PyPDF2
            
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    text += page.extract_text()
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                    continue
            
            text = PDFService.remove_references(text)
            
            return text
            
        except ImportError:
            raise ImportError(
                "PyPDF2 not installed. "
                "Install with: pip install PyPDF2>=3.0.0"
            )
        except Exception as e:
            raise ValueError(f"Error reading PDF: {str(e)}")
    
    @staticmethod
    def extract_text_by_page(pdf_content: bytes) -> List[Dict[str, str]]:
        """
        Extract text by page from PDF
        
        Args:
            pdf_content: PDF file as bytes
            
        Returns:
            List of dicts with 'page' and 'text' keys
            
        Raises:
            ValueError: If PDF cannot be read
        """
        try:
            import PyPDF2
            
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            pages = []
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    text = page.extract_text()
                    if text.strip():  # Only add non-empty pages
                        pages.append({
                            "page": page_num + 1,
                            "text": text
                        })
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                    continue
            
            return pages
            
        except ImportError:
            raise ImportError(
                "PyPDF2 not installed. "
                "Install with: pip install PyPDF2>=3.0.0"
            )
        except Exception as e:
            raise ValueError(f"Error reading PDF: {str(e)}")
    
    @staticmethod
    def validate_pdf(pdf_content: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate PDF file
        
        Args:
            pdf_content: PDF file as bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            import PyPDF2
            
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            if len(pdf_reader.pages) == 0:
                return False, "PDF file has no pages"
            
            return True, None
            
        except Exception as e:
            return False, f"Invalid PDF file: {str(e)}"
    
    @staticmethod
    def get_pdf_info(pdf_content: bytes) -> Dict[str, any]:
        """
        Get information about PDF
        
        Args:
            pdf_content: PDF file as bytes
            
        Returns:
            Dictionary with page count and metadata
        """
        try:
            import PyPDF2
            
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            return {
                "page_count": len(pdf_reader.pages),
                "metadata": dict(pdf_reader.metadata) if pdf_reader.metadata else {}
            }
            
        except Exception as e:
            logger.error(f"Error getting PDF info: {str(e)}")
            return {"page_count": 0, "metadata": {}}