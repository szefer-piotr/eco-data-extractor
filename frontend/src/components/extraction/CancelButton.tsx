// frontend/src/components/extraction/CancelButton.tsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { extractionApi } from '@services/extractionApi';
import { useUIStore } from '@store/uiStore';
import { JobStatus } from '@api-types/api';

interface CancelButtonProps {
  jobId: string;
  jobStatus?: JobStatus | null;
  onCancelled?: () => void;
  onError?: (error: string) => void;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

const CancelButton: React.FC<CancelButtonProps> = ({
  jobId,
  jobStatus,
  onCancelled,
  onError,
  variant = 'outlined',
  size = 'medium',
  color = 'error',
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useUIStore();

  // Check if job can be cancelled
  const canCancel =
    jobStatus &&
    (jobStatus.status === 'pending' || jobStatus.status === 'processing');

  const handleCancelClick = () => {
    if (!canCancel) {
      addNotification({
        type: 'warning',
        message: `Job cannot be cancelled in ${jobStatus?.status} state`,
      });
      return;
    }
    setOpenDialog(true);
    setError(null);
  };

  const handleConfirmCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await extractionApi.cancelJob(jobId);

      addNotification({
        type: 'success',
        message: 'Extraction job cancelled successfully',
      });

      setOpenDialog(false);
      onCancelled?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
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
        color={color}
        onClick={handleCancelClick}
        disabled={!canCancel || isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : <StopIcon />}
      >
        {isLoading ? 'Cancelling...' : 'Cancel Extraction'}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Extraction?</DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to cancel this extraction job?
          </Typography>

          <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
            Job ID: <strong>{jobId}</strong>
          </Typography>

          {jobStatus && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Current Status: <strong>{jobStatus.status}</strong>
              <br />
              Progress: <strong>{jobStatus.processed_rows} / {jobStatus.total_rows}</strong> rows
            </Alert>
          )}

          <Alert severity="warning">
            This action cannot be undone. The extraction will stop and any partial results will be discarded.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isLoading}>
            Keep Extraction
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {isLoading ? 'Cancelling...' : 'Yes, Cancel Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CancelButton;