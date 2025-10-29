import React from 'react';
import { Box, Typography } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Settings page - Coming soon. Configure API keys, providers, and preferences...
      </Typography>
    </Box>
  );
};

export default SettingsPage;