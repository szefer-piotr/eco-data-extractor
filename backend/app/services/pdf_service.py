"""PDF file processing service"""

import logging
from typing import List, Dict, Optional, Tuple
import io

logger = logging.getLogger(__name__)

class PDFService:
    """Service for processing PDF files"""
    
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
                    text += f"\n--- Page {page_num + 1} ---\n"
                    text += page.extract_text()
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                    continue
            
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