import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';
import Panel from '@components/layout/Panel';
import synthesisApi from '@services/synthesisApi';
import { useSynthesisStore } from '@store/synthesisStore';
import { useUIStore } from '@store/uiStore';
import type { Criterion, ExtractionTemplate, ProjectCreate } from '../types/synthesis';

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([]);
  const [form, setForm] = useState<ProjectCreate>({
    name: '',
    question: '',
    peco: emptyPeco,
    review_type: 'mapping',
    template_id: 'uas_biodiversity_v1',
    inclusion_criteria: [],
    exclusion_criteria: [],
  });
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  const selectedTemplate = templates.find((t) => t.id === form.template_id);

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

  const remove = async () => {
    if (!deleteId) return;
    try {
      await synthesisApi.deleteProject(deleteId);
      addNotification({ type: 'success', message: 'Project deleted' });
      setDeleteId(null);
      await load();
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.response?.data?.detail || err?.message || 'Delete failed' });
    }
  };

  const addCriterion = (type: 'inclusion' | 'exclusion', text: string) => {
    if (!text.trim()) return;
    const criterion: Criterion = { description: text.trim() };
    if (type === 'inclusion') {
      setForm({ ...form, inclusion_criteria: [...(form.inclusion_criteria || []), criterion] });
      setNewInclusion('');
    } else {
      setForm({ ...form, exclusion_criteria: [...(form.exclusion_criteria || []), criterion] });
      setNewExclusion('');
    }
  };

  const removeCriterion = (type: 'inclusion' | 'exclusion', index: number) => {
    if (type === 'inclusion') {
      setForm({
        ...form,
        inclusion_criteria: (form.inclusion_criteria || []).filter((_, i) => i !== index),
      });
    } else {
      setForm({
        ...form,
        exclusion_criteria: (form.exclusion_criteria || []).filter((_, i) => i !== index),
      });
    }
  };

  return (
    <Panel title="Evidence Synthesis Projects" subtitle="PECO-scoped literature projects with comparison tables and gaps">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Define a research question, ingest papers, extract assertions, and synthesize evidence.{' '}
          <Button size="small" onClick={() => navigate('/guide')}>
            Read the guide
          </Button>
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
            <Typography color="text.secondary">
              No projects yet.{' '}
              <Button size="small" onClick={() => navigate('/guide#workflow')}>
                See the operator guide
              </Button>{' '}
              to get started.
            </Typography>
          )}
          {projects.map((p) => (
            <Card key={p.id} variant="outlined">
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
                      <Chip size="small" variant="outlined" label={p.review_type} />
                    </Stack>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => {
                    selectProject(p.id);
                    navigate(`/projects/${p.id}`);
                  }}
                >
                  Open
                </Button>
                <IconButton size="small" color="error" onClick={() => setDeleteId(p.id)} aria-label="Delete project">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </CardActions>
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
            {selectedTemplate && (
              <Typography variant="body2" color="text.secondary">
                {selectedTemplate.description}
              </Typography>
            )}
            <TextField
              select
              label="Review type"
              value={form.review_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  review_type: e.target.value as ProjectCreate['review_type'],
                })
              }
              fullWidth
            >
              <MenuItem value="mapping">Mapping</MenuItem>
              <MenuItem value="narrative">Narrative</MenuItem>
              <MenuItem value="meta_analysis_candidate">Meta-analysis candidate</MenuItem>
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
            <Typography variant="subtitle2">Inclusion criteria (optional)</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add inclusion criterion"
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCriterion('inclusion', newInclusion)}
              />
              <Button onClick={() => addCriterion('inclusion', newInclusion)}>Add</Button>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {(form.inclusion_criteria || []).map((c, i) => (
                <Chip key={i} label={c.description} onDelete={() => removeCriterion('inclusion', i)} size="small" />
              ))}
            </Stack>
            <Typography variant="subtitle2">Exclusion criteria (optional)</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add exclusion criterion"
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCriterion('exclusion', newExclusion)}
              />
              <Button onClick={() => addCriterion('exclusion', newExclusion)}>Add</Button>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {(form.exclusion_criteria || []).map((c, i) => (
                <Chip key={i} label={c.description} onDelete={() => removeCriterion('exclusion', i)} size="small" />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!form.name || !form.question}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This will permanently delete the project and all associated data.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Panel>
  );
};

export default ProjectsPage;
