"""CSV file processing service"""

import pandas as pd
import logging
import io
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class CSVService:
    """Service for processing CSV files"""
    
    # Supported encodings to try
    ENCODINGS = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
    
    @staticmethod
    def load_csv(file_content: str, encoding: Optional[str] = None) -> pd.DataFrame:
        """
        Load CSV content and detect encoding
        
        Args:
            file_content: Raw file content as string
            encoding: Optional encoding to use
            
        Returns:
            Pandas DataFrame
            
        Raises:
            ValueError: If file cannot be loaded
        """
        if encoding:
            encodings = [encoding] + CSVService.ENCODINGS
        else:
            encodings = CSVService.ENCODINGS
        
        for enc in encodings:
            try:
                df = pd.read_csv(io.StringIO(file_content), encoding=enc)
                logger.info(f"Successfully loaded CSV with encoding: {enc}")
                return df
            except (UnicodeDecodeError, UnicodeError):
                continue
            except Exception as e:
                logger.error(f"Error loading CSV with encoding {enc}: {str(e)}")
                continue
        
        raise ValueError(
            "Unable to load CSV file. "
            f"Tried encodings: {', '.join(encodings)}"
        )
    
    @staticmethod
    def get_columns(df: pd.DataFrame) -> List[str]:
        """Get column names from DataFrame"""
        return df.columns.tolist()
    
    @staticmethod
    def validate_columns(
        df: pd.DataFrame,
        id_column: str,
        text_column: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that required columns exist
        
        Args:
            df: DataFrame to validate
            id_column: Name of ID column
            text_column: Name of text column
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        columns = df.columns.tolist()
        
        if id_column not in columns:
            return False, f"ID column '{id_column}' not found in CSV"
        
        if text_column not in columns:
            return False, f"Text column '{text_column}' not found in CSV"
        
        return True, None
    
    @staticmethod
    def get_sample_data(
        df: pd.DataFrame,
        id_column: str,
        text_column: str,
        num_rows: int = 3
    ) -> Dict[str, List[str]]:
        """
        Get sample data from DataFrame
        
        Args:
            df: DataFrame
            id_column: ID column name
            text_column: Text column name
            num_rows: Number of sample rows
            
        Returns:
            Dictionary with sample data
        """
        sample_df = df[[id_column, text_column]].head(num_rows)
        return {
            "ids": sample_df[id_column].astype(str).tolist(),
            "texts": sample_df[text_column].astype(str).tolist()
        }
    
    @staticmethod
    def extract_rows(
        df: pd.DataFrame,
        id_column: str,
        text_column: str
    ) -> List[Dict[str, str]]:
        """
        Extract rows for processing
        
        Args:
            df: DataFrame
            id_column: ID column name
            text_column: Text column name
            
        Returns:
            List of dicts with 'id' and 'text' keys
        """
        rows = []
        for _, row in df.iterrows():
            rows.append({
                "id": str(row[id_column]),
                "text": str(row[text_column])
            })
        return rows