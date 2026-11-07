# How the Evidence Synthesis Operator Works

This document explains the pipeline in detail: what inputs look like, how they are processed, and why each step exists.

The design idea is simple: a spreadsheet of extracted fields is not enough. You also need a formal review question, sentence-level provenance, shared names for the same species/habitat/platform across papers, and a structure you can query later. That is what this operator adds.

For how to run it locally, see [EVIDENCE_SYNTHESIS.md](EVIDENCE_SYNTHESIS.md).

---

## The big picture

Think of one research question as a **project**. Everything lives inside that project: papers, extracted claims, entities, clusters, gaps, and hypotheses.

The recommended run is:

**Create project (PECO + template) → Upload papers → Extract → Canonicalize → Synthesize → Review numbers → Compare / Gaps / Q&A / Hypotheses**

You can trigger the middle three steps from the UI (**Extract → Canonicalize → Synthesize**) or from the CLI (`pipelines/synthesis_runner.py`), which does:

1. Extract assertions
2. Canonicalize entities
3. Build clusters + detect gaps
4. Report LLM cost

---

## Step 0 — Define the project (the “what are we even asking?” step)

### What you put in

A project is created with something like:

```json
{
  "name": "UAS monitoring",
  "question": "How do drones affect wildlife?",
  "peco": {
    "population": "wildlife",
    "exposure": "UAS overflight",
    "comparator": "no overflight",
    "outcome": "vigilance"
  },
  "inclusion_criteria": [],
  "exclusion_criteria": [],
  "review_type": "mapping",
  "template_id": "uas_biodiversity_v1"
}
```

**PECO** is a standard environmental-evidence framing:

- **Population** — who/what is studied (e.g. wildlife, polar bears)
- **Exposure** — the stressor or method (e.g. drone overflight)
- **Comparator** — the baseline (optional; e.g. no overflight)
- **Outcome** — what is measured (e.g. vigilance, density)

A **template** tells the extractor *which kinds of claims and fields matter*. Two are built in:

| Template | Domain | Typical predicates |
|---|---|---|
| `uas_biodiversity_v1` | Drone/robot wildlife monitoring | `affects`, `detects`, `monitors`, `outperforms`, … |
| `protected_area_v1` | Protected-area effectiveness | `protects`, `increases`, `decreases`, … |

The UAS template also lists the columns you eventually want in the comparison table: platform, sensor, taxon, biome, study design, response variable, direction, effect size, sample size, location.

### Why this step exists

Without a scoped question, an LLM will extract *everything interesting* from every paper. PECO + template keep extraction aligned with one review question, and make later papers comparable. The project starts in status `scoping`.

---

## Step 1 — Ingest papers (turn files into “works” + sentence spans)

### What you put in

Three input shapes:

1. **A single abstract / work** — JSON with `title`, `abstract`, optional `doi`, `year`, `authors`.
2. **A CSV of abstracts** — rows with columns like `title`, `abstract`/`text`, optional `id`, `doi`, `year`, `authors`. Empty text rows are skipped. Duplicate DOI (or title+authors) rows are skipped.
3. **PDFs** — one file, multi-select, or a folder. Non-PDFs are ignored.

### How it is processed

**PDF text.** Docling is tried first (better layout → markdown). If Docling is missing or fails, PyPDF2 extracts and cleans text.

**Metadata.** If a DOI or title is present, Crossref is queried (best-effort) to fill authors, year, venue, DOI.

**Deduping (CSV).** A key of `doi:…` or `ta:{normalized title}|{authors}` prevents the same paper being ingested twice in one upload.

**Span building.** The raw text is split into **addressable sentences**. That is the provenance unit later claims will point at.

How spans are built (`backend/app/services/synthesis/windowing.py`):

1. Scan line by line for section headers: Abstract, Introduction, Methods, Results, Discussion, Conclusion.
2. If no headers are found (typical for a short abstract), the whole text is one section (`abstract` for CSV/abstracts, `other` for PDFs).
3. Split each section into sentences.
4. Store each sentence as a **span**:

```json
{
  "id": "uuid",
  "section": "results",
  "para_idx": 2,
  "sent_idx": 0,
  "char_start": 412,
  "char_end": 501,
  "quote": "The drone survey showed a significant increase in vigilance (n = 12)."
}
```

`char_start` / `char_end` are character offsets in the original document, so a quote can be highlighted later.

The persisted **work** looks like:

