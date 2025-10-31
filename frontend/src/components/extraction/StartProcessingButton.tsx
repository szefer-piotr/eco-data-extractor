// frontend/src/components/extraction/StartProcessingButton.tsx
import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { extractionApi } from '@services/extractionApi';
import { fileApi } from '@services/fileApi';
import { useExtractionStore } from '@store/extractionStore';
import { useConfigStore } from '@store/configStore';
import { useUIStore } from '@store/uiStore';

interface StartProcessingButtonProps {
  onJobStart?: (jobId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

const StartProcessingButton: React.FC<StartProcessingButtonProps> = ({
  onJobStart,
  onError,
  disabled = false,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Store access
  const { file, idColumn, textColumn, categories, jobId, setJobId } =
    useExtractionStore();
  const { selectedConfig, apiKeys, isConfigComplete } = useConfigStore();
  const { addNotification } = useUIStore();

  // Validation checks
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file uploaded. Please upload a CSV or PDF file.');
    } else if (file.type === 'csv') {
      if (!idColumn) errors.push('ID column not selected.');
      if (!textColumn) errors.push('Text column not selected.');
      if (idColumn === textColumn) errors.push('ID and text columns must be different.');
    }

    if (categories.length === 0) {
      errors.push('No categories defined. Please add at least one category.');
    }

    if (!isConfigComplete()) {
      errors.push('Model configuration is incomplete. Please complete the configuration.');
    }

    return errors;
  };

  const validationErrors = getValidationErrors();
  const isValid = validationErrors.length === 0;

  const handleStartClick = () => {
    if (!isValid) {
      setError(validationErrors[0]);
      return;
    }
    setOpenDialog(true);
    setConfirmChecked(false);
  };

  const handleConfirmStart = async () => {
    if (!confirmChecked) {
      setError('Please confirm to proceed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!file) {
        throw new Error('No file selected');
      }

      // Convert categories to Record<string, string> format
      const categoriesRecord = categories.reduce(
        (acc, cat) => ({
          ...acc,
          [cat.name]: cat.prompt,
        }),
        {} as Record<string, string>
      );

      let response;

      if (file.type === 'csv') {
        if (!idColumn || !textColumn) {
          throw new Error('CSV columns not properly selected');
        }
        if (!file.nativeFile) {
          throw new Error('File data not available');
        }
        response = await extractionApi.uploadCSV(
          file.nativeFile as File,
          idColumn,
          textColumn,
          categoriesRecord
        );
      } else if (file.type === 'pdf') {
        if (!file.nativeFile) {
          throw new Error('File data not available');
        }
        response = await extractionApi.uploadPDF([file.nativeFile], categoriesRecord);
      } else {
        throw new Error('Invalid file type');
      }

      const newJobId = response.job_id;
      setJobId(newJobId);

      addNotification({
        type: 'success',
        message: `Extraction started. Job ID: ${newJobId}`,
      });

      setOpenDialog(false);
      onJobStart?.(newJobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start extraction';
      setError(message);
      onError?.(message);
      addNotification({
        type: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setError(null);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || !isValid || isLoading}
        onClick={handleStartClick}
        startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
      >
        {isLoading ? 'Starting...' : 'Start Extraction'}
      </Button>

      {/* Validation Errors Display */}
      {validationErrors.length > 0 && !openDialog && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              Cannot start extraction:
            </Typography>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {validationErrors.map((err, index) => (
                <li key={index}>
                  <Typography variant="caption">{err}</Typography>
                </li>
              ))}
            </ul>
          </Stack>
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Extraction Start</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Extraction Configuration:
              </Typography>
              <Stack spacing={1} sx={{ pl: 2 }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">File:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {file?.name}
                  </Typography>
                </Box>
                {file?.type === 'csv' && (
                  <>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">ID Column:</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {idColumn}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Text Column:</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {textColumn}
                      </Typography>
                    </Box>
                  </>
                )}
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Categories:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {categories.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Provider:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedConfig?.provider}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Model:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedConfig?.model}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                />
              }
              label="I confirm this configuration is correct and want to start extraction"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStart}
            variant="contained"
            disabled={!confirmChecked || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {isLoading ? 'Starting...' : 'Confirm & Start'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StartProcessingButton;