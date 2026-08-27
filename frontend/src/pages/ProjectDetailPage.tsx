import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import synthesisApi from '@services/synthesisApi';
import { useConfigStore } from '@store/configStore';
import { useUIStore } from '@store/uiStore';
import type { Assertion, Project, Work } from '../types/synthesis';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const { selectedConfig, apiKeys } = useConfigStore();
  const selectedProvider = selectedConfig?.provider || 'openai';
  const selectedModel = selectedConfig?.model || 'gpt-4o-mini';
  const [project, setProject] = useState<Project | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [assertions, setAssertions] = useState<Assertion[]>([]);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [qaQuery, setQaQuery] = useState('What does the evidence say overall?');
  const [qaAnswer, setQaAnswer] = useState('');

  const reload = async () => {
    if (!projectId) return;
    const [p, w, a] = await Promise.all([
      synthesisApi.getProject(projectId),
      synthesisApi.listWorks(projectId),
      synthesisApi.listAssertions(projectId),
    ]);
    setProject(p);
    setWorks(w);
    setAssertions(a);
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

  const onPdf = async (file: File) => {
    if (!projectId) return;
    setBusy(true);
    try {
      await synthesisApi.uploadPdf(projectId, file);
      addNotification({ type: 'success', message: 'PDF uploaded' });
      await reload();
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
    }
  };

  const runPipeline = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const extract = await synthesisApi.runExtract(projectId, {
        provider: selectedProvider || 'openai',
        model: selectedModel || 'gpt-4o-mini',
        temperature: 0,
        api_key: apiKeys?.[selectedProvider || 'openai'],
      });
      addNotification({
        type: 'success',
        message: `Extracted ${extract.assertions_created} assertions`,
      });
      await synthesisApi.canonicalize(projectId);
      await synthesisApi.rebuildSynthesis(projectId);
      await reload();
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
    }
  };

  const review = async (id: string, status: 'accepted' | 'rejected') => {
    await synthesisApi.reviewAssertion(id, { review_status: status });
    await reload();
  };

  const ask = async () => {
    if (!projectId) return;
    const res = await synthesisApi.ask(projectId, { query: qaQuery, mode: 'synthesize' });
    setQaAnswer(res.answer);
  };

  if (!project) {
    return (
      <Panel title="Project">
        <CircularProgress />
      </Panel>
    );
  }

  return (
    <Panel
      title={project.name}
      subtitle={project.question}
      actions={
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate(`/projects/${projectId}/comparison`)}>Comparison</Button>
          <Button onClick={() => navigate(`/projects/${projectId}/gaps`)}>Gaps</Button>
          <Button onClick={() => navigate(`/projects/${projectId}/hypotheses`)}>Hypotheses</Button>
        </Stack>
      }
    >
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
        <Chip label={project.status} />
        <Chip label={`${project.work_count} works`} />
        <Chip label={`${project.assertion_count} assertions`} />
        <Chip variant="outlined" label={project.template_id} />
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        PECO — P: {project.peco.population} | E: {project.peco.exposure} | C:{' '}
        {project.peco.comparator || '—'} | O: {project.peco.outcome}
      </Typography>

      <Stack direction="row" spacing={1} mb={2}>
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
          Upload PDF
          <input
            hidden
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])}
          />
        </Button>
        <Button variant="contained" color="secondary" onClick={runPipeline} disabled={busy || !works.length}>
          Extract → Canonicalize → Synthesize
        </Button>
        {busy && <CircularProgress size={24} />}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Works (${works.length})`} />
        <Tab label={`Review queue`} />
        <Tab label="Q&A" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Screening</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {works.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.title || w.id.slice(0, 8)}</TableCell>
                  <TableCell>{w.year || '—'}</TableCell>
                  <TableCell>{w.source_type}</TableCell>
                  <TableCell>{w.screening_status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {assertions
            .filter((a) => a.review_status === 'pending')
            .map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>
                  {(a.subject as any)?.surface} —{a.predicate}→ {(a.object as any)?.surface}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.rationale}
                </Typography>
                <Typography variant="caption" display="block" mt={1}>
                  Evidence: {(a.evidence || []).map((e) => e.quote).join(' | ')}
                </Typography>
                {a.guard_failures?.length > 0 && (
                  <Chip size="small" color="warning" label={a.guard_failures.join(', ')} sx={{ mt: 1 }} />
                )}
                <Stack direction="row" spacing={1} mt={1}>
                  <Button size="small" onClick={() => review(a.id, 'accepted')}>
                    Accept
                  </Button>
                  <Button size="small" color="error" onClick={() => review(a.id, 'rejected')}>
                    Reject
                  </Button>
                </Stack>
              </Paper>
            ))}
          {assertions.filter((a) => a.review_status === 'pending').length === 0 && (
            <Typography color="text.secondary">No assertions pending review.</Typography>
          )}
        </Stack>
      )}

      {tab === 2 && (
        <Box>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField
              fullWidth
              value={qaQuery}
              onChange={(e) => setQaQuery(e.target.value)}
              label="Ask the evidence base"
            />
            <Button variant="contained" onClick={ask}>
              Ask
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                if (!projectId) return;
                const draft = await synthesisApi.reviewDraft(projectId);
                setQaAnswer(draft.sections.map((s) => `## ${s.name}\n${s.content}`).join('\n\n'));
              }}
            >
              Draft review
            </Button>
          </Stack>
          <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-wrap' }}>
            {qaAnswer || 'Answers appear here.'}
          </Paper>
        </Box>
      )}
    </Panel>
  );
};

export default ProjectDetailPage;
