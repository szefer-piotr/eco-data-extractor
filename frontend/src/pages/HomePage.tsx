import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import Panel from '@components/layout/Panel';
import { gradientText, brand } from '../theme/theme';

interface RecentJob {
  id: string;
  fileName: string;
  status: string;
  date: string;
  rowsProcessed?: number;
}

const features = [
  {
    icon: <UploadFileOutlinedIcon />,
    title: 'Upload Files',
    description: 'CSV and PDF support with instant preview',
    color: '#6366f1',
  },
  {
    icon: <SmartToyOutlinedIcon />,
    title: 'AI-Powered',
    description: 'Multiple LLM providers and flexible models',
    color: '#8b5cf6',
  },
  {
    icon: <TuneOutlinedIcon />,
    title: 'Configurable',
    description: 'Custom extraction categories and prompts',
    color: '#a855f7',
  },
  {
    icon: <TableChartOutlinedIcon />,
    title: 'Export Results',
    description: 'Download as CSV or JSON',
    color: '#06b6d4',
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: 6, pt: { xs: 2, md: 4 } }}>
        <Chip
          label="✨ AI-Powered Ecological Data Extraction"
          sx={{
            mb: 3,
            px: 1,
            py: 2.5,
            fontWeight: 500,
            borderRadius: '99px',
            border: `1px solid ${isDark ? alpha('#ffffff', 0.12) : alpha(brand.indigo, 0.2)}`,
            bgcolor: isDark ? alpha(brand.indigo, 0.1) : alpha(brand.indigo, 0.06),
            color: isDark ? '#c7d2fe' : brand.indigo,
          }}
        />

        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 800,
            mb: 2,
            fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
            lineHeight: 1.15,
          }}
        >
          Extract structured data from{' '}
          <Box component="span" sx={gradientText}>
            unstructured text
          </Box>
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 560, mx: 'auto', fontSize: '1.05rem', lineHeight: 1.7 }}
        >
          EcoData Extractor uses AI to pull ecological and biological information from
          documents — configure categories, pick your model, and export results in seconds.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/extraction')}
            startIcon={<TrendingUpIcon />}
            sx={{ px: 3, py: 1.5, borderRadius: '12px' }}
          >
            Start Extraction
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/history')}
            startIcon={<HistoryIcon />}
            sx={{ px: 3, py: 1.5, borderRadius: '12px' }}
          >
            View History
          </Button>
        </Box>
      </Box>

      {/* Feature cards */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {features.map(({ icon, title, description, color }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isDark
                    ? `0 8px 32px ${alpha(color, 0.15)}`
                    : `0 8px 32px ${alpha(color, 0.12)}`,
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  bgcolor: alpha(color, isDark ? 0.15 : 0.1),
                  color,
                }}
              >
                {icon}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.75 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {description}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Recent jobs + Getting started in Replit-style panels */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={recentJobs.length > 0 ? 7 : 12}>
          <Panel title="Getting Started" subtitle="Complete these steps for your first extraction">
            <Box component="ol" sx={{ pl: 2.5, m: 0 }}>
              {[
                ['Upload your file', 'Start with a CSV or PDF containing the data you want to extract'],
                ['Configure categories', 'Define what information to extract with custom prompts'],
                ['Select LLM provider', 'Choose your preferred AI provider and model'],
                ['Start extraction', 'Monitor progress in real-time as data is processed'],
                ['Export results', 'Download extracted data in CSV or JSON format'],
              ].map(([step, desc], i) => (
                <Box component="li" key={step} sx={{ mb: i < 4 ? 2 : 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {step}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Panel>
        </Grid>

        {loading ? (
          <Grid item xs={12} md={5}>
            <Panel title="Recent Jobs">
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            </Panel>
          </Grid>
        ) : (
          recentJobs.length > 0 && (
            <Grid item xs={12} md={5}>
              <Panel title="Recent Jobs" subtitle="Pick up where you left off">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recentJobs.map((job) => (
                    <Box
                      key={job.id}
                      onClick={() => navigate(`/extraction?jobId=${job.id}`)}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        border: `1px solid ${theme.palette.divider}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        '&:hover': {
                          bgcolor: isDark ? alpha('#ffffff', 0.04) : alpha('#0f172a', 0.03),
                        },
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
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
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Panel>
            </Grid>
          )
        )}
      </Grid>
    </Box>
  );
};

export default HomePage;
