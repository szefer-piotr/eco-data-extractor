"""Evidence synthesis package."""

from app.services.synthesis.service import SynthesisService
from app.services.synthesis.templates import get_template, list_templates

__all__ = ["SynthesisService", "get_template", "list_templates"]
