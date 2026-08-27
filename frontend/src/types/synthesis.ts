/** Types for Evidence Synthesis feature */

export interface PECO {
  population: string;
  exposure: string;
  comparator?: string | null;
  outcome: string;
}

export interface Criterion {
  description: string;
  rule?: string;
}

export interface ProjectCreate {
  name: string;
  question: string;
  peco: PECO;
  inclusion_criteria?: Criterion[];
  exclusion_criteria?: Criterion[];
  review_type?: 'mapping' | 'narrative' | 'meta_analysis_candidate';
  template_id?: string;
}

export interface Project {
  id: string;
  name: string;
  question: string;
  peco: PECO;
  inclusion_criteria: Criterion[];
  exclusion_criteria: Criterion[];
  review_type: string;
  template_id: string;
  status: string;
  work_count: number;
  assertion_count: number;
  created_at: string;
  updated_at: string;
}

export interface Work {
  id: string;
  project_id: string;
  title?: string | null;
  doi?: string | null;
  year?: number | null;
  authors?: string | null;
  venue?: string | null;
  source_type: string;
  screening_status: string;
  screening_rationale?: string | null;
  created_at: string;
}

export interface Assertion {
  id: string;
  project_id: string;
  work_id: string;
  subject: { surface: string; canonical_label?: string; entity_type?: string };
  predicate: string;
  object: { surface: string; canonical_label?: string; entity_type?: string };
  qualifiers: Record<string, unknown>;
  direction: string;
  effect?: Record<string, unknown> | null;
  epistemic_status: string;
  polarity: string;
  evidence: Array<{ quote: string; section?: string; span_id?: string }>;
  rationale: string;
  is_inferred: boolean;
  confidence: number;
  template_id: string;
  review_status: string;
  guard_failures: string[];
  created_at: string;
}

export interface ComparisonRow {
  work_id: string;
  title?: string | null;
  year?: number | null;
  cells: Record<string, unknown>;
  assertion_ids: string[];
}

export interface ComparisonTable {
  project_id: string;
  columns: string[];
  rows: ComparisonRow[];
  completeness: Record<string, number>;
}

export interface GapRecord {
  id: string;
  project_id: string;
  gap_type: 'coverage' | 'quality' | 'temporal' | 'contradiction';
  description: string;
  severity: number;
  axes: Record<string, unknown>;
  suggested_research_angle?: string | null;
  supporting_stats: Record<string, unknown>;
}

export interface Heatmap {
  row_axis: string;
  col_axis: string;
  rows: string[];
  cols: string[];
  matrix: number[][];
}

export interface EvidenceCluster {
  id: string;
  project_id: string;
  subject_label: string;
  predicate: string;
  object_label: string;
  n_studies: number;
  n_assertions: number;
  direction_histogram: Record<string, number>;
  synthesis?: string | null;
  assertion_ids: string[];
  contested: boolean;
}

export interface QARequest {
  query: string;
  mode?: 'lookup' | 'aggregate' | 'verify' | 'synthesize' | 'review_section';
  token_budget?: number;
}

export interface QAResponse {
  answer: string;
  mode: string;
  citations: Array<{ assertion_id?: string; work_id?: string; quote?: string }>;
  confidence: number;
  limitations?: string | null;
  assembly_trace: Record<string, unknown>;
  flagged_claims: string[];
}

export interface ReviewDraft {
  project_id: string;
  sections: Array<{
    name: string;
    content: string;
    citations: Array<{ assertion_id?: string; work_id?: string }>;
    evidence_appendix: Array<Record<string, unknown>>;
  }>;
  bibliography: Array<Record<string, unknown>>;
}

export interface Hypothesis {
  id: string;
  project_id: string;
  statement: string;
  structured?: Record<string, unknown> | null;
  source: string;
  novelty: number;
  plausibility: number;
  testability: number;
  feasibility: number;
  status: string;
  evidence_for: string[];
  evidence_against: string[];
  verdict?: string | null;
  narrowed_statement?: string | null;
}

export interface CostSummary {
  project_id: string;
  total_tokens: number;
  total_calls: number;
  estimated_cost_usd: number;
  by_stage: Record<string, Record<string, unknown>>;
}

export interface ExtractionTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  predicates: string[];
  fields: Array<{
    name: string;
    description: string;
    required?: boolean;
    allowed_values?: string[] | null;
  }>;
}
