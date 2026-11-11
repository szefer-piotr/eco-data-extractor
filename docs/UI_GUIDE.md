# Using EcoData Extractor

The sidebar has two working paths:

- **Extraction** pulls fields you define out of a CSV or PDF and lets you download a table.
- **Projects** runs an evidence-synthesis review: one research question, a set of papers, claims tied back to the source text, then comparison, gaps, and hypotheses.

Save an API key in **Settings** before either path calls a hosted model. Open **Settings**, paste the key for the provider you will use, and click **Save**. A green **Configured** chip means the key is stored. A local Ollama provider does not need a key. The app also accepts a key that is already set in the server environment.

The provider and model used by a synthesis run are the ones last chosen in Extraction’s model step. Until you choose one, the project page uses **openai / gpt-4o-mini**. The chip next to the project counts shows the pair that will actually run.

---

## Extraction

Open **Extraction** from the sidebar, or **Start Extraction** on the home page. A stepper across the top lists the five steps: **Upload File**, **Configure Categories**, **Model Configuration**, **Extract & Monitor**, **View Results**.

### 1. Upload a file

Drag a file onto the drop zone, or use **Select File** / **Select PDF Folder**.

- **CSV.** After the preview, **Next** opens **Configure Columns**. Pick an **ID Column** and a **Text Column**. They must be different columns. The text column is the passage the model reads (an abstract, a paragraph, a methods note). **Continue to Categories** moves on.
- **One PDF.** Preview the page count, then **Next**. There is no column step.
- **A folder of PDFs.** **Select PDF Folder** keeps only `.pdf` files. The preview shows how many were found. **Next** skips the column step. Each file must be 100 MB or smaller.

### 2. Configure categories

Each category is one column in the result. Click **Add Category**.

- **Category Name** is the column header, for example `Species`, `Location`, or `Study design`. Names are limited to 50 characters.
- **Prompt Template** is filled in from the name. It must contain the placeholder `{text}`. That placeholder is replaced with the row or document text. You can rewrite the prompt; the limit is 2000 characters.
- **Expected Values** is optional. Add values the model should prefer (for example `increase`, `decrease`, `no effect`) and press **Add**.

Click **Add Category** in the dialog to save it. Use the edit and delete icons on a card to change or remove it. The **Prompt Preview** tab shows the prompt that will be sent; it stays disabled until at least one category exists.

You can click **Next: Model Configuration** with an empty list, but **Start Extraction** stays disabled until there is at least one category.

### 3. Model configuration

Work down the form:

1. Choose a **provider** (OpenAI, Google, DeepSeek, Ollama, and any others the backend reports).
2. Choose a **model**.
3. If the provider needs a key, enter it and save it. A key already saved in **Settings** counts.
4. Set **Temperature**. Lower values (near 0) keep answers more stable. Advanced fields for max tokens and top-p are optional.

When the summary says **Configuration Complete**, click **Use This Configuration** or **Next: Start Extraction**.

### 4. Extract and monitor

Click **Start Extraction**. If anything is missing, the button lists what to fix (no file, missing CSV columns, no categories, or an unfinished model setup).

The confirmation dialog shows the file, the CSV columns when relevant, the categories, and the model. Check the confirmation box and start the job. A progress view polls the job. **Cancel** stops it while it is still running. When the job finishes, the workspace moves to results.

### 5. View and export results

**Extraction Results** is a table: one row per CSV record or document, one column per category. Expand a row to see the source sentences the value was taken from. If some rows failed, an **Errors** tab lists them.

The download action opens an export dialog. Choose **CSV** or **JSON**, tick the columns you want (including `_id` and, when present, `_error`), and download.

**Start New Extraction** clears the workspace and returns to upload. **Back to Extraction** returns to the monitor step.

### History

**History** lists extraction jobs stored in this browser. The eye icon reopens `/extraction` for that job id. The trash icon removes the entry from this browser’s list. **New Extraction** starts a fresh run.

---

## Evidence synthesis

Open **Projects** from the sidebar, or **Evidence Synthesis** on the home page. A project is one review question. Papers, claims, clusters, gaps, and hypotheses all stay inside that project.

Inside a project, the buttons **Overview**, **Comparison**, **Gaps**, and **Hypotheses** switch views. **Guide** opens the shorter in-app operator notes.

### 1. Create a project

Click **New project**. **Create** stays disabled until both a name and a research question are filled in.

| Field | What to enter |
|---|---|
| Project name | A short label you will recognize in the list. |
| Research question | The question the review is trying to answer. |
| Template | **Autonomous Biodiversity Monitoring** (`uas_biodiversity_v1`) for drone, robot, or UAS wildlife studies. **Protected Area Effectiveness** (`protected_area_v1`) for terrestrial protected areas. The template decides which claims and table columns are extracted. |
| Review type | **Mapping**, **Narrative**, or **Meta-analysis candidate**. |
| PECO | **Population** (who or what is studied), **Exposure** (the stressor or method), **Comparator** (the baseline; optional), **Outcome** (what is measured). The form starts with UAS monitoring placeholders; replace them with your question. |
| Inclusion / exclusion criteria | Optional. Type a rule, click **Add** (or press Enter). Remove a rule with the chip’s delete icon. |

