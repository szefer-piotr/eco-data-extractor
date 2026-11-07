import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Assertion } from '../../types/synthesis';

interface AssertionReviewCardProps {
  assertion: Assertion;
  onReview: (id: string, status: 'accepted' | 'rejected', note?: string) => void;
}

const AssertionReviewCard: React.FC<AssertionReviewCardProps> = ({ assertion, onReview }) => {
  const [note, setNote] = useState('');
  const effect = assertion.effect as { verbatim?: string; value?: number; metric?: string } | null | undefined;
  const hasEffect = Boolean(effect?.verbatim || effect?.value != null);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
        <Chip size="small" label={assertion.review_status} />
        <Chip size="small" variant="outlined" label={assertion.direction} />
        <Chip size="small" variant="outlined" label={`conf ${(assertion.confidence * 100).toFixed(0)}%`} />
        {hasEffect && <Chip size="small" color="warning" label="effect size — review required" />}
      </Stack>

      <Typography fontWeight={600}>
        {assertion.subject?.surface}
        {assertion.subject?.canonical_label && (
          <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
            ({assertion.subject.canonical_label})
          </Typography>
        )}{' '}
        —{assertion.predicate}→ {assertion.object?.surface}
        {assertion.object?.canonical_label && (
          <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
            ({assertion.object.canonical_label})
          </Typography>
        )}
      </Typography>

      <Typography variant="body2" color="text.secondary" mt={0.5}>
        {assertion.rationale}
      </Typography>

      {hasEffect && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: 1,
            bgcolor: 'warning.light',
            color: 'warning.contrastText',
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            Effect:{' '}
          </Typography>
          <Typography variant="body2" component="span">
            {effect?.verbatim || `${effect?.metric} = ${effect?.value}`}
          </Typography>
        </Box>
      )}

      {(assertion.evidence || []).length > 0 && (
        <Typography variant="caption" display="block" mt={1} color="text.secondary">
          Evidence: {assertion.evidence.map((e) => `"${e.quote}"`).join(' | ')}
        </Typography>
      )}

      {assertion.guard_failures?.length > 0 && (
        <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" useFlexGap>
          {assertion.guard_failures.map((f) => (
            <Chip key={f} size="small" color="error" label={f} />
          ))}
        </Stack>
      )}

      {assertion.review_status === 'pending' && (
        <Stack spacing={1} mt={1.5}>
          <TextField
            size="small"
            label="Reviewer note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => onReview(assertion.id, 'accepted', note || undefined)}>
              Accept
            </Button>
            <Button size="small" color="error" onClick={() => onReview(assertion.id, 'rejected', note || undefined)}>
              Reject
            </Button>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
};

export default AssertionReviewCard;
