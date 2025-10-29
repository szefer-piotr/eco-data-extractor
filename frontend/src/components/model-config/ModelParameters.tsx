import React, { useCallback } from 'react';
import {
  Stack,
  Typography,
  Slider,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import { useConfigStore } from '@store/configStore';

interface ModelParametersProps {
  minTemp?: number;
  maxTemp?: number;
  showAdvanced?: boolean;
  onParametersChange?: (params: any) => void;
}

const ModelParameters: React.FC<ModelParametersProps> = ({
  minTemp = 0,
  maxTemp = 2,
  showAdvanced = false,
  onParametersChange,
}) => {
  const { selectedConfig, setModelParameters } = useConfigStore();
  const [showAdvancedParams, setShowAdvancedParams] = React.useState(showAdvanced);

  const parameters = selectedConfig?.parameters || {
    temperature: 0.7,
  };

  const handleTemperatureChange = useCallback(
    (_: any, value: number | number[]) => {
      const temp = typeof value === 'number' ? value : value[0];
      const newParams = { ...parameters, temperature: temp };
      setModelParameters(newParams);
      onParametersChange?.(newParams);
    },
    [parameters, setModelParameters, onParametersChange]
  );

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tokens = parseInt(e.target.value) || undefined;
    const newParams = { ...parameters, max_tokens: tokens };
    setModelParameters(newParams);
    onParametersChange?.(newParams);
  };

  const handleTopPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const topP = parseFloat(e.target.value) || undefined;
    const newParams = { ...parameters, top_p: topP };
    setModelParameters(newParams);
    onParametersChange?.(newParams);
  };

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
        {/* Temperature */}
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <ThermostatIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600}>
              Temperature
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ ml: 'auto' }}>
              {parameters.temperature.toFixed(2)}
            </Typography>
          </Box>

          <Slider
            value={parameters.temperature}
            onChange={handleTemperatureChange}
            min={minTemp}
            max={maxTemp}
            step={0.1}
            marks={[
              { value: minTemp, label: '0 (Deterministic)' },
              { value: maxTemp, label: `${maxTemp} (Creative)` },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => value.toFixed(1)}
            sx={{
              '& .MuiSlider-markLabel': {
                fontSize: '0.75rem',
              },
            }}
          />

          <Typography variant="caption" color="textSecondary">
            Lower values (0.0) produce deterministic, consistent outputs.
            <br />
            Higher values (2.0) produce more creative and varied outputs.
          </Typography>
        </Stack>
      </Paper>

      {/* Advanced Parameters Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={showAdvancedParams}
            onChange={(e) => setShowAdvancedParams(e.target.checked)}
          />
        }
        label={
          <Typography variant="body2" fontWeight={500}>
            Advanced Parameters
          </Typography>
        }
      />

      {/* Advanced Parameters */}
      {showAdvancedParams && (
        <Paper sx={{ p: 2, backgroundColor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
          <Stack spacing={2}>
            {/* Max Tokens */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={500}>
                Max Tokens
              </Typography>
              <TextField
                type="number"
                value={parameters.max_tokens || ''}
                onChange={handleMaxTokensChange}
                placeholder="Leave empty for default"
                size="small"
                fullWidth
                inputProps={{
                  min: '1',
                  step: '100',
                }}
                helperText="Maximum tokens in the response (optional)"
              />
            </Stack>

            {/* Top P */}
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={500}>
                  Top P (Nucleus Sampling)
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {parameters.top_p?.toFixed(2) || 'Default'}
                </Typography>
              </Box>
              <Slider
                value={parameters.top_p || 1}
                onChange={(_, value) => {
                  const newParams = {
                    ...parameters,
                    top_p: typeof value === 'number' ? value : value[0],
                  };
                  setModelParameters(newParams);
                  onParametersChange?.(newParams);
                }}
                min={0}
                max={1}
                step={0.05}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => value.toFixed(2)}
              />
              <Typography variant="caption" color="textSecondary">
                Controls diversity via nucleus sampling (default: 1.0)
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Parameter Summary */}
      <Box
        sx={{
          p: 1.5,
          backgroundColor: 'success.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'success.200',
        }}
      >
        <Typography variant="caption" color="textSecondary">
          <strong>Current Configuration:</strong>
          <br />
          Temperature: {parameters.temperature.toFixed(1)} |
          {parameters.max_tokens && ` Max Tokens: ${parameters.max_tokens} |`}
          {parameters.top_p && ` Top P: ${parameters.top_p.toFixed(2)}`}
        </Typography>
      </Box>
    </Stack>
  );
};

export default ModelParameters;