import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
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
  alpha,
  useTheme,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import ProjectSubnav from '@components/synthesis/ProjectSubnav';
import synthesisApi from '@services/synthesisApi';
import { useUIStore } from '@store/uiStore';
import type { GapRecord, Heatmap } from '../types/synthesis';

const GAP_TYPES = ['coverage', 'quality', 'temporal', 'contradiction'] as const;

const GapsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const addNotification = useUIStore((s) => s.addNotification);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');

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

  const filteredGaps = useMemo(() => {
    if (typeFilter === 'all') return gaps;
    return gaps.filter((g) => g.gap_type === typeFilter);
  }, [gaps, typeFilter]);

  const maxVal = heatmap ? Math.max(1, ...heatmap.matrix.flatMap((row) => row)) : 1;

  if (!projectId) return null;

  return (
    <Panel title="Knowledge gaps" subtitle="Coverage, quality, temporal, and contradiction gaps">
      <ProjectSubnav projectId={projectId} />

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
                        {heatmap.matrix[i].map((v, j) => {
                          const intensity = v / maxVal;
                          return (
                            <TableCell
                              key={`${i}-${j}`}
                              align="center"
                              sx={{
                                bgcolor: v
                                  ? alpha('#2e7d32', isDark ? 0.2 + intensity * 0.6 : 0.1 + intensity * 0.5)
                                  : isDark
                                    ? alpha('#ffffff', 0.04)
                                    : alpha('#0f172a', 0.04),
                                color: intensity > 0.5 && v ? '#fff' : 'inherit',
                                fontSize: 12,
                                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                              }}
                            >
                              {v || '·'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          <Box>
            <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
              <Chip
                label="all"
                clickable
                color={typeFilter === 'all' ? 'primary' : 'default'}
                variant={typeFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setTypeFilter('all')}
              />
              {GAP_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  clickable
                  color={typeFilter === t ? 'primary' : 'default'}
                  variant={typeFilter === t ? 'filled' : 'outlined'}
                  onClick={() => setTypeFilter(t)}
                />
              ))}
            </Stack>
            <Typography variant="subtitle1" mb={1}>
              Gap register ({filteredGaps.length})
            </Typography>
            <Stack spacing={1}>
              {filteredGaps.map((g) => (
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
              {filteredGaps.length === 0 && (
                <Typography color="text.secondary">
                  No gaps in this filter. Run Extract → Canonicalize → Synthesize on the project page.
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
