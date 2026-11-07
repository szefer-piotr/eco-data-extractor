"""Pydantic models for Evidence Synthesis feature."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# PECO / Project
# ---------------------------------------------------------------------------

class PECODefinition(BaseModel):
    population: str = Field(..., description="Who/what is studied")
    exposure: str = Field(..., description="Stressor or condition")
    comparator: Optional[str] = Field(default=None, description="Baseline/control; optional for PO studies")
    outcome: str = Field(..., description="Measured response")


class Criterion(BaseModel):
    description: str
    rule: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    question: str
    peco: PECODefinition
    inclusion_criteria: List[Criterion] = Field(default_factory=list)
    exclusion_criteria: List[Criterion] = Field(default_factory=list)
    review_type: Literal["mapping", "narrative", "meta_analysis_candidate"] = "mapping"
    template_id: str = "uas_biodiversity_v1"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    question: Optional[str] = None
    peco: Optional[PECODefinition] = None
    inclusion_criteria: Optional[List[Criterion]] = None
    exclusion_criteria: Optional[List[Criterion]] = None
    status: Optional[str] = None
    template_id: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    question: str
    peco: PECODefinition
    inclusion_criteria: List[Criterion] = Field(default_factory=list)
    exclusion_criteria: List[Criterion] = Field(default_factory=list)
    review_type: str
    template_id: str
    status: str
    work_count: int = 0
    assertion_count: int = 0
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Spans / Works
# ---------------------------------------------------------------------------

class SpanRef(BaseModel):
    span_id: str
    section: str
    para_idx: int = 0
    sent_idx: int = 0
    char_start: int = 0
    char_end: int = 0
    quote: str


class WorkCreate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    authors: Optional[str] = None
    venue: Optional[str] = None
    source_type: Literal["abstract", "pdf", "csv_row"] = "abstract"
    external_id: Optional[str] = None


class WorkResponse(BaseModel):
    id: str
    project_id: str
    title: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None
    authors: Optional[str] = None
    venue: Optional[str] = None
    source_type: str
    screening_status: str
    screening_rationale: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Assertions
# ---------------------------------------------------------------------------

class MentionRef(BaseModel):
    surface: str
    entity_type: Optional[str] = None
    canonical_id: Optional[str] = None
    canonical_label: Optional[str] = None


class Qualifiers(BaseModel):
    taxon: List[MentionRef] = Field(default_factory=list)
    environment: List[MentionRef] = Field(default_factory=list)
    location: Optional[MentionRef] = None
    time_window: Optional[str] = None
    method: List[MentionRef] = Field(default_factory=list)
    study_design: Optional[
        Literal[
            "experimental",
            "BACI",
            "observational",
            "modelling",
            "review",
            "meta-analysis",
        ]
    ] = None
    sample_size: Optional[str] = None
    spatial_scale: Optional[str] = None
    platform: Optional[str] = None
    sensor: Optional[str] = None
    response_variable: Optional[str] = None


class EffectEstimate(BaseModel):
    metric: Literal[
        "hedges_g",
        "log_response_ratio",
        "cohens_d",
        "odds_ratio",
        "pearson_r",
        "raw_mean_diff",
        "percent_change",
        "other",
    ] = "other"
    value: Optional[float] = None
    ci_low: Optional[float] = None
    ci_high: Optional[float] = None
    p_value: Optional[float] = None
    units: Optional[str] = None
    verbatim: Optional[str] = None


class AssertionCreate(BaseModel):
    work_id: str
    subject: MentionRef
    predicate: str
    object: MentionRef
    qualifiers: Qualifiers = Field(default_factory=Qualifiers)
    direction: Literal["increase", "decrease", "no_effect", "mixed", "not_applicable"] = "not_applicable"
    effect: Optional[EffectEstimate] = None
    epistemic_status: Literal[
        "measured_result",
        "author_inference",
        "cited_from_other_work",
        "hypothesis",
        "limitation",
        "background_assumption",
    ] = "measured_result"
    polarity: Literal["supports", "refutes", "neutral"] = "neutral"
    evidence: List[SpanRef] = Field(default_factory=list)
    rationale: str = ""
    is_inferred: bool = False
    confidence: float = Field(default=1.0, ge=0, le=1)
    template_id: str = "uas_biodiversity_v1"


class AssertionResponse(AssertionCreate):
    id: str
    project_id: str
    review_status: str = "pending"
    guard_failures: List[str] = Field(default_factory=list)
    extractor_model: Optional[str] = None
    prompt_version: Optional[str] = None
    run_id: Optional[str] = None
    created_at: datetime


class AssertionReviewUpdate(BaseModel):
    review_status: Literal["accepted", "rejected", "edited"]
    edits: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

class TemplateField(BaseModel):
    name: str
    description: str
    required: bool = False
    allowed_values: Optional[List[str]] = None
    prompt_hint: Optional[str] = None


class ExtractionTemplate(BaseModel):
    id: str
    name: str
    version: str
    description: str
    predicates: List[str]
    fields: List[TemplateField]
    peco_slots: List[str] = Field(default_factory=lambda: ["population", "exposure", "outcome"])


# ---------------------------------------------------------------------------
# Comparison / Gaps / Clusters
# ---------------------------------------------------------------------------

class ComparisonRow(BaseModel):
    work_id: str
    title: Optional[str] = None
    year: Optional[int] = None
    cells: Dict[str, Any] = Field(default_factory=dict)
    assertion_ids: List[str] = Field(default_factory=list)


class ComparisonTableResponse(BaseModel):
    project_id: str
    columns: List[str]
    rows: List[ComparisonRow]
    completeness: Dict[str, float] = Field(default_factory=dict)


class GapType(str, Enum):
    coverage = "coverage"
    quality = "quality"
    temporal = "temporal"
    contradiction = "contradiction"


class GapRecord(BaseModel):
    id: str
    project_id: str
    gap_type: GapType
    description: str
    severity: float = Field(ge=0, le=1)
    axes: Dict[str, Any] = Field(default_factory=dict)
    suggested_research_angle: Optional[str] = None
    supporting_stats: Dict[str, Any] = Field(default_factory=dict)


class EvidenceCluster(BaseModel):
    id: str
    project_id: str
    subject_label: str
    predicate: str
    object_label: str
    n_studies: int
    n_assertions: int
    direction_histogram: Dict[str, int]
    synthesis: Optional[str] = None
    assertion_ids: List[str] = Field(default_factory=list)
    contested: bool = False


class ContradictionReport(BaseModel):
    cluster_id: str
    supporting: List[str]
    opposing: List[str]
    possible_moderators: List[str] = Field(default_factory=list)
    summary: str


# ---------------------------------------------------------------------------
# Q&A / Review / Hypotheses
# ---------------------------------------------------------------------------

class QARequest(BaseModel):
    query: str
    mode: Literal["lookup", "aggregate", "verify", "synthesize", "review_section"] = "synthesize"
    token_budget: int = 4000


class QACitation(BaseModel):
    assertion_id: Optional[str] = None
    work_id: Optional[str] = None
    quote: Optional[str] = None


class QAResponse(BaseModel):
    answer: str
    mode: str
    citations: List[QACitation] = Field(default_factory=list)
    confidence: float = 0.0
    limitations: Optional[str] = None
    assembly_trace: Dict[str, Any] = Field(default_factory=dict)
    flagged_claims: List[str] = Field(default_factory=list)


class ReviewDraftRequest(BaseModel):
    sections: List[str] = Field(
        default_factory=lambda: [
            "introduction",
            "methods",
            "results",
            "gaps",
            "conclusion",
        ]
    )


class ReviewSection(BaseModel):
    name: str
    content: str
    citations: List[QACitation] = Field(default_factory=list)
    evidence_appendix: List[Dict[str, Any]] = Field(default_factory=list)


class ReviewDraftResponse(BaseModel):
    project_id: str
    sections: List[ReviewSection]
    bibliography: List[Dict[str, Any]] = Field(default_factory=list)


class HypothesisCreate(BaseModel):
    statement: str
    structured: Optional[Dict[str, Any]] = None
    source: Literal["gap", "analogy", "contradiction", "abc", "user"] = "user"


class HypothesisResponse(BaseModel):
    id: str
    project_id: str
    statement: str
    structured: Optional[Dict[str, Any]] = None
    source: str
    novelty: float = 0.0
    plausibility: float = 0.0
    testability: float = 0.0
    feasibility: float = 0.0
    status: str = "proposed"
    evidence_for: List[str] = Field(default_factory=list)
    evidence_against: List[str] = Field(default_factory=list)
    verdict: Optional[str] = None
    narrowed_statement: Optional[str] = None


class HypothesisCheckRequest(BaseModel):
    statement: str


class RunExtractionRequest(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.0
    api_key: Optional[str] = None
    work_ids: Optional[List[str]] = None


class CostSummary(BaseModel):
    project_id: str
    total_tokens: int = 0
    total_calls: int = 0
    estimated_cost_usd: float = 0.0
    by_stage: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class PdfUploadError(BaseModel):
    filename: str
    detail: str


class BatchPdfUploadResponse(BaseModel):
    works: List[WorkResponse] = Field(default_factory=list)
    errors: List[PdfUploadError] = Field(default_factory=list)
    uploaded: int = 0
    failed: int = 0
