// frontend/src/components/upload/ColumnSelector.tsx
import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { UploadedFile } from '@api-types/extraction';

interface ColumnSelectorProps {
  file: UploadedFile;
  idColumn: string | null;
  textColumn: string | null;
  onIdColumnChange: (column: string) => void;
  onTextColumnChange: (column: string) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  file,
  idColumn,
  textColumn,
  onIdColumnChange,
  onTextColumnChange,
}) => {
  const columns = file.preview?.columns || [];
  
  const isValid = useMemo(() => {
    return idColumn && textColumn && idColumn !== textColumn;
  }, [idColumn, textColumn]);

  const previewData = useMemo(() => {
    if (!idColumn || !textColumn || !file.preview?.sampleRows) {
      return [];
    }
    return file.preview.sampleRows.map(row => ({
      id: row[idColumn],
      text: row[textColumn],
    }));
  }, [idColumn, textColumn, file.preview?.sampleRows]);

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Column Selection (CSV)
      </Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>ID Column</InputLabel>
          <Select
            value={idColumn || ''}
            label="ID Column"
            onChange={(e) => onIdColumnChange(e.target.value)}
          >
            <MenuItem value="">
              <em>Select a column</em>
            </MenuItem>
            {columns.map((col) => (
              <MenuItem key={col} value={col}>
                {col}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Text Column</InputLabel>
          <Select
            value={textColumn || ''}
            label="Text Column"
            onChange={(e) => onTextColumnChange(e.target.value)}
          >
            <MenuItem value="">
              <em>Select a column</em>
            </MenuItem>
            {columns.map((col) => (
              <MenuItem key={col} value={col}>
                {col}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {idColumn && textColumn === idColumn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ID Column and Text Column cannot be the same. Please select different columns.
        </Alert>
      )}

      {isValid && previewData.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Preview with selected columns:
          </Typography>
          <TableContainer sx={{ maxHeight: 250 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID ({idColumn})</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Text ({textColumn})</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{String(row.id || '-').substring(0, 30)}</TableCell>
                    <TableCell>{String(row.text || '-').substring(0, 50)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
};

export default ColumnSelector;