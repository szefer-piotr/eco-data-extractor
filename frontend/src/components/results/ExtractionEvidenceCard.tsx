// frontend/src/components/results/ExtractionEvidenceCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  Box,
  LinearProgress,
  Button,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ExtractionEvidence } from '@api-types/api';

interface ExtractionEvidenceCardProps {
  evidence: ExtractionEvidence;
  categoryName: string;
  sentences?: string[];
  onViewSentences?: (sentenceNumbers: number[]) => void;
}

const ExtractionEvidenceCard: React.FC<ExtractionEvidenceCardProps> = ({
  evidence,
  categoryName,
  sentences,
  onViewSentences,
}) => {
  const confidenceColor = 
    evidence.confidence >= 0.8 ? 'success' :
    evidence.confidence >= 0.5 ? 'warning' : 'error';

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Value and Inferred Badge */}
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="body1" fontWeight={600}>
              {evidence.value || '(not found)'}
            </Typography>
            {evidence.is_inferred && (
              <Chip
                icon={<PsychologyIcon />}
                label="Inferred"
                size="small"
                color="info"
                variant="outlined"
              />
            )}
            {!evidence.is_inferred && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Direct"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>

          {/* Confidence Score */}
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="textSecondary">
                Confidence
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {(evidence.confidence * 100).toFixed(0)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={evidence.confidence * 100}
              color={confidenceColor}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Sentence Numbers */}
          {evidence.sentence_numbers.length > 0 && (
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                Supporting Sentences:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {evidence.sentence_numbers.map((num) => (
                  <Chip
                    key={num}
                    label={`[${num}]`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => onViewSentences?.([num])}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                {sentences && sentences.length > 0 && onViewSentences && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onViewSentences(evidence.sentence_numbers)}
                    sx={{ ml: 1, minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    View Context
                  </Button>
                )}
              </Stack>

              {/* Sentence Preview - show first supporting sentence */}
              {sentences && sentences.length > 0 && evidence.sentence_numbers.length > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1,
                    backgroundColor: '#fafafa',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    maxHeight: '80px',
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                    Preview:
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontStyle: 'italic',
                      color: 'text.primary',
                      display: 'block',
                    }}
                  >
                    {(() => {
                      const firstSentNum = evidence.sentence_numbers[0];
                      const sentenceIndex = firstSentNum - 1; // Convert to 0-based
                      if (sentenceIndex >= 0 && sentenceIndex < sentences.length) {
                        const sentenceText = sentences[sentenceIndex];
                        const truncated = sentenceText.length > 200
                          ? sentenceText.substring(0, 200) + '...'
                          : sentenceText;
                        return `[${firstSentNum}] ${truncated}`;
                      }
                      return 'Sentence not available';
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Rationale */}
          {evidence.rationale && evidence.rationale.trim() !== '' && (
            <Box
              sx={{
                p: 1.5,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                Justification:
              </Typography>
              <Typography variant="body2">{evidence.rationale}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ExtractionEvidenceCard;

