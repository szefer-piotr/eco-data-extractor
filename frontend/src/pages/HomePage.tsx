import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, Paper, Chip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';

interface RecentJob {
  id: string;
  fileName: string;
  status: string;
  date: string;
  rowsProcessed?: number;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent jobs from localStorage (or API if implemented)
    const loadRecentJobs = () => {
      try {
        const stored = localStorage.getItem('recentJobs');
        if (stored) {
          setRecentJobs(JSON.parse(stored).slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load recent jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecentJobs();
  }, []);

  const handleQuickStart = () => {
    navigate('/extraction');
  };

  const handleViewJob = (jobId: string) => {
    navigate(`/extraction?jobId=${jobId}`);
  };

  return (
    <Box sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome to EcoData Extractor
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem' }}>
          Extract structured ecological and biological information from unstructured text using AI-powered extraction.
        </Typography>
      </Box>

      {/* Feature Cards */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📁 Upload Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Support for CSV and PDF files with automatic preview
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🤖 AI-Powered
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Multiple LLM providers with flexible model selection
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Configurable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define custom extraction categories and prompts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Export Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Download results in CSV and JSON formats
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CTA Section */}
      <Box sx={{ mb: 6 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleQuickStart}
          startIcon={<TrendingUpIcon />}
          sx={{ mr: 2, mb: { xs: 2, sm: 0 } }}
        >
          Start Extraction
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/history')}
          startIcon={<HistoryIcon />}
        >
          View History
        </Button>
      </Box>

      {/* Recent Jobs Section */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        recentJobs.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Recent Jobs
            </Typography>
            <Grid container spacing={2}>
              {recentJobs.map((job) => (
                <Grid item xs={12} sm={6} md={4} key={job.id}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 2 },
                      transition: 'box-shadow 0.3s',
                    }}
                    onClick={() => handleViewJob(job.id)}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {job.fileName}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {job.date}
                      </Typography>
                      <Chip
                        label={job.status}
                        size="small"
                        color={job.status === 'completed' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )
      )}

      {/* Getting Started Guide */}
      <Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Getting Started
        </Typography>
        <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
          <Box component="ol" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Upload your file:</strong> Start with a CSV or PDF containing the data you want to extract
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Configure categories:</strong> Define what information you want to extract with custom prompts
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Select LLM provider:</strong> Choose your preferred AI provider and model
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Start extraction:</strong> Monitor progress in real-time as data is processed
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Export results:</strong> Download your extracted data in your preferred format
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default HomePage;