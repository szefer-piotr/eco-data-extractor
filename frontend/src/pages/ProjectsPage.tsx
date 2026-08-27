import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import synthesisApi from '@services/synthesisApi';
import { useSynthesisStore } from '@store/synthesisStore';
import { useUIStore } from '@store/uiStore';
import type { ExtractionTemplate, ProjectCreate } from '../types/synthesis';

const emptyPeco = {
  population: 'Wildlife / target taxa',
  exposure: 'UAS / autonomous monitoring',
  comparator: 'No overflight / alternative method',
  outcome: 'Behaviour, density, or detection metrics',
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, setProjects, selectProject } = useSynthesisStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([]);
  const [form, setForm] = useState<ProjectCreate>({
    name: '',
    question: '',
    peco: emptyPeco,
    review_type: 'mapping',
    template_id: 'uas_biodiversity_v1',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [plist, tlist] = await Promise.all([
        synthesisApi.listProjects(),
        synthesisApi.listTemplates(),
      ]);
      setProjects(plist);
      setTemplates(tlist);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Failed to load projects' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      const project = await synthesisApi.createProject(form);
      addNotification({ type: 'success', message: `Created project ${project.name}` });
      setOpen(false);
      await load();
      selectProject(project.id);
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err?.message || 'Create failed' });
    }
  };

  return (
    <Panel title="Evidence Synthesis Projects" subtitle="PECO-scoped literature projects with comparison tables and gaps">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Define a research question, ingest papers, extract assertions, and synthesize evidence.
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          New project
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={2}>
          {projects.length === 0 && (
            <Typography color="text.secondary">No projects yet. Create one to begin.</Typography>
          )}
          {projects.map((p) => (
            <Card
              key={p.id}
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                selectProject(p.id);
                navigate(`/projects/${p.id}`);
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{p.name}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {p.question}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={p.status} />
                      <Chip size="small" label={`${p.work_count} works`} />
                      <Chip size="small" label={`${p.assertion_count} assertions`} />
                      <Chip size="small" variant="outlined" label={p.template_id} />
                    </Stack>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create evidence synthesis project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Research question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Template"
              value={form.template_id}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              fullWidth
            >
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="subtitle2">PECO</Typography>
            {(['population', 'exposure', 'comparator', 'outcome'] as const).map((key) => (
              <TextField
                key={key}
                label={key}
                value={(form.peco as any)[key] || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    peco: { ...form.peco, [key]: e.target.value },
                  })
                }
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!form.name || !form.question}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Panel>
  );
};

export default ProjectsPage;
