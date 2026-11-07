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
import { useParams } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import ProjectSubnav from '@components/synthesis/ProjectSubnav';
import synthesisApi from '@services/synthesisApi';
import { useUIStore } from '@store/uiStore';
import type { ComparisonTable, ContradictionReport, EvidenceCluster } from '../types/synthesis';

const ComparisonPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const addNotification = useUIStore((s) => s.addNotification);
  const [table, setTable] = useState<ComparisonTable | null>(null);
  const [clusters, setClusters] = useState<EvidenceCluster[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      synthesisApi.getComparison(projectId),
      synthesisApi.listClusters(projectId),
      synthesisApi.listContradictions(projectId),
    ])
      .then(([t, c, ct]) => {
        setTable(t);
        setClusters(c);
        setContradictions(ct);
      })
      .catch((err) => addNotification({ type: 'error', message: err?.message || 'Failed' }))
      .finally(() => setLoading(false));
  }, [projectId]);

  const exportCsv = () => {
    if (!table) return;
    const cols = table.columns;
    const lines = [cols.join(',')];
    for (const row of table.rows) {
      lines.push(
        cols
          .map((c) => {
            const v = row.cells?.[c];
            const s = v == null ? '' : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!projectId) return null;

  return (
    <Panel
      title="Comparison table"
      subtitle="ORKG-style evidence matrix across works"
      actions={
        <Button variant="outlined" onClick={exportCsv} disabled={!table}>
          Export CSV
        </Button>
      }
    >
      <ProjectSubnav projectId={projectId} />

      {loading || !table ? (
        <CircularProgress />
      ) : (
        <Stack spacing={4}>
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Completeness:{' '}
              {Object.entries(table.completeness)
                .slice(0, 6)
                .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
                .join(' · ')}
            </Typography>
            <Paper variant="outlined" sx={{ overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {table.columns.map((c) => (
                      <TableCell key={c}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {table.rows.map((row) => (
                    <TableRow key={row.work_id} hover>
                      {table.columns.map((c) => (
                        <TableCell key={c}>{String(row.cells?.[c] ?? '—')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Evidence clusters ({clusters.length})
            </Typography>
            {clusters.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No clusters yet. Run Extract → Canonicalize → Synthesize first.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {clusters.map((c) => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1} mb={0.5} flexWrap="wrap" useFlexGap>
                      {c.contested && <Chip size="small" color="warning" label="contested" />}
                      <Chip size="small" variant="outlined" label={`${c.n_studies} studies`} />
                      <Chip size="small" variant="outlined" label={`${c.n_assertions} assertions`} />
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {c.subject_label} —{c.predicate}→ {c.object_label}
                    </Typography>
                    {c.synthesis && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {c.synthesis}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                      {Object.entries(c.direction_histogram || {}).map(([dir, count]) => (
                        <Chip key={dir} size="small" label={`${dir}: ${count}`} />
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Contradictions ({contradictions.length})
            </Typography>
            {contradictions.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No contested clusters with contradictions detected.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {contradictions.map((r) => (
                  <Paper key={r.cluster_id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2">{r.summary}</Typography>
                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" color="success" label={`supporting: ${r.supporting.length}`} />
                      <Chip size="small" color="error" label={`opposing: ${r.opposing.length}`} />
                      {r.possible_moderators.map((m) => (
                        <Chip key={m} size="small" variant="outlined" label={`moderator: ${m}`} />
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}
    </Panel>
  );
};

export default ComparisonPage;
