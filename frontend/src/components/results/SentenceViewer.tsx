// frontend/src/components/results/SentenceViewer.tsx
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Stack,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';

interface SentenceViewerProps {
  open: boolean;
  onClose: () => void;
  sentences: string[];
  highlightedSentences: number[]; // 1-based sentence numbers
  title?: string;
}

const SentenceViewer: React.FC<SentenceViewerProps> = ({
  open,
  onClose,
  sentences,
  highlightedSentences,
  title = 'Supporting Sentences with Context',
}) => {
  const [focusedMode, setFocusedMode] = useState(true);

  const highlightSet = new Set(highlightedSentences);

  // Calculate context sentences (highlighted + ±1)
  const contextSet = useMemo(() => {
    const set = new Set<number>();
    highlightedSentences.forEach((num) => {
      set.add(num);
      if (num > 1) set.add(num - 1);
      if (num < sentences.length) set.add(num + 1);
    });
    return set;
  }, [highlightedSentences, sentences.length]);

  // Filter sentences based on mode
  const visibleSentences = useMemo(() => {
    if (!focusedMode) {
      return sentences.map((s, i) => ({ sentence: s, index: i }));
    }
    return sentences
      .map((s, i) => ({ sentence: s, index: i }))
      .filter(({ index }) => contextSet.has(index + 1));
  }, [sentences, focusedMode, contextSet]);

  const renderSentence = (sentence: string, originalIndex: number) => {
    const sentenceNum = originalIndex + 1; // Convert to 1-based
    const isHighlighted = highlightSet.has(sentenceNum);
    const isContext = contextSet.has(sentenceNum) && !isHighlighted;

    return (
      <Box
        key={originalIndex}
        sx={{
          p: 1.5,
          mb: 1,
          borderRadius: 1,
          backgroundColor: isHighlighted
            ? '#e3f2fd'
            : isContext
            ? '#f5f5f5'
            : 'transparent',
          borderLeft: isHighlighted ? '4px solid' : isContext ? '2px solid' : 'none',
          borderColor: isHighlighted ? 'primary.main' : isContext ? '#bdbdbd' : 'transparent',
          transition: 'background-color 0.2s',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Typography
            variant="caption"
            sx={{
              fontWeight: isHighlighted ? 700 : 500,
              color: isHighlighted ? 'primary.main' : 'text.secondary',
              minWidth: '50px',
              flexShrink: 0,
              fontFamily: 'monospace',
            }}
          >
            [{sentenceNum}]
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isHighlighted ? 600 : 400,
              color: isHighlighted ? 'primary.dark' : 'text.primary',
              flex: 1,
            }}
          >
            {sentence.trim() || '(empty sentence)'}
          </Typography>
        </Stack>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {sentences.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No sentences available.
          </Typography>
        ) : (
          <>
            {/* Summary Stats */}
            <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                <Chip
                  label={`Total: ${sentences.length}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Supporting: ${highlightedSentences.length}`}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={`Context: ${contextSet.size - highlightSet.size}`}
                  size="small"
                  variant="outlined"
                  color="default"
                />
                <Box sx={{ flexGrow: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={focusedMode}
                      onChange={(e) => setFocusedMode(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <FilterListIcon fontSize="small" />
                      <Typography variant="caption">
                        Focused ({focusedMode ? 'on' : 'off'})
                      </Typography>
                    </Stack>
                  }
                />
              </Stack>
            </Box>

            {/* Legend */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="textSecondary">
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>Blue:</Box> Supporting sentences |{' '}
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>Gray:</Box> Context (±1 sentence)
                {!focusedMode && (
                  <> | <Box component="span">White:</Box> Other sentences</>
                )}
              </Typography>
            </Box>

            {/* Sentences */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: '50vh',
                overflow: 'auto',
                backgroundColor: '#fafafa',
              }}
            >
              {visibleSentences.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No sentences to display.
                </Typography>
              ) : (
                visibleSentences.map(({ sentence, index }) =>
                  renderSentence(sentence, index)
                )
              )}
            </Paper>

            {/* Showing info */}
            {focusedMode && visibleSentences.length < sentences.length && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Showing {visibleSentences.length} of {sentences.length} sentences (toggle &quot;Focused&quot; to see all)
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SentenceViewer;
