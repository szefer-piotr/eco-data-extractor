"""Simple synthesis pipeline runner (Prefect/Dagster-compatible asset steps).

Usage:
  python -m pipelines.synthesis_runner --project-id <uuid> --provider openai --model gpt-4o-mini
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Allow importing backend app
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal, init_db  # noqa: E402
from app.services.synthesis.service import SynthesisService  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("synthesis_runner")


def run_pipeline(
    project_id: str,
    provider: str,
    model: str,
    temperature: float = 0.0,
    api_key: str | None = None,
) -> dict:
    init_db()
    db = SessionLocal()
    try:
        logger.info("Step 1/4 extract assertions")
        extract = SynthesisService.run_assertion_extraction(
            db,
            project_id,
            provider=provider,
            model=model,
            temperature=temperature,
            api_key=api_key,
        )
        logger.info("Step 2/4 canonicalize")
        canon = SynthesisService.canonicalize_project(db, project_id)
        logger.info("Step 3/4 clusters + gaps")
        synth = SynthesisService.rebuild_clusters_and_gaps(db, project_id)
        logger.info("Step 4/4 cost summary")
        cost = SynthesisService.cost_summary(db, project_id)
        return {
            "extract": extract,
            "canonicalize": canon,
            "synthesis": synth,
            "cost": cost.model_dump(),
        }
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Run evidence synthesis pipeline")
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--provider", default="openai")
    parser.add_argument("--model", default="gpt-4o-mini")
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--api-key", default=None)
    args = parser.parse_args()
    result = run_pipeline(
        args.project_id,
        args.provider,
        args.model,
        temperature=args.temperature,
        api_key=args.api_key,
    )
    logger.info("Done: %s", result)


if __name__ == "__main__":
    main()
