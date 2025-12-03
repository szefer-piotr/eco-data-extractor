import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  TextField,
  Alert,
  Stack,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';

interface SentenceReference {
  sentence_id: number;
  sentence_text: string;
  justification: string;
}

interface CandidateSentence {
  sentence_id: number;
  sentence_text: string;
  relevance_score: number;
  reason: string;
}

export interface CategoryExtraction {
  value: string | null;
  confidence?: number;
  supporting_sentences?: SentenceReference[];
  justification?: string;
  validation_status?: string;
  user_validated_sentences?: SentenceReference[];
  candidate_sentences?: CandidateSentence[];
}

export interface ValidationProps {
  rowData: {
    row_id: string;
    extracted_data: Record<string, CategoryExtraction>;
    enumerated_sentences: Array<{ sentence_id: number; sentence_text: string }>;
  };
  onValidationComplete: (feedback: ValidationFeedback[]) => void;
}

interface ValidationFeedback {
  row_id: string;
  category: string;
  validation_status: 'confirmed' | 'rejected' | 'override';
  user_validated_sentences: number[];
  manual_value?: string;
  notes?: string;
}

export const ExtractionValidation: React.FC<ValidationProps> = ({
  rowData,
  onValidationComplete,
}) => {
  const [validations, setValidations] = useState<Record<string, ValidationFeedback>>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSentences, setSelectedSentences] = useState<Set<number>>(new Set());
  const [manualValue, setManualValue] = useState('');

  const handleOpenValidation = (category: string) => {
    setSelectedCategory(category);
    const extraction = rowData.extracted_data[category];
    
    setSelectedSentences(
      new Set((extraction.user_validated_sentences?.map(s => s.sentence_id)) || [])
    );
    setManualValue(extraction.value || '');
    setOpenDialog(true);
  };

  const handleSentenceToggle = (sentenceId: number) => {
    const newSelected = new Set(selectedSentences);
    if (newSelected.has(sentenceId)) {
      newSelected.delete(sentenceId);
    } else {
      newSelected.add(sentenceId);
    }
    setSelectedSentences(newSelected);
  };

  const handleConfirmValidation = () => {
    if (!selectedCategory) return;

    const feedback: ValidationFeedback = {
      row_id: rowData.row_id,
      category: selectedCategory,
      validation_status: 'confirmed',
      user_validated_sentences: Array.from(selectedSentences),
    };

    if (manualValue !== rowData.extracted_data[selectedCategory].value) {
      feedback.validation_status = 'override';
      feedback.manual_value = manualValue;
    }

    setValidations(prev => ({
      ...prev,
      [selectedCategory]: feedback,
    }));

    setOpenDialog(false);
  };

  const handleRejectCategory = (category: string) => {
    setValidations(prev => ({
      ...prev,
      [category]: {
        row_id: rowData.row_id,
        category,
        validation_status: 'rejected',
        user_validated_sentences: [],
      },
    }));
  };

  const handleSubmitFeedback = () => {
    const feedbackList = Object.values(validations);
    onValidationComplete(feedbackList);
  };

  const handleUseCandidates = (category: string, sentenceIds: number[]) => {
    setSelectedCategory(category);
    setSelectedSentences(new Set(sentenceIds));
    setManualValue('');
    setOpenDialog(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Validate Extraction Results
      </Typography>

      <Stack spacing={2}>
        {Object.entries(rowData.extracted_data).map(([category, extraction]) => (
          <Card
            key={category}
            variant="outlined"
            sx={{
              borderLeft: `4px solid ${
                extraction.value ? '#4caf50' : '#ff9800'
              }`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {category}
                </Typography>
                <Box>
                  {extraction.value ? (
                    <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
                  ) : (
                    <HelpIcon sx={{ color: '#ff9800' }} />
                  )}
                  {extraction.confidence !== undefined && (
                    <Chip
                      label={`Confidence: ${(extraction.confidence * 100).toFixed(0)}%`}
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Extracted:</strong> {extraction.value || '(Not found)'}
              </Typography>

              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                <strong>Justification:</strong> {extraction.justification || 'N/A'}
              </Typography>

              {extraction.supporting_sentences && extraction.supporting_sentences.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight="bold">
                    Supporting Sentences:
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1, ml: 2 }}>
                    {extraction.supporting_sentences.map(sent => (
                      <Alert
                        key={sent.sentence_id}
                        severity="info"
                        sx={{ py: 0.5 }}
                      >
                        <strong>[{sent.sentence_id}]</strong> {sent.sentence_text}
                      </Alert>
                    ))}
                  </Stack>
                </Box>
              )}

              {extraction.candidate_sentences &&
                extraction.candidate_sentences.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight="bold">
                      Candidate Sentences (LLM Suggestions):
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1, ml: 2 }}>
                      {extraction.candidate_sentences.map(cand => (
                        <Card key={cand.sentence_id} variant="outlined">
                          <CardContent sx={{ py: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption">
                                <strong>[{cand.sentence_id}]</strong> {cand.sentence_text}
                              </Typography>
                              <Chip
                                label={`Score: ${(cand.relevance_score * 100).toFixed(0)}%`}
                                size="small"
                              />
                            </Box>
                            <Typography variant="caption" color="textSecondary">
                              {cand.reason}
                            </Typography>
                            <Button
                              size="small"
                              onClick={() => handleUseCandidates(category, [cand.sentence_id])}
                            >
                              Use This
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleOpenValidation(category)}
                >
                  Review & Validate
                </Button>
                {extraction.value && (
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    onClick={() => handleRejectCategory(category)}
                  >
                    Mark as Incorrect
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSubmitFeedback}
          disabled={Object.keys(validations).length === 0}
        >
          Submit Validation Feedback
        </Button>
      </Box>

      {/* Validation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Validate & Adjust Extraction: {selectedCategory}</DialogTitle>
        <DialogContent>
          {selectedCategory && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Extracted Value"
                value={manualValue}
                onChange={e => setManualValue(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Select Supporting Sentences:
                </Typography>
                <List>
                  {(rowData.enumerated_sentences && rowData.enumerated_sentences.length > 0) ? rowData.enumerated_sentences.map(sent => (
                    <ListItem
                      key={sent.sentence_id}
                      dense
                      button
                      onClick={() => handleSentenceToggle(sent.sentence_id)}
                    >
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedSentences.has(sent.sentence_id)}
                          onChange={() => handleSentenceToggle(sent.sentence_id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`[${sent.sentence_id}] ${sent.sentence_text}`}
                      />
                    </ListItem>
                  )) : (
                    <ListItem disabled>
                      <ListItemText
                        primary="No enumerated sentences available for this row"
                        secondary="Sentences will be provided after text processing"
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmValidation} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};