// frontend/src/components/results/ErrorDisplay.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  IconButton,
  Collapse,
  Checkbox,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ExtractionResult } from '@api-types/api';

interface ErrorDisplayProps {
  data: ExtractionResult;
  onRetryRows?: (rowIds: number[]) => Promise<void>;
  showRetryOption?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  data,
  onRetryRows,
  showRetryOption = false,
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [selectedErrors, setSelectedErrors] = useState<Set<number>>(new Set());
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  if (!data.errors || data.errors.length === 0) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ErrorIcon sx={{ color: 'success.main' }} />
            <Typography variant="body2" color="success.main">
              No errors found! All rows processed successfully.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const handleExpandError = (rowId: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedErrors(newExpanded);
  };

  const handleSelectError = (rowId: number) => {
    const newSelected = new Set(selectedErrors);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedErrors(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedErrors.size === data.errors!.length) {
      setSelectedErrors(new Set());
    } else {
      setSelectedErrors(
        new Set(data.errors!.map((err) => err.row_id))
      );
    }
  };

  const handleRetryClick = () => {
    if (selectedErrors.size === 0) {
      setRetryMessage('Please select at least one error to retry');
      return;
    }
    setRetryDialogOpen(true);
  };

  const handleConfirmRetry = async () => {
    if (!onRetryRows) return;

    setIsRetrying(true);
    try {
      await onRetryRows(Array.from(selectedErrors));
      setRetryMessage('Retry completed successfully');
      setRetryDialogOpen(false);
      setSelectedErrors(new Set());
    } catch (error) {
      setRetryMessage(
        `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const failedRows = data.data.filter((row: any, index: number) =>
    data.errors!.some((err) => err.row_id === index)
  );

  return (
    <Card sx={{ border: '2px solid #ef5350' }}>
      <CardHeader
        avatar={<ErrorIcon sx={{ color: 'error.main' }} />}
        title={`Extraction Errors (${data.errors.length} failed)`}
        subheader={`${data.metadata?.failed_rows || 0} out of ${data.metadata?.total_rows || 0} rows failed`}
        sx={{
          backgroundColor: '#ffebee',
          borderBottom: '1px solid #ef5350',
        }}
      />

      <CardContent>
        <Stack spacing={2}>
          {/* Retry Message */}
          {retryMessage && (
            <Alert
              severity={retryMessage.includes('successfully') ? 'success' : 'error'}
              onClose={() => setRetryMessage(null)}
            >
              {retryMessage}
            </Alert>
          )}

          {/* Error Summary */}
          <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 1 }}>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Total Errors
                </Typography>
                <Typography variant="h6" color="error.main">
                  {data.errors.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Error Rate
                </Typography>
                <Typography variant="h6" color="error.main">
                  {(
                    ((data.errors.length) /
                      (data.metadata?.total_rows || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Toolbar */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button
              size="small"
              onClick={handleSelectAll}
            >
              {selectedErrors.size === data.errors.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>

            {showRetryOption && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRetryClick}
                disabled={selectedErrors.size === 0}
                color="warning"
              >
                Retry Selected ({selectedErrors.size})
              </Button>
            )}
          </Stack>

          {/* Error Table */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell padding="checkbox" sx={{ width: 40 }}>
                    <Checkbox
                      onChange={handleSelectAll}
                      checked={selectedErrors.size === data.errors.length}
                      indeterminate={
                        selectedErrors.size > 0 &&
                        selectedErrors.size < data.errors.length
                      }
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Row ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Error Message</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>

              <TableBody>
                {data.errors.map((error) => {
                  const isSelected = selectedErrors.has(error.row_id);
                  const isExpanded = expandedErrors.has(error.row_id);
                  const failedRow = failedRows[error.row_id];

                  return (
                    <React.Fragment key={error.row_id}>
                      <TableRow
                        sx={{
                          backgroundColor: isSelected ? '#ffebee' : 'inherit',
                          '&:hover': {
                            backgroundColor: '#ffcdd2',
                          },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectError(error.row_id)}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={`#${error.row_id}`}
                            size="small"
                            variant="outlined"
                            color="error"
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'error.main',
                            }}
                          >
                            {error.error}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleExpandError(error.row_id)}
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                              }}
                            />
                          </IconButton>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      <TableRow>
                        <TableCell colSpan={4} sx={{ paddingBottom: 0, paddingTop: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Full Error Details
                              </Typography>

                              <Box
                                sx={{
                                  p: 1.5,
                                  backgroundColor: '#ffebee',
                                  border: '1px solid #ef5350',
                                  borderRadius: 1,
                                  mb: 2,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-word',
                                    color: 'error.main',
                                  }}
                                >
                                  {error.error}
                                </Typography>
                              </Box>

                              {failedRow && (
                                <>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Failed Row Data
                                  </Typography>
                                  <Box sx={{ pl: 2 }}>
                                    {Object.entries(failedRow).map(([key, value]) => (
                                      <Typography
                                        key={key}
                                        variant="body2"
                                        sx={{ mb: 0.5 }}
                                      >
                                        <strong>{key}:</strong> {String(value || '-')}
                                      </Typography>
                                    ))}
                                  </Box>
                                </>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>

      {/* Retry Confirmation Dialog */}
      {showRetryOption && (
        <Dialog
          open={retryDialogOpen}
          onClose={() => setRetryDialogOpen(false)}
        >
          <DialogTitle>Confirm Retry</DialogTitle>
          <DialogContent>
            <Typography sx={{ mt: 1 }}>
              Retry processing {selectedErrors.size} failed row(s)?
            </Typography>
            <Typography variant="caption" color="textSecondary">
              This will re-submit these rows to the extraction process.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRetryDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmRetry}
              variant="contained"
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
};

export default ErrorDisplay;