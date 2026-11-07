import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import synthesisApi from '@services/synthesisApi';
import type { QARequest, QAResponse, ReviewDraft } from '../../types/synthesis';

interface QaPanelProps {
  projectId: string;
}

const QA_MODES: QARequest['mode'][] = ['synthesize', 'lookup', 'aggregate', 'verify'];

const QaPanel: React.FC<QaPanelProps> = ({ projectId }) => {
  const [query, setQuery] = useState('What does the evidence say overall?');
  const [mode, setMode] = useState<QARequest['mode']>('synthesize');
  const [qaResult, setQaResult] = useState<QAResponse | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    try {
      const res = await synthesisApi.ask(projectId, { query, mode });
      setQaResult(res);
    } finally {
      setBusy(false);
    }
  };

  const generateDraft = async () => {
    setBusy(true);
    try {
      const res = await synthesisApi.reviewDraft(projectId);
      setDraft(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <TextField
            fullWidth
            sx={{ flex: 1, minWidth: 200 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            label="Ask the evidence base"
          />
          <TextField
            select
            label="Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as QARequest['mode'])}
            sx={{ minWidth: 140 }}
          >
            {QA_MODES.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={ask} disabled={busy}>
            Ask
          </Button>
          <Button variant="outlined" onClick={generateDraft} disabled={busy}>
            Draft review
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          {qaResult ? (
            <Stack spacing={1.5}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {qaResult.answer}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`confidence ${(qaResult.confidence * 100).toFixed(0)}%`} />
                <Chip size="small" variant="outlined" label={qaResult.mode} />
              </Stack>
              {qaResult.limitations && (
                <Typography variant="caption" color="text.secondary">
                  Limitations: {qaResult.limitations}
                </Typography>
              )}
              {qaResult.flagged_claims?.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {qaResult.flagged_claims.map((c) => (
                    <Chip key={c} size="small" color="warning" label={c} />
                  ))}
                </Stack>
              )}
              {qaResult.citations?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Citations ({qaResult.citations.length})
                  </Typography>
                  {qaResult.citations.map((c, i) => (
                    <Typography key={i} variant="caption" display="block" color="text.secondary">
                      {c.quote || c.assertion_id || c.work_id}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">Answers appear here.</Typography>
          )}
        </Paper>
      </Box>

      {draft && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Review draft
          </Typography>
          <Stack spacing={2}>
            {draft.sections.map((section) => (
              <Paper key={section.name} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {section.name}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {section.content}
                </Typography>
                {section.citations?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {section.citations.length} citation(s)
                  </Typography>
                )}
              </Paper>
            ))}
            {draft.bibliography?.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Bibliography ({draft.bibliography.length})
                </Typography>
                {draft.bibliography.slice(0, 10).map((entry, i) => (
                  <Typography key={i} variant="caption" display="block" color="text.secondary">
                    {JSON.stringify(entry)}
                  </Typography>
                ))}
              </Paper>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default QaPanel;
