from operator import truediv
import os
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

class PydanticEncoder(json.JSONEncoder):
    """Custom JSON encoder for Pydantic models"""
    def default(self, obj):
        if isinstance(obj, BaseModel):
            return obj.model_dump()
        return super().default(obj)

class DataStorageService:
    
    STORAGE_DIR = Path("./temp/uploads")
    _uploaded_files: Dict[str, Dict] = {}

    @staticmethod
    def store_job_rows(job_id: str, rows: List[Dict[str, str]]) -> bool:
        job_dir = DataStorageService.STORAGE_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        rows_file = job_dir / "rows.json"
        with open(rows_file, "w") as f:
            json.dump(rows, f)
        return True
    
    @staticmethod
    def get_job_rows(job_id: str) -> List[Dict[str, str]]:
        rows_file = DataStorageService.STORAGE_DIR / job_id / "rows.json"
        if not rows_file.exists():
            return []

        with open(rows_file, "r") as f:
            return json.load(f)

    @staticmethod
    def store_job_results(job_id: str, results: List[Dict]) -> bool:
        job_dir = DataStorageService.STORAGE_DIR / job_id
        results_file = job_dir / "results.json"

        with open(results_file, "w") as f:
            json.dump(results, f, indent=2, cls=PydanticEncoder)
        return True

    @staticmethod
    def get_job_results(job_id: str) -> List[Dict]:
        results_file = DataStorageService.STORAGE_DIR / job_id / "results.json"
        if not results_file.exists():
            return []
        try:
            with open(results_file, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []

    @staticmethod
    def cleanup_job(job_id: str) -> bool:
        """Delete all data for a completed job"""
        import shutil
        job_dir = DataStorageService.STORAGE_DIR / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
        return True
    
    @staticmethod
    def store_file_metadata(
        file_id: str, 
        file_type: str, 
        filename: str,
        columns: List[str]
    ) -> bool:
        """
        Store metadata about an uploaded file

        Args:
            file_id: Unique file identifier (job_id)
            file_type: Type of file ("csv", "pdf")
            filename: Original filename(s)
            columns: Column names from the file

        Returns:
            True if successful
        """
        DataStorageService._uploaded_files[file_id] = {
            "type": file_type,
            "filename": filename,
            "columns": columns,
            "uploaded_at": datetime.now(timezone.utc)
        }
        return True
    
    @staticmethod
    def get_file_metadata(file_id: str) -> Optional[Dict]:
        """Retrieve file metadata"""
        return DataStorageService._uploaded_files.get(file_id)
    
    @staticmethod
    def file_exists(file_id: str) -> bool:
        """Check if file metadata exists"""
        return file_id in DataStorageService._uploaded_files

    @staticmethod
    def cleanup_job(job_id: str) -> bool:
        """Delete all data for a completed job"""
        import shutil
        job_dir = DataStorageService.STORAGE_DIR / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)

        if job_id in DataStorageService._uploaded_files:
            del DataStorageService._uploaded_files[job_id]

        return True