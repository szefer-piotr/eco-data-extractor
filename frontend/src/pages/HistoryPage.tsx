import React from 'react';
import { Box, Typography } from '@mui/material';

const HistoryPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Extraction History
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        History page - Coming soon. View past extraction jobs and results...
      </Typography>
    </Box>
  );
};

export default HistoryPage;