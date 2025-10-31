// frontend/src/components/extraction/ExtractionWorkflow.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  Typography,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ProcessingStatus from './ProcessingStatus';
import StartProcessingButton from './StartProcessingButton';
import CancelButton from './CancelButton';
import FileUploadWorkflow from '../upload/FileUploadWorkflow';
import ExtractionCategoryPanel from '../categories/ExtractionCategoryPanel';
import ModelConfiguration from '../model-config/ModelConfiguration';
import { useExtractionStore } from '@store/extractionStore';
import { useUIStore } from '@store/uiStore';
import { useConfigStore } from '@store/configStore';
import { extractionApi } from '@services/extractionApi';
import { JobStatus } from '@api-types/api';
import ResultsViewer from '../results/ResultViewer';

interface ExtractionWorkflowProps {
  onComplete?: () => void;
  compact?: boolean; // If true, skip stepper and show components sequentially
  initialJobId?: string;
}

const ExtractionWorkflow: React.FC<ExtractionWorkflowProps> = ({
  onComplete,
  compact = false,
  initialJobId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const { jobId, reset: resetExtraction } = useExtractionStore();
  const { isConfigComplete } = useConfigStore();
  const { addNotification } = useUIStore();

  // Load initial job if provided
  useEffect(() => {
    if (initialJobId && !jobId) {
      // TODO: Load the initial job from the extraction store or API
      // For now, we'll just move to the processing step
      setActiveStep(3);
    }
  }, [initialJobId, jobId]);

  const steps = [
    'Upload File',
    'Configure Categories',
    'Model Configuration',
    'Extract & Monitor',
    'View Results',
  ];

  const canProceed = (): boolean => {
    switch (activeStep) {
      case 0: // File Upload
        return false; // Handled by child component
      case 1: // Categories
        return true; // Can proceed even with no categories for testing
      case 2: // Model Config
        return isConfigComplete();
      case 3: // Processing
        return !!jobId;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleJobStart = (newJobId: string) => {
    setActiveStep(3); // Move to processing step
  };

  const handleProcessingComplete = () => {
    // Move to results step
    setActiveStep(4);
    addNotification({
      type: 'success',
      message: 'Extraction completed! View your results below.',
    });
  };

  const handleProcessingError = (error: string) => {
    setWorkflowError(error);
    addNotification({
      type: 'error',
      message: error,
    });
  };

  const handleReset = () => {
    resetExtraction();
    setActiveStep(0);
    setJobStatus(null);
    setWorkflowError(null);
  };

  // Step Components
  const stepContent: Record<number, React.ReactNode> = {
    0: (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Step 1: Upload File
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Upload a CSV or PDF file to begin data extraction.
        </Typography>
        <FileUploadWorkflow onComplete={handleNext} />
      </Box>
    ),

    1: (
      <Box>
        <ExtractionCategoryPanel />
        <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ChevronLeftIcon />}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ChevronRightIcon />}
          >
            Next: Model Configuration
          </Button>
        </Stack>
      </Box>
    ),

    2: (
      <Box>
        <ModelConfiguration onConfigComplete={handleNext} compact={true} />
        <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ChevronLeftIcon />}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isConfigComplete()}
            endIcon={<ChevronRightIcon />}
          >
            Next: Start Extraction
          </Button>
        </Stack>
      </Box>
    ),

    3: (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Step 4: Extract & Monitor
        </Typography>
        {!jobId ? (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Review your configuration and start the extraction process.
            </Typography>
            <Paper sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Configuration Summary
                </Typography>
                {/* Summary would go here */}
                <Typography variant="caption" color="textSecondary">
                  Ready to start extraction with configured settings
                </Typography>
              </Stack>
            </Paper>
            <StartProcessingButton onJobStart={handleJobStart} />
          </>
        ) : (
          <>
            <ProcessingStatus
              jobId={jobId}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
              pollInterval={2000}
            />
            <Box sx={{ mt: 2 }}>
              <CancelButton jobId={jobId} jobStatus={jobStatus} />
            </Box>
          </>
        )}
      </Box>
    ),

    4: (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Step 5: View Results
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Your extraction is complete. Review and download your results.
        </Typography>
        <ResultsViewer jobId={jobId || undefined} />
        <Alert severity="success" sx={{ mb: 2 }}>
          Extraction completed successfully! Results are ready for download.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ChevronLeftIcon />}
          >
            Back to Extraction
          </Button>
          <Button
            variant="contained"
            onClick={handleReset}
          >
            Start New Extraction
          </Button>
        </Stack>
      </Box>
    ),
  };

  if (compact) {
    // Compact view without stepper
    return (
      <Stack spacing={2}>
        {workflowError && (
          <Alert severity="error" onClose={() => setWorkflowError(null)}>
            {workflowError}
          </Alert>
        )}
        {stepContent[activeStep]}
      </Stack>
    );
  }

  // Full view with stepper
  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider />

          {/* Error Display */}
          {workflowError && (
            <Alert severity="error" onClose={() => setWorkflowError(null)}>
              {workflowError}
            </Alert>
          )}

          {/* Step Content */}
          {stepContent[activeStep]}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ExtractionWorkflow;