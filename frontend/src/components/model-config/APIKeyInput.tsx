import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useConfigStore } from '@store/configStore';
import { configApi } from '@services/configApi';

interface APIKeyInputProps {
  provider: string;
  onSuccess?: () => void;
}

const APIKeyInput: React.FC<APIKeyInputProps> = ({ provider, onSuccess }) => {
  const { apiKeys, testingConnection, setApiKey, setTestingConnection, setError } = useConfigStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setLocalApiKey] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [hasConfigured, setHasConfigured] = useState(false);

  const isTesting = testingConnection[provider] || false;
  const storedKey = apiKeys[provider];

  // Check if API key is already stored
  useEffect(() => {
    if (storedKey) {
      setHasConfigured(true);
      setLocalApiKey(storedKey);
    }
  }, [storedKey]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'API key cannot be empty',
      });
      return;
    }

    setTestingConnection(provider, true);
    try {
      await configApi.setApiKey(provider, apiKey);
      setApiKey(provider, apiKey);
      setHasConfigured(true);
      setTestResult({
        success: true,
        message: 'API key saved successfully',
      });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save API key';
      setTestResult({
        success: false,
        message,
      });
      setError(message);
    } finally {
      setTestingConnection(provider, false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Stack spacing={2}>
      {/* Status Badge */}
      {hasConfigured && (
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircleIcon sx={{ color: 'success.main' }} />
          <Typography variant="body2" color="success.main" fontWeight={500}>
            API Key Configured
          </Typography>
        </Box>
      )}

      {/* API Key Input */}
      <TextField
        label="API Key"
        type={showPassword ? 'text' : 'password'}
        value={apiKey}
        onChange={(e) => setLocalApiKey(e.target.value)}
        placeholder="Enter your API key"
        fullWidth
        size="small"
        disabled={isTesting}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleTogglePasswordVisibility}
                edge="end"
                size="small"
                disabled={!apiKey}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Test Connection Button */}
      <Button
        variant="outlined"
        onClick={handleSaveApiKey}
        disabled={!apiKey.trim() || isTesting}
        fullWidth
        startIcon={isTesting ? <CircularProgress size={20} /> : undefined}
      >
        {isTesting ? 'Saving...' : 'Save API Key'}
      </Button>

      {/* Test Result */}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
          onClose={() => setTestResult(null)}
          sx={{ mb: 1 }}
        >
          {testResult.message}
        </Alert>
      )}

      {/* Info Message */}
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
        Your API key will be stored securely and used for model inference.
        <br />
        Never share your API key publicly.
      </Typography>
    </Stack>
  );
};

export default APIKeyInput;