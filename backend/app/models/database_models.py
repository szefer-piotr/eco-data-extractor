"""SQLAlchemy database models for extraction + evidence synthesis."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


class ExtractionJob(Base):
    """Tracks extraction processing jobs"""

    __tablename__ = "extraction_jobs"

    id = Column(String(36), primary_key=True)
    file_name = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)

    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)

    categories = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=_utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    error_message = Column(Text, nullable=True)
    project_id = Column(String(36), nullable=True, index=True)
    tokens_used = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)

    def __repr__(self):
        return f"<ExtractionJob(id={self.id}, status={self.status})>"


class ExtractionResult(Base):
    """Stores individual extraction results"""

    __tablename__ = "extraction_results"

    id = Column(String(36), primary_key=True)
    job_id = Column(String(36), nullable=False, index=True)

    row_id = Column(String(255), nullable=False)
    original_text = Column(Text, nullable=False)
    extracted_data = Column(JSON, nullable=False)

    confidence = Column(Float, default=1.0)
    processing_time = Column(Float, nullable=True)

    created_at = Column(DateTime, default=_utcnow)

    def __repr__(self):
        return f"<ExtractionResult(job_id={self.job_id}, row_id={self.row_id})>"


class APIKeyStorage(Base):
    """Securely stores API keys"""

    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True)
    provider = Column(String(50), unique=True, nullable=False)
    encrypted_key = Column(Text, nullable=False)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class SavedConfiguration(Base):
    """User preferences and configurations"""

    __tablename__ = "saved_configurations"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)
    categories = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ---------------------------------------------------------------------------
# Evidence synthesis tables
# ---------------------------------------------------------------------------


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    question = Column(Text, nullable=False)
    peco = Column(JSON, nullable=False)
    inclusion_criteria = Column(JSON, default=list)
    exclusion_criteria = Column(JSON, default=list)
    review_type = Column(String(50), default="mapping")
    template_id = Column(String(100), default="uas_biodiversity_v1")
    status = Column(String(50), default="scoping")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    works = relationship("Work", back_populates="project", cascade="all, delete-orphan")
    assertions = relationship(
        "Assertion", back_populates="project", cascade="all, delete-orphan"
    )


class Work(Base):
    __tablename__ = "works"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(Text, nullable=True)
    abstract = Column(Text, nullable=True)
    full_text = Column(Text, nullable=True)
    doi = Column(String(255), nullable=True, index=True)
    year = Column(Integer, nullable=True)
    authors = Column(Text, nullable=True)
    venue = Column(String(255), nullable=True)
    source_type = Column(String(50), default="abstract")
    external_id = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=True)
    screening_status = Column(String(50), default="pending")
    screening_rationale = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_utcnow)

    project = relationship("Project", back_populates="works")
    spans = relationship("Span", back_populates="work", cascade="all, delete-orphan")
    assertions = relationship("Assertion", back_populates="work", cascade="all, delete-orphan")


class Span(Base):
    __tablename__ = "spans"

    id = Column(String(36), primary_key=True)
    work_id = Column(String(36), ForeignKey("works.id"), nullable=False, index=True)
    section = Column(String(50), default="other")
    para_idx = Column(Integer, default=0)
    sent_idx = Column(Integer, default=0)
    char_start = Column(Integer, default=0)
    char_end = Column(Integer, default=0)
    quote = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)

    work = relationship("Work", back_populates="spans")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    entity_type = Column(String(50), nullable=False)
    label = Column(String(255), nullable=False)
    canonical_id = Column(String(255), nullable=True, index=True)
    aliases = Column(JSON, default=list)
    authority = Column(String(50), nullable=True)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Assertion(Base):
    __tablename__ = "assertions"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    work_id = Column(String(36), ForeignKey("works.id"), nullable=False, index=True)

    subject = Column(JSON, nullable=False)
    predicate = Column(String(100), nullable=False, index=True)
    object = Column(JSON, nullable=False)
    qualifiers = Column(JSON, default=dict)
    direction = Column(String(50), default="not_applicable")
    effect = Column(JSON, nullable=True)
    epistemic_status = Column(String(50), default="measured_result")
    polarity = Column(String(20), default="neutral")
    evidence = Column(JSON, default=list)
    rationale = Column(Text, default="")
    is_inferred = Column(Boolean, default=False)
    confidence = Column(Float, default=1.0)

    template_id = Column(String(100), nullable=True)
    extractor_model = Column(String(100), nullable=True)
    prompt_version = Column(String(50), nullable=True)
    run_id = Column(String(36), nullable=True)

    review_status = Column(String(50), default="pending")
    guard_failures = Column(JSON, default=list)
    verbalized = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=_utcnow)

    project = relationship("Project", back_populates="assertions")
    work = relationship("Work", back_populates="assertions")


class EvidenceClusterRecord(Base):
    __tablename__ = "evidence_clusters"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    subject_label = Column(String(255), nullable=False)
    predicate = Column(String(100), nullable=False)
    object_label = Column(String(255), nullable=False)
    n_studies = Column(Integer, default=0)
    n_assertions = Column(Integer, default=0)
    direction_histogram = Column(JSON, default=dict)
    synthesis = Column(Text, nullable=True)
    assertion_ids = Column(JSON, default=list)
    contested = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class GapRecordDB(Base):
    __tablename__ = "gaps"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    gap_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Float, default=0.5)
    axes = Column(JSON, default=dict)
    suggested_research_angle = Column(Text, nullable=True)
    supporting_stats = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_utcnow)


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    statement = Column(Text, nullable=False)
    structured = Column(JSON, nullable=True)
    source = Column(String(50), default="user")
    novelty = Column(Float, default=0.0)
    plausibility = Column(Float, default=0.0)
    testability = Column(Float, default=0.0)
    feasibility = Column(Float, default=0.0)
    status = Column(String(50), default="proposed")
    evidence_for = Column(JSON, default=list)
    evidence_against = Column(JSON, default=list)
    verdict = Column(String(50), nullable=True)
    narrowed_statement = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class LLMCallLog(Base):
    __tablename__ = "llm_call_logs"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=True, index=True)
    run_id = Column(String(36), nullable=True, index=True)
    stage = Column(String(50), nullable=False)
    model = Column(String(100), nullable=True)
    prompt_hash = Column(String(64), nullable=True, index=True)
    tokens_used = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)
    success = Column(Boolean, default=True)
    cached = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class LLMCacheEntry(Base):
    __tablename__ = "llm_cache"

    id = Column(String(36), primary_key=True)
    cache_key = Column(String(64), unique=True, nullable=False, index=True)
    model = Column(String(100), nullable=False)
    prompt_version = Column(String(50), nullable=False)
    response = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)
