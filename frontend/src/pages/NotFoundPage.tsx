import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { gradientText } from '../theme/theme';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Typography
        variant="h1"
        component="h1"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '5rem', md: '7rem' },
          lineHeight: 1,
          mb: 2,
          ...gradientText,
        }}
      >
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        This page doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        startIcon={<HomeOutlinedIcon />}
        sx={{ borderRadius: '12px', px: 3 }}
      >
        Back to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
