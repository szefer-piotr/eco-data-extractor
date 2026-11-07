import React, { useEffect, useState } from 'react';
import {
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import ProjectSubnav from '@components/synthesis/ProjectSubnav';
import synthesisApi from '@services/synthesisApi';
import { useUIStore } from '@store/uiStore';
import type { Hypothesis, TemporalValidation } from '../types/synthesis';

const HypothesesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const addNotification = useUIStore((s) => s.addNotification);
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [statement, setStatement] = useState('');
  const [cutoffYear, setCutoffYear] = useState(2022);
  const [validation, setValidation] = useState<TemporalValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!projectId) return;
    setItems(await synthesisApi.listHypotheses(projectId));
  };

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => addNotification({ type: 'error', message: err?.message || 'Failed' }))
      .finally(() => setLoading(false));
  }, [projectId]);

  const generate = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      await synthesisApi.generateHypotheses(projectId);
      await reload();
      addNotification({ type: 'success', message: 'Hypotheses generated from gaps and contradictions' });
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Generate failed' });
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (!projectId || !statement.trim()) return;
    setBusy(true);
    try {
      await synthesisApi.checkHypothesis(projectId, statement.trim());
      setStatement('');
      await reload();
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Check failed' });
    } finally {
      setBusy(false);
    }
  };

  const runTemporalValidation = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const res = await synthesisApi.temporalValidation(projectId, cutoffYear);
      setValidation(res);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Validation failed' });
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) return null;

  return (
    <Panel
      title="Hypotheses"
      subtitle="Generate from gaps / analogies / contradictions, or check a claim"
    >
      <ProjectSubnav projectId={projectId} />

      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button variant="contained" onClick={generate} disabled={busy}>
          Generate from evidence
        </Button>
        <TextField
          size="small"
          type="number"
          label="Cutoff year"
          value={cutoffYear}
          onChange={(e) => setCutoffYear(Number(e.target.value))}
          sx={{ width: 120 }}
        />
        <Button variant="outlined" onClick={runTemporalValidation} disabled={busy}>
          Temporal validation
        </Button>
        {busy && <CircularProgress size={22} />}
      </Stack>

      {validation && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
            <Chip size="small" label={`cutoff ${validation.cutoff_year}`} />
            <Chip size="small" variant="outlined" label={`pre: ${validation.pre_cutoff_works} works`} />
            <Chip size="small" variant="outlined" label={`post: ${validation.post_cutoff_works} works`} />
            <Chip size="small" variant="outlined" label={`gaps: ${validation.coverage_gaps}`} />
            <Chip size="small" variant="outlined" label={`hits: ${validation.hits_in_post_cutoff}`} />
            {validation.hit_rate != null && (
              <Chip size="small" color="primary" label={`hit rate ${(validation.hit_rate * 100).toFixed(0)}%`} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {validation.note}
          </Typography>
        </Paper>
      )}

      <Stack direction="row" spacing={1} mb={3}>
        <TextField
          fullWidth
          label="Check a hypothesis"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
        <Button variant="outlined" onClick={check} disabled={busy || !statement.trim()}>
          Check
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={1.5}>
          {items.map((h) => (
            <Paper key={h.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} mb={0.5} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={h.source} />
                <Chip size="small" label={h.status} />
                {h.verdict && <Chip size="small" color="primary" label={h.verdict} />}
                <Chip size="small" variant="outlined" label={`novelty ${h.novelty.toFixed(2)}`} />
                <Chip size="small" variant="outlined" label={`plausibility ${h.plausibility.toFixed(2)}`} />
                <Chip size="small" variant="outlined" label={`testability ${h.testability.toFixed(2)}`} />
                <Chip size="small" variant="outlined" label={`feasibility ${h.feasibility.toFixed(2)}`} />
                <Chip size="small" variant="outlined" label={`for: ${h.evidence_for.length}`} />
                <Chip size="small" variant="outlined" label={`against: ${h.evidence_against.length}`} />
              </Stack>
              <Typography variant="body1">{h.statement}</Typography>
              {h.narrowed_statement && (
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  Narrowed: {h.narrowed_statement}
                </Typography>
              )}
            </Paper>
          ))}
          {items.length === 0 && (
            <Typography color="text.secondary">No hypotheses yet.</Typography>
          )}
        </Stack>
      )}
    </Panel>
  );
};

export default HypothesesPage;
