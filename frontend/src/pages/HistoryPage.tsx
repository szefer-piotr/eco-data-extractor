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
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import { useUIStore } from '@store/uiStore';

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
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { addNotification } = useUIStore();

  useEffect(() => {
    // Load jobs from localStorage
    const loadJobs = () => {
      try {
        const stored = localStorage.getItem('jobHistory');
        if (stored) {
          setJobs(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load job history:', err);
        addNotification({
          type: 'error',
          message: 'Failed to load job history',
        });
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [addNotification]);

  const handleView = (job: HistoryJob) => {
    navigate(`/extraction?jobId=${job.id}`);
  };

  const handleDeleteClick = (job: HistoryJob) => {
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedJob) {
      const updatedJobs = jobs.filter((j) => j.id !== selectedJob.id);
      setJobs(updatedJobs);
      localStorage.setItem('jobHistory', JSON.stringify(updatedJobs));
      addNotification({
        type: 'success',
        message: `Job "${selectedJob.fileName}" deleted`,
      });
      setDeleteDialogOpen(false);
      setSelectedJob(null);
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Extraction History
        </Typography>

        {jobs.length === 0 ? (
          <Alert severity="info">
            No extraction jobs yet.{' '}
            <Button onClick={() => navigate('/extraction')} sx={{ ml: 1 }}>
              Start a new extraction
            </Button>
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: '100%' }}>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Upload Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    Rows
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    Categories
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.fileName}</TableCell>
                    <TableCell>{new Date(job.uploadDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      {job.rowsProcessed && job.totalRows ? `${job.rowsProcessed}/${job.totalRows}` : '—'}
                    </TableCell>
                    <TableCell align="right">{job.categories}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleView(job)}
                        variant="text"
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(job)}
                        variant="text"
                        color="error"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Job?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the job "{selectedJob?.fileName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HistoryPage;