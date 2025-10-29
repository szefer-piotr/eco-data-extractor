import React from 'react';
import { Box, Typography, Card, CardContent, Button, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 2 }}>
        Welcome to EcoData Extractor
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        Extract structured ecological and biological information from unstructured text using AI-powered extraction.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📁 Upload Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Support for CSV and PDF files
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🤖 AI-Powered
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Multiple LLM providers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Configurable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Custom extraction categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Export Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV and JSON formats
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button
        variant="contained"
        size="large"
        onClick={() => navigate('/extraction')}
        sx={{ mr: 2 }}
      >
        Start Extraction
      </Button>
      <Button
        variant="outlined"
        size="large"
        onClick={() => navigate('/history')}
      >
        View History
      </Button>
    </Box>
  );
};

export default HomePage;