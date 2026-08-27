"""LLM caching, retries, and cost logging."""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.database_models import LLMCacheEntry, LLMCallLog

logger = logging.getLogger(__name__)

# Rough USD per 1M tokens (input+output blended) for cost estimates
MODEL_COST_PER_1M: Dict[str, float] = {
    "gpt-4o-mini": 0.30,
    "gpt-4o": 5.0,
    "gpt-4.1-mini": 0.40,
    "deepseek-chat": 0.27,
    "gemini-2.0-flash": 0.20,
    "default": 1.0,
}


def content_hash(model: str, prompt_version: str, prompt: str) -> str:
    payload = f"{model}|{prompt_version}|{prompt}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def estimate_cost(model: str, tokens: int) -> float:
    rate = MODEL_COST_PER_1M.get(model, MODEL_COST_PER_1M["default"])
    for key, val in MODEL_COST_PER_1M.items():
        if key in (model or ""):
            rate = val
            break
    return (tokens / 1_000_000.0) * rate


class LLMGateway:
    """Wraps a provider with cache, retries, and cost logging."""

    def __init__(
        self,
        provider,
        db: Optional[Session] = None,
        project_id: Optional[str] = None,
        run_id: Optional[str] = None,
        stage: str = "extract",
        prompt_version: str = "v1",
        use_cache: bool = True,
    ):
        self.provider = provider
        self.db = db
        self.project_id = project_id
        self.run_id = run_id or str(uuid.uuid4())
        self.stage = stage
        self.prompt_version = prompt_version
        self.use_cache = use_cache
        self.total_tokens = 0
        self.total_cost = 0.0
        self.total_calls = 0

    def generate(self, prompt: str) -> Dict[str, Any]:
        model = getattr(self.provider, "model_name", "unknown")
        cache_key = content_hash(model, self.prompt_version, prompt)

        if self.use_cache and self.db is not None:
            cached = (
                self.db.query(LLMCacheEntry)
                .filter(LLMCacheEntry.cache_key == cache_key)
                .first()
            )
            if cached:
                self._log(model, cache_key, cached.tokens_used, True, True)
                return {
                    "response": cached.response,
                    "time_taken": 0.0,
                    "success": True,
                    "tokens_used": cached.tokens_used,
                    "error": None,
                    "cached": True,
                }

        last_error = None
        for attempt in range(1, settings.MAX_RETRIES + 1):
            try:
                result = self.provider.generate_response(prompt)
                if result.get("success"):
                    tokens = int(result.get("tokens_used") or 0)
                    self._persist_cache(cache_key, model, result.get("response", ""), tokens)
                    self._log(model, cache_key, tokens, True, False)
                    result["cached"] = False
                    return result
                last_error = result.get("error") or "unknown provider error"
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)
                logger.warning("LLM attempt %s failed: %s", attempt, last_error)
            time.sleep(min(2 ** attempt * 0.25, 5))

        self._log(model, cache_key, 0, False, False)
        return {
            "response": "",
            "time_taken": 0.0,
            "success": False,
            "tokens_used": 0,
            "error": last_error,
            "cached": False,
        }

    def _persist_cache(self, cache_key: str, model: str, response: str, tokens: int) -> None:
        if not self.db or not self.use_cache:
            return
        existing = (
            self.db.query(LLMCacheEntry)
            .filter(LLMCacheEntry.cache_key == cache_key)
            .first()
        )
        if existing:
            return
        entry = LLMCacheEntry(
            id=str(uuid.uuid4()),
            cache_key=cache_key,
            model=model,
            prompt_version=self.prompt_version,
            response=response,
            tokens_used=tokens,
        )
        self.db.add(entry)
        try:
            self.db.commit()
        except Exception:  # noqa: BLE001
            self.db.rollback()

    def _log(
        self,
        model: str,
        prompt_hash: str,
        tokens: int,
        success: bool,
        cached: bool,
    ) -> None:
        cost = estimate_cost(model, tokens)
        self.total_tokens += tokens
        self.total_cost += cost
        self.total_calls += 1
        if not self.db:
            return
        log = LLMCallLog(
            id=str(uuid.uuid4()),
            project_id=self.project_id,
            run_id=self.run_id,
            stage=self.stage,
            model=model,
            prompt_hash=prompt_hash,
            tokens_used=tokens,
            estimated_cost_usd=cost,
            success=success,
            cached=cached,
        )
        self.db.add(log)
        try:
            self.db.commit()
        except Exception:  # noqa: BLE001
            self.db.rollback()
