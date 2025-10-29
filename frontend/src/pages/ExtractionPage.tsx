// frontend/src/pages/ExtractionPage.tsx
import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import FileUploadWorkflow from '@components/upload/FileUploadWorkflow';

const ExtractionPage: React.FC = () => {
  const handleWorkflowComplete = () => {
    console.log('File upload workflow completed');
    // Next: Navigate to category configuration or extraction
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Data Extraction
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
          Upload your data file (CSV or PDF) to get started with extraction.
        </Typography>

        <FileUploadWorkflow onComplete={handleWorkflowComplete} />
      </Box>
    </Container>
  );
};

export default ExtractionPage;