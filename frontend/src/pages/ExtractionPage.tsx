import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Alert } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import ExtractionWorkflow from '@components/extraction/ExtractionWorkflow';
import { useExtractionStore } from '@store/extractionStore';

const ExtractionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [jobIdFromUrl, setJobIdFromUrl] = useState<string | null>(null);
  const { reset } = useExtractionStore();

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (jobId) {
      setJobIdFromUrl(jobId);
    } else {
      reset();
    }
  }, [searchParams, reset]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
          Data Extraction Workflow
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Follow the steps below to extract and configure your data
        </Typography>

        {jobIdFromUrl && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Loading previous extraction job: <strong>{jobIdFromUrl}</strong>
          </Alert>
        )}

        <ExtractionWorkflow initialJobId={jobIdFromUrl || undefined} />
      </Box>
    </Container>
  );
};

export default ExtractionPage;