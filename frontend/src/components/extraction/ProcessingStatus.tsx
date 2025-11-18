// frontend/src/components/extraction/ProcessingStatus.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  LinearProgress,
  Typography,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoIcon from '@mui/icons-material/Info';
import { extractionApi } from '@services/extractionApi';
import { JobStatus } from '@api-types/api';

interface ProcessingStatusProps {
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  pollInterval?: number; // milliseconds
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  jobId,
  onComplete,
  onError,
  pollInterval = 2000,
}) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Fetch job status
  useEffect(() => {
    if (!jobId) return;

    const fetchStatus = async () => {
      try {
        const status = await extractionApi.getStatus(jobId);
        setJobStatus(status);
        setError(null);

        // Initialize start time
        if (!startTime && status.status === 'processing') {
          setStartTime(new Date());
        }

        // Add status log entry
        if (status.status !== jobStatus?.status) {
          setStatusLogs((prev) => [
            ...prev,
            `${new Date().toLocaleTimeString()}: Status changed to ${status.status}`,
          ]);
        }

        // Handle completion
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          setIsLoading(false);
          onComplete?.();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch job status';
        setError(message);
        onError?.(message);
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [jobId, startTime, jobStatus?.status, pollInterval, onComplete, onError]);

  // Calculate estimated time remaining
  const calculateTimeRemaining = (): string | null => {
    if (!jobStatus || jobStatus.total_rows === 0 || jobStatus.status !== 'processing') {
      return null;
    }

    if (!startTime) return null;

    const elapsed = (new Date().getTime() - startTime.getTime()) / 1000; // seconds
    const progressRate = jobStatus.processed_rows / elapsed;
    const remainingRows = jobStatus.total_rows - jobStatus.processed_rows;
    const remainingSeconds = Math.ceil(remainingRows / progressRate);

    if (remainingSeconds < 60) {
      return `${remainingSeconds}s`;
    }
    const minutes = Math.ceil(remainingSeconds / 60);
    return `${minutes}m`;
  };

  const timeRemaining = calculateTimeRemaining();

  // Determine status icon and color
  const getStatusIconAndColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <HourglassEmptyIcon />, color: 'warning' as const };
      case 'processing':
        return { icon: <CircularProgress size={24} />, color: 'info' as const };
      case 'completed':
        return { icon: <CheckCircleIcon />, color: 'success' as const };
      case 'failed':
      case 'cancelled':
        return { icon: <ErrorIcon />, color: 'error' as const };
      default:
        return { icon: <InfoIcon />, color: 'default' as const };
    }
  };

  if (isLoading && !jobStatus) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Loading job status...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error: {error}
      </Alert>
    );
  }

  if (!jobStatus) {
    return (
      <Alert severity="warning">No status information available</Alert>
    );
  }

  const { icon, color } = getStatusIconAndColor(jobStatus.status);
  const progressPercent = jobStatus.total_rows > 0
    ? (jobStatus.processed_rows / jobStatus.total_rows) * 100
    : 0;

  return (
    <Stack spacing={2}>
      <Card>
        <CardHeader
          avatar={icon}
          title="Extraction Progress"
          subheader={`Job ID: ${jobId}`}
        />

        <CardContent>
          <Stack spacing={3}>
            {/* Status Chip */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" fontWeight={600}>
                Status:
              </Typography>
              <Chip
                label={jobStatus.status.toUpperCase()}
                color={color}
                variant="filled"
                size="small"
              />
              {timeRemaining && jobStatus.status === 'processing' && (
                <Chip
                  label={`~${timeRemaining} remaining`}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            {/* Progress Bar */}
            <Box>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">Progress</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Math.round(progressPercent)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>

            {/* Row Statistics */}
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Rows Processed:</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {jobStatus.processed_rows} / {jobStatus.total_rows}
                  </Typography>
                </Box>
                {jobStatus.processed_rows > 0 && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Current Row:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Row #{jobStatus.processed_rows}
                    </Typography>
                  </Box>
                )}
                {jobStatus.status === 'processing' && startTime && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Elapsed Time:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {Math.ceil((new Date().getTime() - startTime.getTime()) / 1000)}s
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Error Message (if any) */}
            {jobStatus.error && (
              <Alert severity="error">{jobStatus.error}</Alert>
            )}

            {/* Status Logs */}
            {statusLogs.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Status Log
                </Typography>
                <Paper sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50' }}>
                  <List dense>
                    {statusLogs.slice(-5).map((log, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <InfoIcon fontSize="small" color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary={log}
                          primaryTypographyProps={{
                            variant: 'caption',
                            sx: { whiteSpace: 'pre-wrap' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            {/* Metadata */}
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    Created:
                  </Typography>
                  <Typography variant="caption">
                    {jobStatus.created_at ? new Date(jobStatus.created_at).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    Last Updated:
                  </Typography>
                  <Typography variant="caption">
                    {jobStatus.updated_at ? new Date(jobStatus.updated_at).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default ProcessingStatus;