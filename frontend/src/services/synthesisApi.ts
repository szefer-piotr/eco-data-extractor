import api from './api';
import type {
  BatchPdfUploadResult,
  ComparisonTable,
  ContradictionReport,
  GapRecord,
  Hypothesis,
  Project,
  ProjectCreate,
  QARequest,
  QAResponse,
  ReviewDraft,
  TemporalValidation,
  Work,
  Assertion,
  Heatmap,
  EvidenceCluster,
  CostSummary,
  ExtractionTemplate,
} from '../types/synthesis';

export const synthesisApi = {
  listTemplates: () =>
    api.get<ExtractionTemplate[]>('/synthesis/templates').then((r) => r.data),

  listProjects: () =>
    api.get<Project[]>('/synthesis/projects').then((r) => r.data),

  getProject: (id: string) =>
    api.get<Project>(`/synthesis/projects/${id}`).then((r) => r.data),

  createProject: (payload: ProjectCreate) =>
    api.post<Project>('/synthesis/projects', payload).then((r) => r.data),

  updateProject: (id: string, payload: Partial<ProjectCreate> & { status?: string }) =>
    api.patch<Project>(`/synthesis/projects/${id}`, payload).then((r) => r.data),

  deleteProject: (id: string) =>
    api.delete(`/synthesis/projects/${id}`).then((r) => r.data),

  listWorks: (projectId: string) =>
    api.get<Work[]>(`/synthesis/projects/${projectId}/works`).then((r) => r.data),

  uploadCsv: (projectId: string, file: File, columns?: { idColumn?: string; textColumn?: string; titleColumn?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (columns?.idColumn) form.append('id_column', columns.idColumn);
    if (columns?.textColumn) form.append('text_column', columns.textColumn);
    if (columns?.titleColumn) form.append('title_column', columns.titleColumn);
    return api
      .post<Work[]>(`/synthesis/projects/${projectId}/works/csv`, form)
      .then((r) => r.data);
  },

  uploadPdf: (projectId: string, file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api
      .post<Work>(`/synthesis/projects/${projectId}/works/pdf`, form)
      .then((r) => r.data);
  },

  uploadPdfs: (projectId: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file);
    }
    return api
      .post<BatchPdfUploadResult>(`/synthesis/projects/${projectId}/works/pdfs`, form)
      .then((r) => r.data);
  },

  updateScreening: (workId: string, status: string, rationale?: string) =>
    api
      .patch<Work>(`/synthesis/works/${workId}/screening`, null, {
        params: { status, ...(rationale ? { rationale } : {}) },
      })
      .then((r) => r.data),

  listContradictions: (projectId: string) =>
    api
      .get<ContradictionReport[]>(`/synthesis/projects/${projectId}/contradictions`)
      .then((r) => r.data),

  temporalValidation: (projectId: string, cutoffYear = 2022) =>
    api
      .get<TemporalValidation>(`/synthesis/projects/${projectId}/hypotheses/temporal-validation`, {
        params: { cutoff_year: cutoffYear },
      })
      .then((r) => r.data),

  runExtract: (
    projectId: string,
    payload: { provider: string; model: string; temperature?: number; api_key?: string }
  ) => api.post(`/synthesis/projects/${projectId}/extract`, payload).then((r) => r.data),

  listAssertions: (projectId: string, reviewStatus?: string) =>
    api
      .get<Assertion[]>(`/synthesis/projects/${projectId}/assertions`, {
        params: reviewStatus ? { review_status: reviewStatus } : undefined,
      })
      .then((r) => r.data),

  reviewAssertion: (
    assertionId: string,
    payload: { review_status: 'accepted' | 'rejected' | 'edited'; edits?: Record<string, unknown>; note?: string }
  ) => api.post<Assertion>(`/synthesis/assertions/${assertionId}/review`, payload).then((r) => r.data),

  canonicalize: (projectId: string) =>
    api.post(`/synthesis/projects/${projectId}/canonicalize`).then((r) => r.data),

  getComparison: (projectId: string) =>
    api.get<ComparisonTable>(`/synthesis/projects/${projectId}/comparison`).then((r) => r.data),

  rebuildSynthesis: (projectId: string) =>
    api.post(`/synthesis/projects/${projectId}/rebuild-synthesis`).then((r) => r.data),

  listClusters: (projectId: string) =>
    api.get<EvidenceCluster[]>(`/synthesis/projects/${projectId}/clusters`).then((r) => r.data),

  listGaps: (projectId: string) =>
    api.get<GapRecord[]>(`/synthesis/projects/${projectId}/gaps`).then((r) => r.data),

  getHeatmap: (projectId: string) =>
    api.get<Heatmap>(`/synthesis/projects/${projectId}/gaps/heatmap`).then((r) => r.data),

  ask: (projectId: string, payload: QARequest) =>
    api.post<QAResponse>(`/synthesis/projects/${projectId}/qa`, payload).then((r) => r.data),

  reviewDraft: (projectId: string, sections?: string[]) =>
    api
      .post<ReviewDraft>(`/synthesis/projects/${projectId}/review-draft`, {
        sections: sections || ['introduction', 'methods', 'results', 'gaps', 'conclusion'],
      })
      .then((r) => r.data),

  listHypotheses: (projectId: string) =>
    api.get<Hypothesis[]>(`/synthesis/projects/${projectId}/hypotheses`).then((r) => r.data),

  generateHypotheses: (projectId: string) =>
    api.post<Hypothesis[]>(`/synthesis/projects/${projectId}/hypotheses/generate`).then((r) => r.data),

  checkHypothesis: (projectId: string, statement: string) =>
    api
      .post<Hypothesis>(`/synthesis/projects/${projectId}/hypotheses/check`, { statement })
      .then((r) => r.data),

  getCost: (projectId: string) =>
    api.get<CostSummary>(`/synthesis/projects/${projectId}/cost`).then((r) => r.data),
};

export default synthesisApi;
