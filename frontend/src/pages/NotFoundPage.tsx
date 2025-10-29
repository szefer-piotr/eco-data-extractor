import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 2 }}>
        404
      </Typography>
      <Typography variant="h6" gutterBottom sx={{ mb: 4, color: 'text.secondary' }}>
        Page not found
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
      >
        Go Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;