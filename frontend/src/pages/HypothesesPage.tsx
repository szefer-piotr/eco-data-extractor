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
import { useNavigate, useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import synthesisApi from '@services/synthesisApi';
import { useUIStore } from '@store/uiStore';
import type { Hypothesis } from '../types/synthesis';

const HypothesesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [statement, setStatement] = useState('');
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

  return (
    <Panel
      title="Hypotheses"
      subtitle="Generate from gaps / analogies / contradictions, or check a claim"
      actions={<Button onClick={() => navigate(`/projects/${projectId}`)}>Back</Button>}
    >
      <Stack direction="row" spacing={1} mb={2}>
        <Button variant="contained" onClick={generate} disabled={busy}>
          Generate from evidence
        </Button>
        {busy && <CircularProgress size={22} />}
      </Stack>

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
