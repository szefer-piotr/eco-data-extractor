import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useConfigStore } from '@store/configStore';

interface ModelSelectorProps {
  onModelChange?: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const { models, selectedConfig, setSelectedModel } = useConfigStore();

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    onModelChange?.(model);
  };

  const currentProvider = selectedConfig?.provider;
  const availableModels = currentProvider && models?.providers[currentProvider]
    ? models.providers[currentProvider].models
    : [];

  const isDisabled = !currentProvider || availableModels.length === 0;

  return (
    <Stack spacing={2}>
      <FormControl fullWidth disabled={isDisabled}>
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={selectedConfig?.model || ''}
          onChange={(e) => handleModelChange(e.target.value)}
          label="Model"
        >
          {availableModels.map((model) => (
            <MenuItem key={model} value={model}>
              {model}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Model Info */}
      {selectedConfig?.model && currentProvider && (
        <Box
          sx={{
            p: 2,
            backgroundColor: 'primary.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <TuneIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={600} color="primary">
                {selectedConfig.model}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              Provider: {models?.providers[currentProvider].name}
            </Typography>
            
            {/* Model Capabilities Tags */}
            <Box display="flex" gap={1} flexWrap="wrap" pt={1}>
              <Chip
                label="Text Generation"
                size="small"
                variant="outlined"
                color="primary"
              />
              {selectedConfig.model.includes('vision') && (
                <Chip
                  label="Vision"
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              {(selectedConfig.model.includes('4o') || selectedConfig.model.includes('3')) && (
                <Chip
                  label="Advanced"
                  size="small"
                  variant="outlined"
                  color="success"
                />
              )}
            </Box>
          </Stack>
        </Box>
      )}

      {isDisabled && (
        <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
          {!currentProvider
            ? 'Select a provider first'
            : 'No models available for this provider'}
        </Typography>
      )}
    </Stack>
  );
};

export default ModelSelector;