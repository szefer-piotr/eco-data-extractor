import React, { useEffect, useState } from 'react';
import {
  Button,
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
import type { ComparisonTable } from '../types/synthesis';

const ComparisonPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [table, setTable] = useState<ComparisonTable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    synthesisApi
      .getComparison(projectId)
      .then(setTable)
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

  return (
    <Panel
      title="Comparison table"
      subtitle="ORKG-style evidence matrix across works"
      actions={
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate(`/projects/${projectId}`)}>Back</Button>
          <Button variant="outlined" onClick={exportCsv} disabled={!table}>
            Export CSV
          </Button>
        </Stack>
      }
    >
      {loading || !table ? (
        <CircularProgress />
      ) : (
        <>
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
        </>
      )}
    </Panel>
  );
};

export default ComparisonPage;
