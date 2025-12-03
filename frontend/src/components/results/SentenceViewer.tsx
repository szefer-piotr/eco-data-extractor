// frontend/src/components/results/SentenceViewer.tsx
import React from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
  const highlightSet = new Set(highlightedSentences);

  const renderSentence = (sentence: string, index: number) => {
    const sentenceNum = index + 1; // Convert to 1-based
    const isHighlighted = highlightSet.has(sentenceNum);
    const isContext = highlightedSentences.some(
      (num) => Math.abs(num - sentenceNum) <= 1
    );

    return (
      <Box
        key={index}
        sx={{
          p: 1.5,
          mb: 1,
          borderRadius: 1,
          backgroundColor: isHighlighted
            ? '#e3f2fd'
            : isContext
            ? '#f5f5f5'
            : 'transparent',
          borderLeft: isHighlighted ? '4px solid' : 'none',
          borderColor: isHighlighted ? 'primary.main' : 'transparent',
        }}
      >
        <Stack direction="row" spacing={1}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: isHighlighted ? 700 : 500,
              color: isHighlighted ? 'primary.main' : 'text.secondary',
              minWidth: '40px',
            }}
          >
            [{sentenceNum}]
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isHighlighted ? 600 : 400,
              color: isHighlighted ? 'primary.dark' : 'text.primary',
            }}
          >
            {sentence}
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
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              maxHeight: '60vh',
              overflow: 'auto',
              backgroundColor: '#fafafa',
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Highlighted: Supporting sentences | Gray: Context (±1 sentence)
              </Typography>
            </Box>
            {sentences.map((sentence, index) => renderSentence(sentence, index))}
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SentenceViewer;

