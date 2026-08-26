import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, alpha, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import ExtractionWorkflow from '@components/extraction/ExtractionWorkflow';
import Panel from '@components/layout/Panel';
import { useExtractionStore } from '@store/extractionStore';
import { brand } from '../theme/theme';

const ExtractionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [jobIdFromUrl, setJobIdFromUrl] = useState<string | null>(null);
  const { reset } = useExtractionStore();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (jobId) {
      setJobIdFromUrl(jobId);
    } else {
      reset();
    }
  }, [searchParams, reset]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Extraction Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload, configure, and run AI-powered data extraction
        </Typography>
      </Box>

      {jobIdFromUrl && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            borderRadius: '12px',
            bgcolor: isDark ? alpha(brand.indigo, 0.12) : alpha(brand.indigo, 0.06),
            border: `1px solid ${alpha(brand.indigo, 0.2)}`,
          }}
        >
          Loading previous extraction job: <strong>{jobIdFromUrl}</strong>
        </Alert>
      )}

      <Panel
        title="Workflow"
        subtitle="Follow the steps to extract your data"
        noPadding
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <ExtractionWorkflow initialJobId={jobIdFromUrl || undefined} />
        </Box>
      </Panel>
    </Box>
  );
};

export default ExtractionPage;
