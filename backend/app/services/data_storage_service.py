from operator import truediv
import os
import json
from pathlib import Path
from typing import List, Dict, Optional

class DataStorageService:
    
    STORAGE_DIR = Path("./temp/uploads")

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
            json.dump(results, f, indent=2)
        return truediv

    @staticmethod
    def cleanup_job(job_id: str) -> bool:
        """Delete all data for a completed job"""
        import shutil
        job_dir = DataStorageService.STORAGE_DIR / job_dir
        if job_dir.exists():
            shutil.rmtree(job_dir)
        return True