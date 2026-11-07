import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
  IconButton,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useConfigStore } from '@store/configStore';
import { useUIStore } from '@store/uiStore';
import { useThemeMode } from '@context/ThemeModeContext';
import { configApi } from '@services/configApi';
import Panel from '@components/layout/Panel';
import { brand } from '../theme/theme';

interface APIKeyState {
  provider: string;
  key: string;
  visible: boolean;
}

const SettingsPage: React.FC = () => {
  const { apiKeys, setApiKey, removeApiKey, models, isLoading, error, hasProviderApiKey } = useConfigStore();
  const { addNotification } = useUIStore();
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [apiKeyInputs, setApiKeyInputs] = useState<APIKeyState[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem('autoRefresh') !== 'false');
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState('5');

  useEffect(() => {
    if (models?.providers) {
      const providers = Object.keys(models.providers);
      setApiKeyInputs(
        providers.map((provider) => ({
          provider,
          key: apiKeys[provider] || '',
          visible: false,
        }))
      );
    }
  }, [models, apiKeys]);

  const handleSaveAPIKey = async (provider: string, key: string) => {
    try {
      if (!key.trim()) {
        removeApiKey(provider);
        addNotification({ type: 'success', message: `API key for ${provider} removed` });
      } else {
        await configApi.setApiKey(provider, key);
        setApiKey(provider, key);
        addNotification({ type: 'success', message: `API key for ${provider} saved` });
      }
    } catch {
      addNotification({ type: 'error', message: `Failed to save API key for ${provider}` });
    }
  };

  const handleToggleVisibility = (provider: string) => {
    setApiKeyInputs((prev) =>
      prev.map((item) =>
        item.provider === provider ? { ...item, visible: !item.visible } : item
      )
    );
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure API keys and preferences
        </Typography>
      </Box>

      <Stack spacing={2.5}>
        <Panel title="API Keys & Providers" subtitle="Configure your LLM provider credentials">
          <Stack spacing={2}>
            {isLoading && apiKeyInputs.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Loading providers…
                </Typography>
              </Box>
            ) : error && apiKeyInputs.length === 0 ? (
              <Alert severity="error">{error}</Alert>
            ) : apiKeyInputs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No providers available. Start the backend to load provider options.
              </Typography>
            ) : (
              apiKeyInputs.map((item) => {
                const fromEnv = Boolean(models?.providers[item.provider]?.has_api_key) && !apiKeys[item.provider];
                const configured = hasProviderApiKey(item.provider);
                return (
                <Box
                  key={item.provider}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: isDark ? alpha('#ffffff', 0.02) : alpha('#f8fafc', 0.8),
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {models?.providers[item.provider]?.name || item.provider}
                    </Typography>
                    {configured && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={
                          models?.providers[item.provider]?.requires_api_key === false
                            ? 'No key required'
                            : fromEnv
                              ? 'Configured from .env'
                              : 'Configured'
                        }
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  {models?.providers[item.provider]?.requires_api_key !== false && (
                    <>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      type={item.visible ? 'text' : 'password'}
                      placeholder={
                        fromEnv
                          ? 'Leave blank to keep the key from .env'
                          : `Enter ${item.provider} API key`
                      }
                      value={item.key}
                      onChange={(e) =>
                        setApiKeyInputs((prev) =>
                          prev.map((i) =>
                            i.provider === item.provider ? { ...i, key: e.target.value } : i
                          )
                        )
                      }
                      size="small"
                      fullWidth
                      aria-label={`API key for ${item.provider}`}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleToggleVisibility(item.provider)}
                      aria-label={item.visible ? 'Hide API key' : 'Show API key'}
                    >
                      {item.visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSaveAPIKey(item.provider, item.key)}
                    >
                      Save
                    </Button>
                    {apiKeys[item.provider] && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setApiKeyInputs((prev) =>
                            prev.map((i) =>
                              i.provider === item.provider ? { ...i, key: '' } : i
                            )
                          );
                          removeApiKey(item.provider);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                    </>
                  )}
                </Box>
                );
              })
            )}
          </Stack>
        </Panel>

        <Panel title="Preferences" subtitle="Customize your experience">
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                />
              }
              label="Dark mode"
            />
            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => {
                    setAutoRefresh(e.target.checked);
                    localStorage.setItem('autoRefresh', JSON.stringify(e.target.checked));
                    addNotification({ type: 'success', message: 'Auto-refresh setting updated' });
                  }}
                />
              }
              label="Auto-refresh job status"
            />
          </Stack>
        </Panel>

        <Panel title="Performance" subtitle="Configure system behavior">
          <TextField
            label="Max concurrent jobs"
            type="number"
            inputProps={{ min: 1, max: 10 }}
            value={maxConcurrentJobs}
            onChange={(e) => setMaxConcurrentJobs(e.target.value)}
            size="small"
            fullWidth
            helperText="Maximum number of extraction jobs to run simultaneously"
            sx={{ mb: 2 }}
            aria-label="Maximum concurrent jobs"
          />
          <Alert
            severity="info"
            sx={{
              borderRadius: '10px',
              bgcolor: isDark ? alpha(brand.indigo, 0.1) : alpha(brand.indigo, 0.06),
            }}
          >
            These settings will be applied on your next extraction job.
          </Alert>
        </Panel>
      </Stack>
    </Box>
  );
};

export default SettingsPage;
