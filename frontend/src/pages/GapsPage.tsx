import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import synthesisApi from '@services/synthesisApi';
import { useUIStore } from '@store/uiStore';
import type { GapRecord, Heatmap } from '../types/synthesis';

const GapsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([synthesisApi.listGaps(projectId), synthesisApi.getHeatmap(projectId)])
      .then(([g, h]) => {
        setGaps(g);
        setHeatmap(h);
      })
      .catch((err) => addNotification({ type: 'error', message: err?.message || 'Failed' }))
      .finally(() => setLoading(false));
  }, [projectId]);

  const maxVal = heatmap
    ? Math.max(1, ...heatmap.matrix.flatMap((row) => row))
    : 1;

  return (
    <Panel
      title="Knowledge gaps"
      subtitle="Coverage, quality, temporal, and contradiction gaps"
      actions={<Button onClick={() => navigate(`/projects/${projectId}`)}>Back</Button>}
    >
      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={3}>
          {heatmap && (
            <Box>
              <Typography variant="subtitle1" mb={1}>
                Occupancy heatmap ({heatmap.row_axis} × {heatmap.col_axis})
              </Typography>
              <Paper variant="outlined" sx={{ overflow: 'auto', p: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      {heatmap.cols.map((c) => (
                        <TableCell key={c} sx={{ fontSize: 11, maxWidth: 80 }}>
                          {c}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {heatmap.rows.map((r, i) => (
                      <TableRow key={r}>
                        <TableCell sx={{ fontSize: 11 }}>{r}</TableCell>
                        {heatmap.matrix[i].map((v, j) => (
                          <TableCell
                            key={`${i}-${j}`}
                            align="center"
                            sx={{
                              bgcolor: `rgba(46, 125, 50, ${v / maxVal})`,
                              color: v / maxVal > 0.5 ? '#fff' : 'inherit',
                              fontSize: 12,
                            }}
                          >
                            {v || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" mb={1}>
              Gap register ({gaps.length})
            </Typography>
            <Stack spacing={1}>
              {gaps.map((g) => (
                <Paper key={g.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Chip size="small" label={g.gap_type} />
                    <Chip size="small" variant="outlined" label={`severity ${g.severity.toFixed(2)}`} />
                  </Stack>
                  <Typography variant="body2">{g.description}</Typography>
                  {g.suggested_research_angle && (
                    <Typography variant="caption" color="text.secondary">
                      Angle: {g.suggested_research_angle}
                    </Typography>
                  )}
                </Paper>
              ))}
              {gaps.length === 0 && (
                <Typography color="text.secondary">
                  No gaps yet. Run Extract → Canonicalize → Synthesize on the project page.
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </Panel>
  );
};

export default GapsPage;
