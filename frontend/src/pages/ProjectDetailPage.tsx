import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import ProjectSubnav from '@components/synthesis/ProjectSubnav';
import WorksTable from '@components/synthesis/WorksTable';
import AssertionReviewCard from '@components/synthesis/AssertionReviewCard';
import QaPanel from '@components/synthesis/QaPanel';
import synthesisApi from '@services/synthesisApi';
import { useConfigStore } from '@store/configStore';
import { useUIStore } from '@store/uiStore';
import type { Assertion, CostSummary, Project, Work } from '../types/synthesis';

type PipelineStage = 'idle' | 'extract' | 'canonicalize' | 'synthesize' | 'uploading';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const addNotification = useUIStore((s) => s.addNotification);
  const { selectedConfig, apiKeys, hasProviderApiKey } = useConfigStore();
  const selectedProvider = selectedConfig?.provider || 'openai';
  const selectedModel = selectedConfig?.model || 'gpt-4o-mini';
  const hasApiKey = hasProviderApiKey(selectedProvider);

  const [project, setProject] = useState<Project | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [tab, setTab] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [busy, setBusy] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => assertions.filter((a) => a.review_status === 'pending').length,
    [assertions]
  );

  const filteredAssertions = useMemo(() => {
    if (reviewFilter === 'all') return assertions;
    return assertions.filter((a) => a.review_status === reviewFilter);
  }, [assertions, reviewFilter]);

  const activeStep = useMemo(() => {
    if (project?.assertion_count && pendingCount === 0 && project.assertion_count > 0) return 4;
    if (project?.assertion_count && project.assertion_count > 0) return 3;
    if (works.length > 0) return 2;
    if (project) return 1;
    return 0;
  }, [project, works.length, pendingCount]);

  const reload = async () => {
    if (!projectId) return;
    const [p, w, a, c] = await Promise.all([
      synthesisApi.getProject(projectId),
      synthesisApi.listWorks(projectId),
      synthesisApi.listAssertions(projectId),
      synthesisApi.getCost(projectId).catch(() => null),
    ]);
    setProject(p);
    setWorks(w);
    setAssertions(a);
    setCost(c);
  };

  useEffect(() => {
    reload().catch((err) =>
      addNotification({ type: 'error', message: err?.message || 'Failed to load project' })
    );
  }, [projectId]);

  const onCsv = async (file: File) => {
    if (!projectId) return;
    setBusy(true);
    try {
      await synthesisApi.uploadCsv(projectId, file);
      addNotification({ type: 'success', message: 'CSV uploaded' });
      await reload();
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
    }
  };

  const onPdf = async (fileList: FileList | null) => {
    if (!projectId || !fileList?.length) return;
    const pdfs = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      addNotification({
        type: 'error',
        message: 'No PDF files found. Select .pdf files or a folder that contains them.',
      });
      return;
    }
    setBusy(true);
    setPipelineStage('uploading');
    setUploadProgress(`Uploading ${pdfs.length} PDF${pdfs.length === 1 ? '' : 's'}…`);
    try {
      const result = await synthesisApi.uploadPdfs(projectId, pdfs);
      const msg =
        result.failed > 0
          ? `Uploaded ${result.uploaded} PDF(s); ${result.failed} failed`
          : `Uploaded ${result.uploaded} PDF(s)`;
      addNotification({
        type: result.failed > 0 && result.uploaded === 0 ? 'error' : 'success',
        message: msg,
      });
      if (result.errors.length > 0) {
        const sample = result.errors
          .slice(0, 3)
          .map((e) => `${e.filename}: ${e.detail}`)
          .join('; ');
        addNotification({
          type: 'error',
          message: `Failed: ${sample}${result.errors.length > 3 ? '…' : ''}`,
        });
      }
      await reload();
      setTab(0);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
      setPipelineStage('idle');
      setUploadProgress(null);
    }
  };

  const runPipeline = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      setPipelineStage('extract');
      const extract = await synthesisApi.runExtract(projectId, {
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0,
        api_key: apiKeys?.[selectedProvider],
      });
      setPipelineStage('canonicalize');
      await synthesisApi.canonicalize(projectId);
      setPipelineStage('synthesize');
      await synthesisApi.rebuildSynthesis(projectId);
      addNotification({
        type: 'success',
        message: `Extracted ${extract.assertions_created} assertions`,
      });
      await reload();
      setTab(1);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
      setPipelineStage('idle');
    }
  };

  const review = async (id: string, status: 'accepted' | 'rejected', note?: string) => {
    await synthesisApi.reviewAssertion(id, { review_status: status, note });
    await reload();
  };

  const onScreeningChange = async (workId: string, status: string) => {
    try {
      await synthesisApi.updateScreening(workId, status);
      await reload();
      addNotification({ type: 'success', message: `Work marked as ${status}` });
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    }
  };

  if (!project || !projectId) {
    return (
      <Panel title="Project">
        <CircularProgress />
      </Panel>
    );
  }

  const pipelineLabel =
    pipelineStage === 'uploading'
      ? uploadProgress
      : pipelineStage === 'extract'
        ? 'Extracting assertions…'
        : pipelineStage === 'canonicalize'
          ? 'Canonicalizing entities…'
          : pipelineStage === 'synthesize'
            ? 'Rebuilding clusters and gaps…'
            : null;

  return (
    <Panel title={project.name} subtitle={project.question}>
      <ProjectSubnav projectId={projectId} />

      {!hasApiKey && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Set an API key in{' '}
          <Link component={RouterLink} to="/settings" underline="hover">
            Settings
          </Link>{' '}
          before running Extract.
        </Alert>
      )}

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
        <Chip label={project.status} />
        <Chip label={`${project.work_count} works`} />
        <Chip label={`${project.assertion_count} assertions`} />
        <Chip label={`${pendingCount} pending review`} color={pendingCount > 0 ? 'warning' : 'default'} />
        <Chip variant="outlined" label={project.template_id} />
        <Chip variant="outlined" label={`${selectedProvider} / ${selectedModel}`} />
        {cost && (
          <Chip
            variant="outlined"
            label={`$${cost.estimated_cost_usd.toFixed(4)} · ${cost.total_tokens} tokens · ${cost.total_calls} calls`}
          />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        PECO — P: {project.peco.population} | E: {project.peco.exposure} | C:{' '}
        {project.peco.comparator || '—'} | O: {project.peco.outcome}
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {['Create', 'Ingest', 'Extract', 'Review', 'Synthesize'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button variant="contained" component="label" disabled={busy}>
          Upload CSV
          <input
            hidden
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
          />
        </Button>
        <Button variant="outlined" component="label" disabled={busy}>
          Upload PDFs
          <input
            hidden
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => {
              onPdf(e.target.files);
              e.target.value = '';
            }}
          />
        </Button>
        <Button variant="outlined" component="label" disabled={busy}>
          Upload PDF folder
          <input
            hidden
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              onPdf(e.target.files);
              e.target.value = '';
            }}
          />
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={runPipeline}
          disabled={busy || !works.length || !hasApiKey}
        >
          Extract → Canonicalize → Synthesize
        </Button>
        {busy && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={24} />
            {pipelineLabel && (
              <Typography variant="caption" color="text.secondary">
                {pipelineLabel}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Works (${works.length})`} />
        <Tab label={`Review queue (${pendingCount})`} />
        <Tab label="Q&A" />
      </Tabs>

      {tab === 0 && <WorksTable works={works} onScreeningChange={onScreeningChange} />}

      {tab === 1 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1}>
            {(['pending', 'accepted', 'rejected', 'all'] as const).map((f) => (
              <Chip
                key={f}
                label={f}
                clickable
                color={reviewFilter === f ? 'primary' : 'default'}
                onClick={() => setReviewFilter(f)}
                variant={reviewFilter === f ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
          {filteredAssertions.map((a) => (
            <AssertionReviewCard key={a.id} assertion={a} onReview={review} />
          ))}
          {filteredAssertions.length === 0 && (
            <Typography color="text.secondary">No assertions in this filter.</Typography>
          )}
        </Stack>
      )}

      {tab === 2 && <QaPanel projectId={projectId} />}
    </Panel>
  );
};

export default ProjectDetailPage;