- identity: title, DOI, year, authors, venue
- text: `abstract` and/or `full_text`
- `source_type`: `abstract` | `pdf` | `csv_row`
- `screening_status`: currently set to **`included` on ingest** (you can later mark a work excluded)
- child **spans**

After CSV upload, project status becomes `screening`.

### Why this step exists

You cannot trust a claim like “drones increase vigilance” unless you can point at the exact sentence. Spans are that pointing system. Section labels also matter later: a “measured result” that only cites the Discussion is treated as suspicious.

---

## Step 2 — Windowing + cheap screening (don’t send the whole paper to the LLM)

Extraction does **not** dump an entire PDF into one prompt.

### What goes in

All **included** works in the project (optionally a subset of `work_ids`). For each work, its spans in reading order.

### How it is processed

**Windowing.** Spans are grouped **within a section** into overlapping chunks of about **500 words**, with a **2-sentence overlap** so a finding that straddles two windows is not lost.

A window looks like:

```json
{
  "window_id": "uuid",
  "section": "results",
  "spans": [],
  "text": "sentence1 sentence2 …",
  "start_sent": 0,
  "end_sent": 11
}
```

The `spans` array holds the consecutive sentence spans that make up that window (typically on the order of 8–20 sentences).

**Screener heuristic (no LLM).** A window is skipped unless it looks like it contains findings. It must have at least 20 words **and** match cues such as: *result, find, significant, increase, decrease, effect, showed, observ, detect, p <, CI, n =, compared*.

So Methods boilerplate and reference lists tend not to be sent to the model. Results/Discussion with actual findings are.

### Why this step exists

Long Results sections are where effect sizes hide. Sending the whole paper is expensive, noisy, and easy for the model to skip. Windows keep context local. The cheap screener saves money and reduces invented claims from empty background text.

---

## Step 3 — Assertion extraction (the LLM turns a window into claims)

This is the only step that **must** call an LLM.

### What the model sees

A prompt (`PROMPT_VERSION = assertion_v1`) containing:

- template name and **allowed predicates**
- project **PECO**
- field list (platform, sensor, taxon, biome, …)
- the window’s sentences, **numbered**:

```
[1] The drone survey showed a significant increase in vigilance (n = 12).
[2] Detection probability was estimated at 0.8.
```

Rules in the prompt (paraphrased):

- Extract only what is in the text; do not invent.
- Every claim needs a verbatim quote and sentence numbers.
- `measured_result` only for the study’s own findings (prefer Results).
- Discussion interpretations → `author_inference`.
- Citing other papers → `cited_from_other_work`.
- If a number is extracted, copy it as `effect.verbatim`.
- JSON only.

### What the model is supposed to return

```json
{
  "assertions": [
    {
      "subject": { "surface": "multirotor UAS", "entity_type": "platform" },
      "predicate": "increases",
      "object": { "surface": "vigilance", "entity_type": "response_variable" },
      "qualifiers": {
        "platform": "multirotor_uas",
        "sensor": null,
        "taxon": [{ "surface": "polar bear" }],
        "environment": [{ "surface": "arctic" }],
        "location": { "surface": "Svalbard" },
        "study_design": "observational",
        "sample_size": "12",
        "response_variable": "vigilance"
      },
      "direction": "increase",
      "effect": { "metric": "other", "value": null, "verbatim": "n = 12" },
      "epistemic_status": "measured_result",
      "polarity": "supports",
      "evidence": [{ "sentence_numbers": [1], "quote": "The drone survey showed…" }],
      "rationale": "Results sentence reports an increase in vigilance.",
      "is_inferred": false,
      "confidence": 0.85
    }
  ]
}
```

If the window has no findings: `{"assertions": []}`.

### How the raw LLM text is turned into database rows

1. Parse JSON (if the model wraps extra text, a `{…}` regex fallback is used).
2. Map `sentence_numbers` (1-based) onto the window’s spans so each evidence item gets a real `span_id`, section, and character offsets.
3. Fill defaults (`predicate` → `affects`, `direction` → `not_applicable`, etc.).
4. Build a human-readable `verbalized` string, e.g. `multirotor UAS increases vigilance; increase; observational`.
5. Stamp `extractor_model`, `prompt_version`, and a `run_id` so you can reproduce a run.

Calls go through **LLMGateway**: SHA-256 cache on `(model, prompt_version, prompt)`, retries with backoff, and logging of tokens/cost into `llm_call_logs`. Repeating the same window is cheap (cache hit).

Project status becomes `extracting`.

### Why this step exists

