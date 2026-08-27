"""Section-aware text windowing and span construction."""

from __future__ import annotations

import re
import uuid
from typing import Dict, List, Optional, Tuple

from app.utils.text import TextProcessor

SECTION_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("abstract", re.compile(r"^\s*(abstract)\s*$", re.I | re.M)),
    ("intro", re.compile(r"^\s*(1\.?\s*)?(introduction|background)\s*$", re.I | re.M)),
    ("methods", re.compile(r"^\s*(\d+\.?\s*)?(materials?\s+and\s+methods|methods|methodology)\s*$", re.I | re.M)),
    ("results", re.compile(r"^\s*(\d+\.?\s*)?(results)\s*$", re.I | re.M)),
    ("discussion", re.compile(r"^\s*(\d+\.?\s*)?(discussion)\s*$", re.I | re.M)),
    ("conclusion", re.compile(r"^\s*(\d+\.?\s*)?(conclusion|conclusions|summary)\s*$", re.I | re.M)),
]


def classify_section_header(line: str) -> Optional[str]:
    stripped = line.strip()
    for name, pattern in SECTION_PATTERNS:
        if pattern.match(stripped):
            return name
    return None


def split_into_sections(text: str) -> List[Dict[str, str]]:
    """Split document text into labeled sections."""
    if not text or not text.strip():
        return [{"section": "other", "text": ""}]

    lines = text.splitlines()
    sections: List[Dict[str, str]] = []
    current_section = "other"
    buf: List[str] = []

    for line in lines:
        header = classify_section_header(line)
        if header:
            if buf:
                sections.append({"section": current_section, "text": "\n".join(buf).strip()})
                buf = []
            current_section = header
        else:
            buf.append(line)

    if buf:
        sections.append({"section": current_section, "text": "\n".join(buf).strip()})

    sections = [s for s in sections if s["text"]]
    return sections or [{"section": "other", "text": text.strip()}]


def build_spans_for_text(
    work_id: str,
    text: str,
    default_section: str = "abstract",
) -> List[Dict]:
    """Create addressable sentence spans from text, preserving section roles when possible."""
    sections = split_into_sections(text)
    # If no headers found, treat whole text as default_section
    if len(sections) == 1 and sections[0]["section"] == "other":
        sections = [{"section": default_section, "text": text}]

    spans: List[Dict] = []
    global_offset = 0
    # Rebuild with approximate offsets against original text
    for para_idx, section in enumerate(sections):
        section_text = section["text"]
        sentences = TextProcessor.split_sentences(section_text)
        search_from = 0
        for sent_idx, sentence in enumerate(sentences):
            local_start = section_text.find(sentence, search_from)
            if local_start < 0:
                local_start = search_from
            local_end = local_start + len(sentence)
            search_from = local_end
            # Approximate absolute offsets
            abs_start = text.find(sentence, global_offset)
            if abs_start < 0:
                abs_start = global_offset
            abs_end = abs_start + len(sentence)
            global_offset = abs_end
            spans.append(
                {
                    "id": str(uuid.uuid4()),
                    "work_id": work_id,
                    "section": section["section"],
                    "para_idx": para_idx,
                    "sent_idx": sent_idx,
                    "char_start": abs_start,
                    "char_end": abs_end,
                    "quote": sentence,
                }
            )
    return spans


def window_spans(
    spans: List[Dict],
    max_words: int = 500,
    overlap_sentences: int = 2,
) -> List[Dict]:
    """Group consecutive spans into ~max_words overlapping windows within a section."""
    if not spans:
        return []

    by_section: Dict[str, List[Dict]] = {}
    for span in spans:
        by_section.setdefault(span["section"], []).append(span)

    windows: List[Dict] = []
    for section, section_spans in by_section.items():
        i = 0
        while i < len(section_spans):
            words = 0
            chunk: List[Dict] = []
            j = i
            while j < len(section_spans) and words < max_words:
                chunk.append(section_spans[j])
                words += len(section_spans[j]["quote"].split())
                j += 1
            windows.append(
                {
                    "window_id": str(uuid.uuid4()),
                    "section": section,
                    "spans": chunk,
                    "text": " ".join(s["quote"] for s in chunk),
                    "start_sent": chunk[0]["sent_idx"] if chunk else 0,
                    "end_sent": chunk[-1]["sent_idx"] if chunk else 0,
                }
            )
            if j >= len(section_spans):
                break
            i = max(i + 1, j - overlap_sentences)
    return windows


def screener_heuristic(text: str) -> bool:
    """Cheap non-LLM screener: does the window look like it contains findings?"""
    if not text or len(text.split()) < 20:
        return False
    cues = [
        r"\bresult",
        r"\bfind",
        r"\bsignificant",
        r"\bincrease",
        r"\bdecrease",
        r"\beffect",
        r"\bshow(?:ed|s)?\b",
        r"\bobserv",
        r"\bdetect",
        r"\bp\s*[<≈=]",
        r"\bCI\b",
        r"\bn\s*=",
        r"\bcompared",
    ]
    return any(re.search(c, text, re.I) for c in cues)
