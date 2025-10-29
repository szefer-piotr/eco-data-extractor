import React, { useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import { useConfigStore } from '@store/configStore';
import { configApi } from '@services/configApi';

interface ProviderSelectorProps {
  onProviderChange?: (provider: string) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ onProviderChange }) => {
  const {
    models,
    selectedConfig,
    isLoading,
    error,
    setModels,
    setSelectedProvider,
    setError,
  } = useConfigStore();

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await configApi.getModels();
        setModels(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load models';
        setError(message);
      }
    };

    if (!models) {
      loadModels();
    }
  }, [models, setModels, setError]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    onProviderChange?.(provider);
  };

  if (isLoading && !models) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error && !models) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const providers = models?.providers ? Object.entries(models.providers) : [];

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel id="provider-select-label">LLM Provider</InputLabel>
        <Select
          labelId="provider-select-label"
          id="provider-select"
          value={selectedConfig?.provider || ''}
          onChange={(e) => handleProviderChange(e.target.value)}
          label="LLM Provider"
          disabled={!models}
        >
          {providers.map(([key, provider]) => (
            <MenuItem key={key} value={key}>
              {provider.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Provider Info */}
      {selectedConfig?.provider && models?.providers[selectedConfig.provider] && (
        <Box
          sx={{
            p: 2,
            backgroundColor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <StorageIcon fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                {models.providers[selectedConfig.provider].name}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              Available Models: {models.providers[selectedConfig.provider].models.length}
            </Typography>
            {models.providers[selectedConfig.provider].requires_api_key && (
              <Typography
                variant="caption"
                sx={{ color: 'info.main', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                🔑 Requires API Key
              </Typography>
            )}
            {!models.providers[selectedConfig.provider].requires_api_key && (
              <Typography
                variant="caption"
                sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                ✓ No API Key Required (Local)
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default ProviderSelector;