The atomic unit of synthesis is not “a paper” and not “a spreadsheet cell”. It is a **claim**: *who did what to whom, in which direction, with which quote*. That is a subject–predicate–object triple plus qualifiers (taxon, biome, design, …), direction, optional effect size, and epistemic status (measured vs inferred vs cited).

---

## Step 4 — Guards (machine checks before anything is trusted)

Every parsed assertion is run through **deterministic** checks against the source text (`work.full_text` or `abstract`).

| Failure code | Meaning |
|---|---|
| `missing_evidence` | No quote at all |
| `span_mismatch` | Quote is not in the source (whitespace-normalized) |
| `invalid_direction` | Not in increase / decrease / no_effect / mixed / not_applicable |
| `invalid_epistemic_status` | Unknown status label |
| `invalid_study_design` | Not in the allowed design list |
| `invalid_predicate` | Predicate not in the template |
| `effect_missing_verbatim` | A number was extracted but no exact substring |
| `effect_verbatim_not_in_source` | The “verbatim” number is not actually in the paper |
| `measured_result_from_discussion_only` | Claimed as a measured result, but all quotes are from Discussion |
| `invalid_confidence` | Confidence outside 0–1 |

### Who goes to the human review queue

`needs_human_review` is true if:

- any guard failed, **or**
- confidence < 0.6, **or**
- an effect **value** was extracted (any numeric effect size)

Otherwise the assertion is auto-**accepted**.

Numeric effects are *always* queued. That is intentional: you do not want a model’s `0.65` quietly entering a meta-analysis.

### Why this step exists

LLMs invent quotes and numbers. Guards are not another model; they are string/schema checks. Failed or numeric claims stay `pending` until a person accepts, edits, or rejects them.

---

## Step 5 — Canonicalize (make “drone”, “UAV”, and “UAS” the same thing)

Extraction leaves **surface forms** (“polar bears”, “drone”, “arctic tundra”). Comparison would then split the same concept across many rows.

### What goes in

All assertions in the project. For each, the subject, object, and qualifier mentions (platform, environment, taxon).

### How it is processed

1. Infer a type if missing (e.g. subject mentioning “drone/UAS/UAV” → `platform`).
2. Normalize the label (`"  Polar Bears "` → `"polar bears"`).
3. Reuse an existing entity in this project if the label matches an alias.
4. Otherwise ground it:
   - **Taxon** → GBIF species match (`GBIF:12345`, scientific name).
   - **Biome / environment** → local ENVO alias table (`arctic` → `ENVO:01000179` “arctic biome”). This is offline, not a live ontology API.
   - **Platform** → local aliases (`drone` / `uas` / `uav` / `quadcopter` → `multirotor_uas`).
5. Write `canonical_id` and `canonical_label` back onto the mention.
6. Refresh `verbalized` using canonical labels.

### Why this step exists

If paper A says “UAV” and paper B says “multirotor drone”, a comparison table without canonicalization treats them as different platforms. Gap detection would also be wrong. This step is the “same thing, same ID” layer.

---

## Step 6 — Synthesize: comparison table + evidence clusters

Triggered as **rebuild-synthesis** (or CLI step 3).

### Comparison table (ORKG-style)

**Input:** works + assertions with review status `accepted`, `edited`, or `pending`.

**Shape:** one **row per work**, columns:

`title, year, platform, sensor, target_taxon, biome, study_design, response_variable, direction, effect_size, sample_size, location, epistemic_status`

Fields are filled from assertion qualifiers (first non-empty wins). Completeness is “fraction of rows with this column filled”.

This is the living spreadsheet of the review: not a one-off CSV export, but a table derived from assertions.

**Why:** humans synthesize by lining papers up. This materializes that matrix so occupancy, gaps, and Q&A can use the same structure.

### Evidence clusters

**Input:** only `accepted` and `edited` assertions (pending claims do **not** enter clusters).

Assertions are grouped by:

`(canonical subject, predicate, canonical object, study_design)`

Each cluster stores:

- number of studies and assertions
- direction histogram (`increase: 3, no_effect: 1`, …)
- a short synthesis sentence
- `contested = true` if directions disagree (increase vs decrease / no_effect, etc.)

**Why:** one paper saying “increase” and another saying “no effect” is a scientific signal, not a table glitch. Clusters are the “what does the literature say about this specific relationship?” object.

Contradiction reports then split supporting vs opposing assertion IDs and guess **moderators** if study designs or biomes differ across the cluster.

