// frontend/src/components/upload/FilePreview.tsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { UploadedFile } from '@api-types/extraction';

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            {file.name}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip label={file.type.toUpperCase()} size="small" variant="outlined" />
            <Chip label={formatFileSize(file.size)} size="small" variant="outlined" />
          </Stack>
        </Box>
        <Button
          startIcon={<ClearIcon />}
          color="error"
          onClick={onRemove}
          variant="outlined"
        >
          Remove
        </Button>
      </Box>

      {file.type === 'csv' && file.preview?.columns && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            CSV Columns:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {file.preview.columns.map((col) => (
              <Chip key={col} label={col} />
            ))}
          </Stack>

          {file.preview.sampleRows && file.preview.sampleRows.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Sample Data (first 5 rows):
              </Typography>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      {file.preview.columns.map((col) => (
                        <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {file.preview.sampleRows.map((row, idx) => (
                      <TableRow key={idx}>
                        {file.preview?.columns?.map((col) => (
                          <TableCell key={`${idx}-${col}`}>
                            {String(row[col] || '-').substring(0, 50)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {file.type === 'pdf' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            PDF File Details:
          </Typography>
          {file.preview?.pageCount && (
            <Typography variant="body2" color="textSecondary">
              Pages: {file.preview.pageCount}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default FilePreview;