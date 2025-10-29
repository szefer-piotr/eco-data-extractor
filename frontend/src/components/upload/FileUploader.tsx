// frontend/src/components/upload/FileUploader.tsx
import React, { useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { fileApi } from '@services/fileApi';

interface FileUploaderProps {
  onFileSelect: (file: File, fileType: 'csv' | 'pdf') => void;
  isLoading?: boolean;
  error?: string | null;
  onErrorClear?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  isLoading = false,
  error = null,
  onErrorClear,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateAndSelect = (file: File) => {
    if (onErrorClear) onErrorClear();

    // Validate file type
    const fileType = fileApi.getFileType(file);
    if (!fileType) {
      // Error handling would go here
      return;
    }

    // Validate file size
    if (!fileApi.validateFileSize(file)) {
      // Error handling would go here
      return;
    }

    onFileSelect(file, fileType);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onErrorClear}>
          {error}
        </Alert>
      )}

      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {isLoading ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">Processing file...</Typography>
          </>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop your file here
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              or click the button below
            </Typography>
            <Button
              variant="contained"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Select File
            </Button>
            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'textSecondary' }}>
              Supported formats: CSV, PDF (Max 100MB)
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default FileUploader;