---

## Step 7 — Gap detection

**Input:** the comparison table + contested clusters.

Gaps are occupancy over a 4D cube:

**platform × taxon × biome × response variable**

Four kinds:

| Type | What it means | Typical severity |
|---|---|---|
| **Coverage** | Combination of known axis values never appears together (e.g. multirotor × cattle × arctic × vigilance) | 0.4–0.7 |
| **Quality** | That combination has only **one** study | 0.5 |
| **Temporal** | No papers in the last two years of the corpus (and latest year < 2024) | 0.6 |
| **Contradiction** | Contested cluster | 0.8 |

Each gap stores a description, axis values, a **suggested research angle** (e.g. “Test whether multirotor_uas affects vigilance in cattle within arctic biome”), and supporting stats. Coverage gaps are capped at 40 (highest severity first) so the register stays usable.

The **heatmap** is a simpler 2D view: platform × taxon, cell = number of studies.

**Why:** a comparison table shows what *is* studied. Gaps are the empty cells that *should* exist given what the literature already talks about. That is how you go from “we extracted papers” to “here is what to study next”.

---

## Downstream products (same evidence base, different questions)

These do **not** re-read PDFs. They read assertions, clusters, and the comparison table.

### Grounded Q&A

You send a query plus a mode (or the system infers it):

| Mode | Trigger | What happens |
|---|---|---|
| **aggregate** | “how many”, “count”, “proportion” | Counts from the comparison table (works, designs, platforms; special case for BACI) |
| **verify** | “does”, “is it true”, “support”, “refute” | Best-matching cluster → verdict: supported / mixed / refuted |
| **lookup** | explicit lookup | Token match on titles/authors, else span search; returns quotes + assertion citations |
| **synthesize** / **review_section** | default | Top clusters + worst gaps, with citations |

Answers include citations (`assertion_id` / `work_id` / quote), confidence, an assembly trace (which retriever ran), and **overclaim flags** (words like *proves*, *causes*, *always*, *never*).

**Why:** Q&A that is not bound to stored claims will hallucinate. This router answers from the project’s own table and clusters.

### Review draft

For each requested section (introduction, methods, results, gaps, conclusion), it asks the synthesizer a section-specific prompt, then builds a **bibliography** from cited works.

**Why:** a first draft of a mapping/narrative review that is mechanically tied to evidence IDs, not a free-form essay.

### Hypotheses

**Generate** (up to 20, de-duplicated by statement text):

1. From **gaps** — use the suggested research angle.
2. From **analogy** — platform effect seen in taxon A, untested in taxon B.
3. From **contradictions** — “disagreement is explained by moderator X”.

Each hypothesis gets rough scores (novelty, plausibility, testability, feasibility).

**Check** a user statement: run verify-mode Q&A, parse the verdict, attach evidence for/against, optionally narrow the statement to the matched cluster.

**Temporal validation** (research metric): hold out post-cutoff years and ask what fraction of coverage-gap cells later appear. Only meaningful if the corpus is actually split in time.

**Why:** gaps and contradictions are already structured hypotheses. This step writes them down and lets you test a claim against the current evidence base.

---

## Observability and human role

- Every LLM call is logged (`stage`, tokens, estimated USD, cache hit).
- `GET /api/synthesis/projects/{id}/cost` rolls this up by stage.
- Temperature defaults to **0** so extraction is as deterministic as the model allows.
- **People still own:** PECO, template choice, inclusion/exclusion, and **all numeric effect sizes**.

---

## End-to-end example (one abstract)

**Input CSV row:**  
`Polar bears, Drone overflights increased vigilance behaviour in polar bears.`

1. Ingest → one work, a few spans in section `abstract`.
2. Window → one small window; screener sees “increased” → send to LLM.
3. Extract → assertion: UAS / `increases` / vigilance, taxon polar bear, direction increase, quote from sentence [1].
4. Guards → quote matches source; if no numeric `value`, high confidence → auto-accept; if `value` is set → pending review.
5. Canonicalize → “drone” → `multirotor_uas`; “polar bears” → GBIF taxon if the lookup hits.
6. Comparison → one row: platform multirotor, taxon polar bear, direction increase.
7. Clusters / gaps → one cluster; other platforms×taxa you already know about may show as coverage gaps.
8. Q&A “Does UAS increase vigilance?” → verify against that cluster → “supported” with citation.

That is the operator: **papers in, evidence-bound claims out, then tables, gaps, and questions that can only answer from those claims.**
