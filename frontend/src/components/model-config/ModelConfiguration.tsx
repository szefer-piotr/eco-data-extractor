import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyIcon from '@mui/icons-material/Key';
import TuneIcon from '@mui/icons-material/Tune';
import ProviderSelector from './ProviderSelector';
import ModelSelector from './ModelSelector';
import APIKeyInput from './APIKeyInput';
import ModelParameters from './ModelParameters';
import { useConfigStore } from '@store/configStore';

interface ModelConfigurationProps {
  onConfigComplete?: (config: any) => void;
  showStepper?: boolean;
  compact?: boolean;
}

const ModelConfiguration: React.FC<ModelConfigurationProps> = ({
  onConfigComplete,
  showStepper = true,
  compact = false,
}) => {
  const {
    models,
    selectedConfig,
    apiKeys,
    isConfigComplete,
    getProviderInfo,
  } = useConfigStore();

  const [activeStep, setActiveStep] = useState(0);

  const currentProvider = selectedConfig?.provider;
  const providerRequiresKey = currentProvider && getProviderInfo(currentProvider)?.requires_api_key;
  const hasApiKey = currentProvider && apiKeys[currentProvider];

  const steps = ['Provider', 'Model', 'API Key', 'Parameters'];

  const canProceedToModel = Boolean(currentProvider);
  const canProceedToApiKey = canProceedToModel && Boolean(selectedConfig?.model);
  const canProceedToParameters = providerRequiresKey ? (canProceedToApiKey && hasApiKey) : canProceedToApiKey;

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

  const handleProviderChange = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    }
  };

  const handleModelChange = () => {
    if (activeStep === 1) {
      if (providerRequiresKey) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
    }
  };

  const handleApiKeySuccess = () => {
    setActiveStep(3);
  };

  const isComplete = isConfigComplete();

  if (compact) {
    // Compact view without stepper
    return (
      <Stack spacing={2}>
        <ProviderSelector onProviderChange={handleProviderChange} />

        {canProceedToModel && (
          <>
            <Divider />
            <ModelSelector onModelChange={handleModelChange} />
          </>
        )}

        {canProceedToApiKey && providerRequiresKey && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <KeyIcon fontSize="small" />
                API Key
              </Typography>
              <APIKeyInput provider={currentProvider} onSuccess={handleApiKeySuccess} />
            </Stack>
          </>
        )}

        {canProceedToParameters && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TuneIcon fontSize="small" />
                Parameters
              </Typography>
              <ModelParameters />
            </Stack>
          </>
        )}

        {/* Validation Summary */}
        <Paper sx={{ p: 2, backgroundColor: isComplete ? 'success.50' : 'warning.50' }}>
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              {isComplete ? (
                <>
                  <CheckCircleIcon sx={{ color: 'success.main' }} />
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    Configuration Complete ✓
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" fontWeight={600} color="warning.dark">
                  ⚠ Configuration Incomplete
                </Typography>
              )}
            </Box>
            {!isComplete && (
              <Typography variant="caption" color="textSecondary">
                {!currentProvider && 'Select a provider'}
                {currentProvider && !selectedConfig?.model && ' → Select a model'}
                {canProceedToApiKey && !hasApiKey && providerRequiresKey && ' → Configure API key'}
                {canProceedToParameters && ' → Configure parameters'}
              </Typography>
            )}
          </Stack>
        </Paper>

        <Button
          variant="contained"
          fullWidth
          disabled={!isComplete}
          onClick={() => onConfigComplete?.(selectedConfig)}
        >
          Use This Configuration
        </Button>
      </Stack>
    );
  }

  // Full view with stepper
  return (
    <Card>
      <CardHeader
        avatar={<SettingsIcon />}
        title="Model Configuration"
        subheader="Configure your LLM provider and parameters"
      />

      <CardContent>
        <Stack spacing={3}>
          {/* Stepper */}
          {showStepper && (
            <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 2 }}>
              {steps.map((label, index) => {
                let isStepDisabled = false;
                if (index === 1) isStepDisabled = !canProceedToModel;
                if (index === 2) isStepDisabled = !canProceedToApiKey;
                if (index === 3) isStepDisabled = !canProceedToParameters;

                return (
                  <Step key={label} disabled={isStepDisabled}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          )}

          {/* Step Content */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Step 1: Select Provider
              </Typography>
              <ProviderSelector onProviderChange={handleProviderChange} />
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Step 2: Select Model
              </Typography>
              <ModelSelector onModelChange={handleModelChange} />
            </Box>
          )}

          {activeStep === 2 && providerRequiresKey && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Step 3: Configure API Key
              </Typography>
              <APIKeyInput provider={currentProvider} onSuccess={handleApiKeySuccess} />
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Step {providerRequiresKey ? '4' : '3'}: Model Parameters
              </Typography>
              <ModelParameters />
            </Box>
          )}

          {/* Validation Alert */}
          {!isComplete && activeStep === steps.length - 1 && (
            <Alert severity="info">
              Configuration review: All required fields are set. You're ready to extract data!
            </Alert>
          )}

          {isComplete && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Configuration complete! All required settings are configured.
            </Alert>
          )}

          {/* Configuration Summary */}
          {(activeStep === steps.length - 1 || !showStepper) && (
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Configuration Summary
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Provider:</Typography>
                  <Chip
                    label={models?.providers[currentProvider!]?.name || 'Not selected'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Model:</Typography>
                  <Chip
                    label={selectedConfig?.model || 'Not selected'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                {providerRequiresKey && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">API Key:</Typography>
                    <Chip
                      label={hasApiKey ? '✓ Configured' : '✗ Not configured'}
                      size="small"
                      color={hasApiKey ? 'success' : 'error'}
                      variant="filled"
                    />
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Temperature:</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedConfig?.parameters.temperature.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Navigation Buttons */}
          <Box display="flex" gap={1} justifyContent="space-between">
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>

            <Button
              onClick={handleNext}
              variant="contained"
              disabled={
                activeStep === steps.length - 1 ||
                (activeStep === 0 && !canProceedToModel) ||
                (activeStep === 1 && !canProceedToApiKey) ||
                (activeStep === 2 && !canProceedToParameters)
              }
            >
              {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </Box>

          {/* Final Action Button */}
          {isComplete && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={() => onConfigComplete?.(selectedConfig)}
            >
              Save Configuration & Continue
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ModelConfiguration;