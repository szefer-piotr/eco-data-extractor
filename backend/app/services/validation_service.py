"""Service for managing validation feedback and persistence"""

import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

class ValidationService:
    """Service for managing user validation feedback"""

    FEEDBACK_DIR = Path("./storage/validation_feedback")

    def __init__(self):
        """Initialize validation service"""
        self.FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)

    def save_user_feedback(
        self,
        job_id: str,
        row_id: str,
        feedback: List[Dict[str, Any]]
    ) -> bool:
        """
        Save user validation feedback for a row.

        Args:
            job_id: ID of extraction job
            row_id: ID of the row/item
            feedback: List of validation feedback dicts

        Returns:
            True if saved successfully
        """
        try:
            job_feedback_dir = self.FEEDBACK_DIR / job_id
            job_feedback_dir.mkdir(parents=True, exist_ok=True)

            feedback_file = job_feedback_dir / f"{row_id}_feedback.json"

            feedback_data = {
                "job_id": job_id,
                "row_id": row_id,
                "timestamp": datetime.now().isoformat(),
                "validations": feedback
            }

            with open(feedback_file, "w") as f:
                json.dump(feedback_data, f, indent=2)

            logger.info(f"Saved validation feedback for job {job_id}, row {row_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save validation feedback: {e}")
            return False

    def get_feedback_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        """Get all feedback for a job"""
        try:
            job_feedback_dir = self.FEEDBACK_DIR / job_id
            if not job_feedback_dir.exists():
                return []

            all_feedback = []
            for feedback_file in job_feedback_dir.glob("*_feedback.json"):
                with open(feedback_file, "r") as f:
                    data = json.load(f)
                    all_feedback.extend(data.get("validations", []))

            return all_feedback

        except Exception as e:
            logger.error(f"Failed to retrieve feedback for job {job_id}: {e}")
            return []

    def build_refinement_context(
        self,
        category: str,
        max_feedback: int = 5
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Build learning context for a category from all past feedback.
        
        Args:
            category: Category to get feedback for
            max_feedback: Maximum number of feedback items to return
        
        Returns:
            List of relevant feedback items
        """
        # This would typically query a database
        # For now, returning structure
        return []