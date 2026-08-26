import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AddIcon from '@mui/icons-material/Add';
import { useUIStore } from '@store/uiStore';
import Panel from '@components/layout/Panel';
import { brand } from '../theme/theme';

interface HistoryJob {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rowsProcessed?: number;
  totalRows?: number;
  categories: number;
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { addNotification } = useUIStore();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('jobHistory');
      if (stored) {
        setJobs(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load job history:', err);
      addNotification({ type: 'error', message: 'Failed to load job history' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleConfirmDelete = () => {
    if (selectedJob) {
      const updatedJobs = jobs.filter((j) => j.id !== selectedJob.id);
      setJobs(updatedJobs);
      localStorage.setItem('jobHistory', JSON.stringify(updatedJobs));
      addNotification({ type: 'success', message: `Job "${selectedJob.fileName}" deleted` });
      setDeleteDialogOpen(false);
      setSelectedJob(null);
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Extraction History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and manage past extraction jobs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/extraction')}
          sx={{ borderRadius: '10px', flexShrink: 0 }}
        >
          New Extraction
        </Button>
      </Box>

      <Panel title="All Jobs" subtitle={`${jobs.length} job${jobs.length !== 1 ? 's' : ''}`} noPadding>
        {jobs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: '12px',
                bgcolor: isDark ? alpha(brand.indigo, 0.1) : alpha(brand.indigo, 0.06),
                border: `1px solid ${alpha(brand.indigo, 0.15)}`,
              }}
            >
              No extraction jobs yet.{' '}
              <Button onClick={() => navigate('/extraction')} size="small" sx={{ ml: 1 }}>
                Start a new extraction
              </Button>
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Upload Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Rows</TableCell>
                  <TableCell align="right">Categories</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: isDark ? alpha('#ffffff', 0.03) : alpha('#0f172a', 0.02),
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {job.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(job.uploadDate).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {job.rowsProcessed && job.totalRows
                          ? `${job.rowsProcessed}/${job.totalRows}`
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{job.categories}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/extraction?jobId=${job.id}`)}
                        aria-label="View job"
                        sx={{ color: brand.indigo }}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedJob(job);
                          setDeleteDialogOpen(true);
                        }}
                        aria-label="Delete job"
                        sx={{ color: 'error.main', ml: 0.5 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Job?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedJob?.fileName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryPage;
