import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Alert,
  FormControlLabel,
  Switch,
  Container,
  Divider,
  Stack,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useConfigStore } from '@store/configStore';
import { useUIStore } from '@store/uiStore';

interface APIKeyState {
  provider: string;
  key: string;
  visible: boolean;
}

const SettingsPage: React.FC = () => {
  const { apiKeys, setApiKey, removeApiKey, models } = useConfigStore();
  const { addNotification } = useUIStore();
  const [apiKeyInputs, setApiKeyInputs] = useState<APIKeyState[]>([]);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem('autoRefresh') !== 'false');
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState('5');

  useEffect(() => {
    // Initialize API key inputs from available providers
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
        addNotification({
          type: 'success',
          message: `API key for ${provider} removed`,
        });
      } else {
        setApiKey(provider, key);
        addNotification({
          type: 'success',
          message: `API key for ${provider} saved`,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to save API key for ${provider}`,
      });
    }
  };

  const handleToggleVisibility = (provider: string) => {
    setApiKeyInputs((prev) =>
      prev.map((item) =>
        item.provider === provider ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', JSON.stringify(checked));
    addNotification({
      type: 'success',
      message: 'Theme preference updated',
    });
  };

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    localStorage.setItem('autoRefresh', JSON.stringify(checked));
    addNotification({
      type: 'success',
      message: 'Auto-refresh setting updated',
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Settings
        </Typography>

        {/* API Keys Section */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title="API Keys & Providers" subheader="Configure your LLM provider credentials" />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {apiKeyInputs.map((item) => (
                <Paper key={item.provider} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {item.provider}
                    </Typography>
                    {apiKeys[item.provider] && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Configured"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      type={item.visible ? 'text' : 'password'}
                      placeholder={`Enter ${item.provider} API key`}
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
                      sx={{ flex: 1 }}
                      aria-label={`API key for ${item.provider}`}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleToggleVisibility(item.provider)}
                      sx={{ mt: 0.5 }}
                      aria-label={item.visible ? 'Hide API key' : 'Show API key'}
                    >
                      {item.visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* User Preferences Section */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title="User Preferences" subheader="Customize your experience" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={darkMode} onChange={(e) => handleDarkModeToggle(e.target.checked)} />}
                label="Dark Mode (Coming soon)"
              />
              <FormControlLabel
                control={<Switch checked={autoRefresh} onChange={(e) => handleAutoRefreshToggle(e.target.checked)} />}
                label="Auto-refresh Job Status"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Performance Settings Section */}
        <Card>
          <CardHeader title="Performance" subheader="Configure system behavior" />
          <Divider />
          <CardContent>
            <TextField
              label="Max Concurrent Jobs"
              type="number"
              inputProps={{ min: 1, max: 10 }}
              value={maxConcurrentJobs}
              onChange={(e) => setMaxConcurrentJobs(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              helperText="Maximum number of extraction jobs to run simultaneously"
              sx={{ mb: 2 }}
              aria-label="Maximum concurrent jobs"
            />
            <Alert severity="info">
              These settings will be applied on your next extraction job.
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SettingsPage;