**Create** opens the new project. On the list, **Open** returns to it. The trash icon deletes the project and everything stored in it after you confirm.

### 2. Add papers

On the project **Overview**, the stepper is **Create → Ingest → Extract → Review → Synthesize**. Counts along the top show works, assertions, items waiting for review, the template, the model, and LLM cost after a run.

Upload with one of three buttons:

- **Upload CSV.** A spreadsheet of abstracts. The file should include a text column named `abstract` or `text`. A `title` column is used as the paper title when present. Optional columns: `id`, `doi`, `year`, `authors`. Empty text rows are skipped. Rows that share a DOI, or the same title and authors, are skipped as duplicates.
- **Upload PDFs.** One or more `.pdf` files.
- **Upload PDF folder.** A directory; only `.pdf` files in it are uploaded.

Uploaded papers appear on the **Works** tab with title, year, DOI, source, and screening status. Use the row menu to mark a work **included**, **excluded**, or **pending**.

### 3. Run the pipeline

Click **Extract → Canonicalize → Synthesize**. The button stays disabled until at least one work is uploaded and the selected provider has an API key.

The label beside the spinner tells you which stage is running:

1. **Extracting assertions** — claims from the papers, scoped by the PECO and the template, each tied to a quote.
2. **Canonicalizing entities** — species and habitat names aligned to shared vocabularies (GBIF, ENVO, and local terms) so the same organism is not split across spellings.
3. **Rebuilding clusters and gaps** — comparable groups of claims, contradictions, and the gap register.

When it finishes, the view switches to the **Review queue**. The cost chip updates with estimated dollars, tokens, and call count.

### 4. Review assertions

Each card is one claim: subject, predicate, object, direction, confidence, a short rationale, and the evidence quotes. A canonical name in parentheses is the normalized form of a species or habitat.

Filter with the chips **pending**, **accepted**, **rejected**, and **all**.

A card marked **effect size — review required** contains a number (an effect size or similar). Those stay pending until you accept or reject them. Read the quote against the source before accepting one you would use in a meta-analysis. Red chips are guard failures; treat those claims with extra care.

For a pending card, an optional **Reviewer note** can be saved with **Accept** or **Reject**.

### 5. Ask questions and draft a review

Open the **Q&A** tab.

- Type a question in **Ask the evidence base**, pick a **Mode**, and click **Ask**.
  - **synthesize** — an answer drawn from the extracted claims, with citations.
  - **lookup** — passages or papers that match the words you typed.
  - **aggregate** — counts over the corpus (works, assertions, study designs, platforms).
  - **verify** — whether the stored claims support or oppose a statement.
- **Draft review** writes review sections with citation counts and a bibliography. The draft is generated from accepted and extracted evidence already in the project. It is a starting text, not a finished paper.

Answers show a confidence chip, limitations, and any flagged claims.

### 6. Comparison

**Comparison** opens the evidence matrix: one row per work, columns from the template (for the biodiversity template: platform, sensor, taxon, biome, study design, response, direction, effect size, sample size, location). A completeness line shows how often each column was filled.

**Export CSV** downloads that table.

Below the table:

- **Evidence clusters** group claims that share a subject, predicate, and object. A **contested** chip means the directions disagree. The histogram shows how many claims point each way.
- **Contradictions** list contested clusters with counts of supporting and opposing claims and any suggested moderators (reasons the results might differ).

If both sections are empty, the pipeline on Overview has not been run yet.

### 7. Gaps

**Gaps** has two parts.

- The **occupancy heatmap** crosses two axes from the template (for example taxon by biome). A number is how many works occupy that cell. A dot is an empty cell.
- The **gap register** lists coverage, quality, temporal, and contradiction gaps. Filter with the chips. Each row has a type, a severity, a description, and sometimes a suggested research angle.

### 8. Hypotheses

**Hypotheses** works from the gaps and contradictions already computed.

- **Generate from evidence** adds hypothesis cards. Each card shows where it came from, a status, and scores for novelty, plausibility, testability, and feasibility, plus how many stored claims sit for or against it. A narrowed statement, when present, is a tighter version of the same idea.
- **Check a hypothesis**: type a claim and click **Check**. The new card includes a verdict against the project’s evidence.
- **Temporal validation**: set a **Cutoff year** and click the button. The summary splits works into pre-cutoff and post-cutoff counts and reports how often gaps from the earlier set show up in the later set.

---

## Which path to use

Use **Extraction** when you already know the columns you want and you need a spreadsheet from a file you have in hand.

Use **Projects** when the unit of work is a review question: many papers, comparable claims, a matrix, an account of what has not been studied, and hypotheses you can check against the same corpus.
