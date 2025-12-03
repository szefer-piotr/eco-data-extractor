// frontend/src/components/results/ResultsTable.tsx
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  IconButton,
  Collapse,
  Stack,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ValidationIcon from '@mui/icons-material/VerifiedUser';
import { ExtractionResult } from '@api-types/api';
import { ExtractionValidation, ValidationProps, CategoryExtraction } from '../validation/ExtractionValidation';

interface ValidationFeedback {
  row_id: string;
  category: string;
  validation_status: 'confirmed' | 'rejected' | 'override';
  user_validated_sentences: number[];
  manual_value?: string;
  notes?: string;
}

interface ResultsTableProps {
  data: ExtractionResult;
  categoryNames: string[];
  onRowClick?: (rowIndex: number) => void;
  showValidation?: boolean;
  jobId?: string;
}

type Order = 'asc' | 'desc';

const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  categoryNames,
  onRowClick,
  showValidation = false,
  jobId,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<string>('_id');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  
  // Validation mode state
  const [validationMode, setValidationMode] = useState(false);
  const [currentRowForValidation, setCurrentRowForValidation] = useState<number | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Derive column names from actual data if available, otherwise use provided categoryNames
  const dynamicColumnNames = useMemo(() => {
    const results = (data.results || data.data || []) as Record<string, unknown>[];
    
    if (results.length === 0) {
      return categoryNames;
    }

    // Extract unique keys from extracted_data across all results
    const columnSet = new Set<string>();
    results.forEach((row: any) => {
      if (row.extracted_data && typeof row.extracted_data === 'object') {
        Object.keys(row.extracted_data).forEach(key => {
          columnSet.add(key);
        });
      }
    });

    return Array.from(columnSet);
  }, [data.results, data.data, categoryNames]);

  // Build error map for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<number, string>();
    if (data.errors) {
      data.errors.forEach((err) => {
        map.set(err.row_id, err.error);
      });
    }
    return map;
  }, [data.errors]);

  // Filter and sort data
  const processedData = useMemo(() => {
    // Use results field first (from backend), fallback to data field (for backward compatibility)
    let filtered = (data.results || data.data || []) as Record<string, unknown>[];

    // Normalize data structure: backend uses row_id, we need _id for consistency
    filtered = filtered.map((row: any) => ({
      ...row,
      _id: row._id || row.id || row.row_id || '',
    }));

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter((row: any) => {
        const rowId = String(row._id || '');
        return rowId.includes(searchFilter);
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data.results, data.data, order, orderBy, searchFilter]);

  // Paginate data
  const paginatedData = useMemo(() => {
    return processedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [processedData, page, rowsPerPage]);

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleRowExpand = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const getRowError = (rowIndex: number): string | undefined => {
    return errorMap.get(rowIndex);
  };

  const isRowError = (rowIndex: number): boolean => {
    return errorMap.has(rowIndex);
  };

  const handleValidationComplete = async (feedback: ValidationFeedback[]) => {
    if (!jobId) {
      setFeedbackMessage({ type: 'error', message: 'Job ID not available' });
      return;
    }

    setSubmittingFeedback(true);
    try {
      // TODO: Replace with actual API call when validation endpoints are ready
      console.log('Submitting validation feedback for job:', jobId, feedback);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFeedbackMessage({ 
        type: 'success', 
        message: `Feedback submitted for row ${feedback[0]?.row_id}` 
      });

      // Move to next row or show success
      if (currentRowForValidation !== null && currentRowForValidation < processedData.length - 1) {
        setCurrentRowForValidation(currentRowForValidation + 1);
        setTimeout(() => setFeedbackMessage(null), 2000);
      } else {
        // All rows validated
        setValidationMode(false);
        setCurrentRowForValidation(null);
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (error) {
      setFeedbackMessage({ 
        type: 'error', 
        message: 'Failed to submit feedback. Please try again.' 
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleStartValidation = () => {
    setValidationMode(true);
    setCurrentRowForValidation(0);
    setFeedbackMessage(null);
  };

  const handleSkipValidation = () => {
    if (currentRowForValidation !== null && currentRowForValidation < processedData.length - 1) {
      setCurrentRowForValidation(currentRowForValidation + 1);
    } else {
      setValidationMode(false);
      setCurrentRowForValidation(null);
    }
  };

  const handleExitValidation = () => {
    setValidationMode(false);
    setCurrentRowForValidation(null);
  };

  // Render validation component if in validation mode
  if (validationMode && currentRowForValidation !== null) {
    const rowData = paginatedData[currentRowForValidation];
    
    // Prepare row data with required structure for validation component
    const validationRowData = {
      row_id: rowData?.row_id || rowData?._id || String(currentRowForValidation),
      extracted_data: rowData?.extracted_data || {},
      enumerated_sentences: rowData?.enumerated_sentences || [],
    } as ValidationProps['rowData'];

    return (
      <Box sx={{ width: '100%' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Validating row {currentRowForValidation + 1} of {processedData.length}
        </Alert>
        
        {feedbackMessage && (
          <Alert severity={feedbackMessage.type} sx={{ mb: 2 }}>
            {feedbackMessage.message}
          </Alert>
        )}

        <ExtractionValidation
          rowData={validationRowData}
          onValidationComplete={handleValidationComplete}
        />

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={handleSkipValidation}
            disabled={submittingFeedback}
          >
            Skip This Row
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleExitValidation}
            disabled={submittingFeedback}
          >
            Exit Validation Mode
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Validation Button Bar */}
      {showValidation && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <ValidationIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Targeted Visual Validation
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Review extraction results and confirm supporting sentences
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleStartValidation}
              sx={{ ml: 'auto' }}
            >
              Start Validation
            </Button>
          </Stack>
        </Box>
      )}

      {feedbackMessage && (
        <Alert severity={feedbackMessage.type} sx={{ mb: 2 }}>
          {feedbackMessage.message}
        </Alert>
      )}

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by Row ID..."
          size="small"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setPage(0); // Reset to first page
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: '100%', maxWidth: 400 }}
        />
      </Box>

      {/* Results Summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Total Rows: <strong>{data.metadata?.total_rows || 0}</strong>
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Processed: <strong>{data.metadata?.processed_rows || 0}</strong>
        </Typography>
        {data.metadata?.failed_rows !== 0 && (
          <Typography variant="body2" color="error">
            Failed: <strong>{data.metadata?.failed_rows || 0}</strong>
          </Typography>
        )}
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell padding="checkbox" sx={{ width: 40 }} />
              <TableCell
                sortDirection={orderBy === '_id' ? order : false}
                sx={{
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                }}
              >
                <TableSortLabel
                  active={orderBy === '_id'}
                  direction={orderBy === '_id' ? order : 'asc'}
                  onClick={() => handleSort('_id')}
                >
                  Row ID
                </TableSortLabel>
              </TableCell>

              {/* Category Columns */}
              {dynamicColumnNames.map((category) => (
                <TableCell
                  key={category}
                  sortDirection={orderBy === category ? order : false}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === category}
                    direction={orderBy === category ? order : 'asc'}
                    onClick={() => handleSort(category)}
                  >
                    {category}
                  </TableSortLabel>
                </TableCell>
              ))}

              {/* Status Column */}
              <TableCell
                sx={{
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  width: 100,
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((row: any, index: number) => {
              const globalIndex = page * rowsPerPage + index;
              const rowError = getRowError(globalIndex);
              const hasError = isRowError(globalIndex);
              const isExpanded = expandedRows.has(globalIndex);
              const rowId = row._id || row.id || globalIndex;

              return (
                <React.Fragment key={globalIndex}>
                  <TableRow
                    sx={{
                      backgroundColor: hasError ? '#ffebee' : 'inherit',
                      '&:hover': {
                        backgroundColor: hasError ? '#ffcdd2' : '#f5f5f5',
                      },
                      cursor: 'pointer',
                    }}
                    onClick={() => onRowClick?.(globalIndex)}
                  >
                    {/* Expand Button */}
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpand(globalIndex);
                        }}
                      >
                        {isExpanded ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>

                    {/* Row ID */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {rowId}
                        </Typography>
                        {hasError && (
                          <WarningIcon sx={{ color: 'error.main', fontSize: 18 }} />
                        )}
                      </Stack>
                    </TableCell>

                    {/* Category Data */}
                    {dynamicColumnNames.map((category) => (
                      <TableCell
                        key={category}
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {/* {String((row.extracted_data as Record<string, any>)?.[category] || '-')} */}
                          {(() => {
                            const cellData = (row.extracted_data as Record<string, any>)?.[category];
                            
                            if (cellData && typeof cellData === 'object' && 'value' in cellData) {
                              const { value, confidence } = cellData;
                              return (
                                <Stack spacing={0.5}>
                                  <Typography variant="body2">{String(value || '-')}</Typography>
                                  {confidence !== undefined && (
                                    <Typography variant="caption" color="textSecondary">
                                      Confidence: {(confidence * 100).toFixed(0)}%
                                    </Typography>
                                  )}
                                </Stack>
                              );
                            }
                            
                            return String(cellData || '-');
                          })()}
                        </Typography>
                      </TableCell>
                    ))}

                    {/* Status */}
                    <TableCell>
                      {hasError ? (
                        <Chip
                          label="Error"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Success"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Details */}
                  <TableRow>
                    <TableCell
                      colSpan={dynamicColumnNames.length + 3}
                      sx={{ paddingBottom: 0, paddingTop: 0 }}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Full Row Details
                          </Typography>

                          {hasError && (
                            <Box
                              sx={{
                                mb: 2,
                                p: 1.5,
                                backgroundColor: '#ffebee',
                                border: '1px solid #ef5350',
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ color: 'error.main', fontWeight: 600 }}
                              >
                                Error: {rowError}
                              </Typography>
                            </Box>
                          )}

                          <Stack spacing={1}>
                            {Object.entries(row).map(([key, value]) => (
                              <Box
                                key={key}
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: '150px 1fr',
                                  gap: 2,
                                  pb: 1,
                                  borderBottom: '1px solid #e0e0e0',
                                }}
                              >
                                <Typography variant="body2" fontWeight={600}>
                                  {key}:
                                </Typography>
                                <Typography variant="body2">
                                  {String(value || '-')}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
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

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={processedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: '1px solid #e0e0e0',
        }}
      />
    </Box>
  );
};

export default ResultsTable;