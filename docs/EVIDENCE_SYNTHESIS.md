# Evidence Synthesis Operator Guide

For a step-by-step explanation of inputs, processing, and why each stage exists, see [EVIDENCE_SYNTHESIS_HOW_IT_WORKS.md](EVIDENCE_SYNTHESIS_HOW_IT_WORKS.md).

## What this feature does

Evidence Synthesis Projects turn paper corpora into:

1. PECO-scoped projects
2. Evidence-bound assertions (with span provenance)
3. Canonical entities (GBIF / ENVO / local vocab)
4. ORKG-style comparison tables
5. Gap heatmaps and registers
6. Grounded Q&A and review drafts
7. Hypothesis generation / checking

## Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 → **Projects**.

## Production (Docker)

```bash
export OPENAI_API_KEY=sk-...
docker compose -f docker-compose.evidence.yml up --build
```

- API: http://localhost:8000/docs
- UI: http://localhost:3000
- Postgres: localhost:5432 (`eco` / `eco` / `ecodata`)

## Pipeline CLI

```bash
cd /path/to/eco-data-extractor
PYTHONPATH=backend python -m pipelines.synthesis_runner \
  --project-id <uuid> \
  --provider openai \
  --model gpt-4o-mini \
  --api-key "$OPENAI_API_KEY"
```

## Recommended workflow

1. Create project with PECO + template (`uas_biodiversity_v1`)
2. Upload CSV abstracts and/or PDFs (multi-select or a folder of PDFs)
3. Run **Extract → Canonicalize → Synthesize**
4. Review pending assertions (numeric effects are queued)
5. Open Comparison table and Gaps heatmap
6. Ask Q&A / draft review / generate hypotheses

## PECO examples

- [Insect herbivory and succession predictability](PECO_EXAMPLE_HERBIVORY_SUCCESSION.md) — paste-ready PECO, inclusion rules, and outcome extraction hints.

## Observability

- LLM calls logged in `llm_call_logs` (tokens, cost estimate, cache hits)
- Content-hash cache in `llm_cache`
- Cost endpoint: `GET /api/synthesis/projects/{id}/cost`

## Gold-set evaluation

```bash
cd backend
pytest app/tests/test_gold_eval.py app/tests/test_synthesis.py -q
```

Expand `app/tests/gold/uas_biodiversity_gold.json` to 40–50 double-annotated papers for CI quality gates.

## Notes

- Docling is preferred for PDF parsing; PyPDF2 is the fallback if Docling is unavailable.
- SQLite is the default local DB; compose uses Postgres.
- Human review remains required for numeric effect sizes before meta-analysis use.
