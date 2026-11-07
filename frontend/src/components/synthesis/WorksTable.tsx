import React from 'react';
import {
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { Work } from '../../types/synthesis';

const SCREENING_OPTIONS = ['included', 'excluded', 'pending'] as const;

interface WorksTableProps {
  works: Work[];
  onScreeningChange: (workId: string, status: string) => void;
}

const WorksTable: React.FC<WorksTableProps> = ({ works, onScreeningChange }) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [menuWorkId, setMenuWorkId] = React.useState<string | null>(null);

  const openMenu = (event: React.MouseEvent<HTMLElement>, workId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuWorkId(workId);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuWorkId(null);
  };

  const handleScreen = (status: string) => {
    if (menuWorkId) {
      onScreeningChange(menuWorkId, status);
    }
    closeMenu();
  };

  if (works.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No works yet. Upload a CSV or PDF to begin.
      </Typography>
    );
  }

  return (
    <>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>DOI</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Screening</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {works.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.title || w.id.slice(0, 8)}</TableCell>
                <TableCell>{w.year || '—'}</TableCell>
                <TableCell>
                  {w.doi ? (
                    <Typography variant="caption" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                      {w.doi}
                    </Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{w.source_type}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={w.screening_status}
                    color={
                      w.screening_status === 'included'
                        ? 'success'
                        : w.screening_status === 'excluded'
                          ? 'default'
                          : 'warning'
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Change screening status">
                    <IconButton size="small" onClick={(e) => openMenu(e, w.id)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {SCREENING_OPTIONS.map((status) => (
          <MenuItem key={status} onClick={() => handleScreen(status)}>
            Mark as {status}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default WorksTable;
