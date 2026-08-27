"""Document ingest: Docling with PyPDF2 fallback, metadata enrichment, span build."""

from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx

from pathlib import Path

from app.services.pdf_service import PDFService
from app.services.synthesis.windowing import build_spans_for_text

logger = logging.getLogger(__name__)


class DocumentIngestService:
    """Parse PDFs/abstracts into work records + spans."""

    @staticmethod
    def extract_pdf_text(file_path: str) -> Tuple[str, Dict[str, Any]]:
        """Prefer Docling; fall back to PyPDF2 pipeline."""
        meta: Dict[str, Any] = {"parser": "pypdf2"}
        try:
            from docling.document_converter import DocumentConverter  # type: ignore

            converter = DocumentConverter()
            result = converter.convert(file_path)
            text = result.document.export_to_markdown()
            meta["parser"] = "docling"
            return text, meta
        except Exception as exc:  # noqa: BLE001
            logger.info("Docling unavailable (%s); using PyPDF2", exc)
            raw_bytes = Path(file_path).read_bytes()
            raw = PDFService.extract_text(raw_bytes)
            text = PDFService.clean_pdf_text(raw)
            return text, meta

    @staticmethod
    def enrich_metadata(title: Optional[str] = None, doi: Optional[str] = None) -> Dict[str, Any]:
        """Best-effort Crossref enrichment."""
        meta: Dict[str, Any] = {}
        query = doi or title
        if not query:
            return meta
        try:
            if doi:
                url = f"https://api.crossref.org/works/{doi}"
            else:
                url = "https://api.crossref.org/works"
                params = {"query.title": title, "rows": 1}
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(url, params=params)
                    resp.raise_for_status()
                    items = resp.json().get("message", {}).get("items", [])
                    if not items:
                        return meta
                    msg = items[0]
                    return DocumentIngestService._map_crossref(msg)

            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    msg = resp.json().get("message", {})
                    return DocumentIngestService._map_crossref(msg)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Metadata enrichment failed: %s", exc)
        return meta

    @staticmethod
    def _map_crossref(msg: Dict[str, Any]) -> Dict[str, Any]:
        authors = msg.get("author") or []
        author_str = ", ".join(
            f"{a.get('family', '')} {a.get('given', '')}".strip() for a in authors[:8]
        )
        year = None
        issued = (msg.get("issued") or {}).get("date-parts") or [[]]
        if issued and issued[0]:
            year = issued[0][0]
        return {
            "doi": msg.get("DOI"),
            "title": " ".join(msg.get("title") or []),
            "year": year,
            "authors": author_str,
            "venue": " ".join(msg.get("container-title") or []),
            "source": "crossref",
        }

    @staticmethod
    def prepare_work_from_text(
        project_id: str,
        text: str,
        *,
        title: Optional[str] = None,
        doi: Optional[str] = None,
        year: Optional[int] = None,
        authors: Optional[str] = None,
        source_type: str = "abstract",
        external_id: Optional[str] = None,
        file_path: Optional[str] = None,
        default_section: str = "abstract",
        enrich: bool = False,
    ) -> Dict[str, Any]:
        work_id = str(uuid.uuid4())
        meta: Dict[str, Any] = {}
        if enrich:
            meta = DocumentIngestService.enrich_metadata(title=title, doi=doi)
            title = title or meta.get("title")
            doi = doi or meta.get("doi")
            year = year or meta.get("year")
            authors = authors or meta.get("authors")

        spans = build_spans_for_text(work_id, text, default_section=default_section)
        return {
            "id": work_id,
            "project_id": project_id,
            "title": title,
            "abstract": text if source_type == "abstract" else None,
            "full_text": text if source_type == "pdf" else text,
            "doi": doi,
            "year": year,
            "authors": authors,
            "source_type": source_type,
            "external_id": external_id,
            "file_path": file_path,
            "metadata_json": meta,
            "spans": spans,
        }

    @staticmethod
    def dedupe_key(doi: Optional[str], title: Optional[str], authors: Optional[str]) -> str:
        if doi:
            return f"doi:{doi.strip().lower()}"
        norm_title = re.sub(r"\W+", " ", (title or "").lower()).strip()
        norm_authors = re.sub(r"\W+", " ", (authors or "").lower()).strip()[:80]
        return f"ta:{norm_title}|{norm_authors}"
