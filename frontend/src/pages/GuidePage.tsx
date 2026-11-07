import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Link,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Panel from '@components/layout/Panel';

const capabilities = [
  {
    title: 'PECO-scoped projects',
    description: 'Define Population, Exposure, Comparator, and Outcome for your review question.',
    link: '/projects',
  },
  {
    title: 'Evidence-bound assertions',
    description: 'Extract findings with span provenance tied to source text.',
    link: '/projects',
  },
  {
    title: 'Canonical entities',
    description: 'Normalize taxa and environments to GBIF, ENVO, and local vocabularies.',
    link: '/projects',
  },
  {
    title: 'ORKG-style comparison tables',
    description: 'Matrix view of extracted fields across all works in the corpus.',
    link: '/projects',
  },
  {
    title: 'Gap heatmaps and registers',
    description: 'Coverage, quality, temporal, and contradiction gaps with severity scores.',
    link: '/projects',
  },
  {
    title: 'Grounded Q&A and review drafts',
    description: 'Ask questions with citations, or generate structured review sections.',
    link: '/projects',
  },
  {
    title: 'Hypothesis generation / checking',
    description: 'Generate hypotheses from gaps and contradictions, or check a claim.',
    link: '/projects',
  },
];

const workflowSteps = [
  {
    label: 'Create project',
    description:
      'Go to Projects and create a new project with your research question, PECO scope, and template (e.g. uas_biodiversity_v1).',
  },
  {
    label: 'Upload papers',
    description:
      'Upload CSV abstracts (title, text columns) and/or PDFs (multi-select or a whole folder). Screen works as included, excluded, or pending.',
  },
  {
    label: 'Extract → Canonicalize → Synthesize',
    description:
      'Run the pipeline from the project page. Requires an API key configured in Settings. This extracts assertions, canonicalizes entities, and rebuilds clusters and gaps.',
  },
  {
    label: 'Review pending assertions',
    description:
      'Accept or reject assertions in the review queue. Numeric effect sizes stay queued until a human reviewer approves them.',
  },
  {
    label: 'Open Comparison and Gaps',
    description:
      'Inspect the ORKG-style comparison table, evidence clusters, contradictions, and the gap heatmap.',
  },
  {
    label: 'Q&A, review draft, hypotheses',
    description:
      'Ask grounded questions, generate a review draft, and explore hypotheses from gaps and contradictions.',
  },
];

const developerSetup = `# Local development

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

Open http://localhost:3000 → Projects

# Production (Docker)
export OPENAI_API_KEY=sk-...
docker compose -f docker-compose.evidence.yml up --build

# Pipeline CLI
cd /path/to/eco-data-extractor
PYTHONPATH=backend python -m pipelines.synthesis_runner \\
  --project-id <uuid> \\
  --provider openai \\
  --model gpt-4o-mini \\
  --api-key "$OPENAI_API_KEY"

# Gold-set evaluation
cd backend
pytest app/tests/test_gold_eval.py app/tests/test_synthesis.py -q`;

const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Panel
      title="Evidence Synthesis Operator Guide"
      subtitle="How to turn paper corpora into structured evidence"
      actions={
        <Button variant="contained" onClick={() => navigate('/projects')}>
          Open Projects
        </Button>
      }
    >
      <Box id="workflow">
        <Typography variant="h6" gutterBottom>
          What this feature does
        </Typography>
        <Stack spacing={1.5} mb={4}>
          {capabilities.map((cap, i) => (
            <Box key={cap.title}>
              <Typography variant="subtitle2">
                {i + 1}.{' '}
                <Link component={RouterLink} to={cap.link} underline="hover">
                  {cap.title}
                </Link>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cap.description}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Typography variant="h6" gutterBottom>
          Recommended workflow
        </Typography>
        <Stepper orientation="vertical" activeStep={-1} sx={{ mb: 4 }}>
          {workflowSteps.map((step) => (
            <Step key={step.label} expanded>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        <Typography variant="h6" gutterBottom>
          Review rules
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Numeric effect sizes (Hedges g, Cohen&apos;s d, percent change, etc.) are queued for
          human review before they can be used in meta-analysis. Always verify evidence quotes
          match the source text.
        </Typography>

        <Typography variant="h6" gutterBottom>
          Observability
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          LLM calls are logged with token counts and cost estimates. The project page shows a cost
          summary after extraction. Content-hash caching reduces duplicate LLM calls.
        </Typography>

        <Typography variant="h6" gutterBottom>
          Notes
        </Typography>
        <Stack spacing={0.5} mb={3}>
          <Typography variant="body2" color="text.secondary">
            • Docling is preferred for PDF parsing; PyPDF2 is the fallback.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • SQLite is the default local database; Docker compose uses Postgres.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Human review remains required for numeric effect sizes before meta-analysis use.
          </Typography>
        </Stack>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Developer setup</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'action.hover',
                overflow: 'auto',
                fontSize: '0.8rem',
                m: 0,
              }}
            >
              {developerSetup}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Panel>
  );
};

export default GuidePage;
