// frontend/src/components/results/ResultsExport.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ExtractionResult } from '@api-types/api';

interface ResultsExportProps {
  data: ExtractionResult;
  categoryNames: string[];
  fileName?: string;
}

const ResultsExport: React.FC<ResultsExportProps> = ({
  data,
  categoryNames,
  fileName = 'extraction-results',
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(['_id', ...categoryNames])
  );
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const allColumns = useMemo(() => {
    const columns = new Set<string>();
    columns.add('_id');
    categoryNames.forEach((cat) => columns.add(cat));
    if (data.errors) {
      columns.add('_error');
    }
    return Array.from(columns);
  }, [categoryNames, data.errors]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleColumnToggle = (column: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(column)) {
      newSelected.delete(column);
    } else {
      newSelected.add(column);
    }
    setSelectedColumns(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedColumns.size === allColumns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(allColumns));
    }
  };

  // Build error map
  const errorMap = useMemo(() => {
    const map = new Map<number, string>();
    if (data.errors) {
      data.errors.forEach((err) => {
        map.set(err.row_id, err.error);
      });
    }
    return map;
  }, [data.errors]);

  // Export to CSV
  const exportToCSV = () => {
    setIsExporting(true);

    try {
      const columnArray = Array.from(selectedColumns);

      // Create header
      const header = columnArray.join(',');

      // Create rows
      const rows = (data.results || data.data || []).map((row: any, index: number) => {
        return columnArray
          .map((col) => {
            if (col === '_error') {
              return errorMap.has(index) ? `"${errorMap.get(index)}"` : '';
            }
            if (col === '_id') {
              const value = row._id || row.id || row.row_id || '';
              const stringValue = String(value);
              if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            }
            // For category columns, access from extracted_data
            const value = (row.extracted_data as Record<string, any>)?.[col] || '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(',');
      });

      const csv = [header, ...rows].join('\n');

      // Download
      downloadFile(csv, `${fileName}.csv`, 'text/csv');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to JSON
  const exportToJSON = () => {
    setIsExporting(true);

    try {
      const columnArray = Array.from(selectedColumns);

      const jsonData = (data.results || data.data || []).map((row: any, index: number) => {
        const obj: Record<string, any> = {};
        columnArray.forEach((col) => {
          if (col === '_error') {
            if (errorMap.has(index)) {
              obj[col] = errorMap.get(index);
            }
          } else if (col === '_id') {
            obj[col] = row._id || row.id || row.row_id || null;
          } else {
            // For category columns, access from extracted_data
            obj[col] = (row.extracted_data as Record<string, any>)?.[col] || null;
          }
        });
        return obj;
      });

      const json = JSON.stringify(jsonData, null, 2);

      // Download
      downloadFile(json, `${fileName}.json`, 'application/json');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (selectedColumns.size === 0) {
      alert('Please select at least one column to export');
      return;
    }

    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToJSON();
    }

    // Close dialog after export
    setTimeout(() => {
      setOpenDialog(false);
    }, 500);
  };

  return (
    <>
      {/* Export Button */}
      <Button
        variant="contained"
        startIcon={<FileDownloadIcon />}
        onClick={handleOpenDialog}
        color="primary"
      >
        Export Results
      </Button>

      {/* Export Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Export Results</DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Format Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Export Format
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant={exportFormat === 'csv' ? 'contained' : 'outlined'}
                  onClick={() => setExportFormat('csv')}
                  size="small"
                >
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'contained' : 'outlined'}
                  onClick={() => setExportFormat('json')}
                  size="small"
                >
                  JSON
                </Button>
              </Stack>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {exportFormat === 'csv'
                  ? 'Export as CSV for use in spreadsheet applications'
                  : 'Export as JSON for programmatic processing'}
              </Typography>
            </Box>

            {/* Column Selection */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">Columns to Export</Typography>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                >
                  {selectedColumns.size === allColumns.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <FormGroup sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', p: 1 }}>
                {allColumns.map((column) => (
                  <FormControlLabel
                    key={column}
                    control={
                      <Checkbox
                        checked={selectedColumns.has(column)}
                        onChange={() => handleColumnToggle(column)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {column === '_error' ? 'Error Messages' : column}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>

              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Selected {selectedColumns.size} of {allColumns.length} columns
              </Typography>
            </Box>

            {/* Summary */}
            <Alert severity="info">
              Exporting {(data.results || data.data || []).length} rows with {selectedColumns.size} columns
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={selectedColumns.size === 0 || isExporting}
            startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Helper function to download file
const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

import { useMemo } from 'react';

export default ResultsExport;