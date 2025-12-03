# Targeted Visual Validation - Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EcoData Extractor                              │
│                  Targeted Visual Validation Workflow                    │
└─────────────────────────────────────────────────────────────────────────┘

                         USER UPLOADS FILE
                               │
                               ▼
                    ┌──────────────────────┐
                    │   File Processing    │
                    │  (CSV/PDF parsing)   │
                    └──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
         ┌─────────→│ Sentence Enumeration │←─────────┐
         │          │   (Text Splitting)   │          │
         │          └──────────────────────┘          │
         │                     │                      │
         │                     ▼                      │
         │         ┌────────────────────────┐        │
         │         │  [1] Sentence 1        │        │
         │         │  [2] Sentence 2        │        │
         │         │  [3] Sentence 3        │        │
         │         │  ...                   │        │
         │         └────────────────────────┘        │
         │                     │                      │
         │                     ▼                      │
         │        ┌──────────────────────┐           │
         │        │ Build Enhanced Prompt │           │
         │        │ with Enumeration     │           │
         │        └──────────────────────┘           │
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   LLM API   │
                        │ (OpenAI,    │
                        │  DeepSeek)  │
                        └─────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │  LLM Response with:      │
                    │  - Extracted value       │
                    │  - Sentence IDs          │
                    │  - Justification         │
                    │  - Candidate sentences   │
                    │    (for missing data)    │
                    └──────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
         ┌─────────→│  Parse Response &        │←─────────┐
         │          │  Map Sentence IDs to    │          │
         │          │  Actual Text            │          │
         │          └──────────────────────────┘          │
         │                     │                          │
         │                     ▼                          │
         │      ┌────────────────────────────┐            │
         │      │ CategoryExtractionWithValid│            │
         │      │ - value                    │            │
         │      │ - confidence               │            │
         │      │ - supporting_sentences:    │            │
         │      │   [{id, text, justif}...]  │            │
         │      │ - candidate_sentences      │            │
         │      │   (if not found)           │            │
         │      └────────────────────────────┘            │
         │                     │                          │
         └─────────────────────┼──────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │  FRONTEND: Results Page  │
                    │  ┌────────────────────┐  │
                    │  │ Results Table      │  │
                    │  │ with categories    │  │
                    │  │ and scores         │  │
                    │  └────────────────────┘  │
                    │          │               │
                    │     [START VALIDATION]   │
                    │          │               │
                    │          ▼               │
                    │  ┌────────────────────┐  │
                    │  │ Validation Mode    │  │
                    │  │ ┌────────────────┐ │  │
                    │  │ │ For each row:  │ │  │
                    │  │ │ - Show extract │ │  │
                    │  │ │ - Show sentenc │ │  │
                    │  │ │ - Show justif  │ │  │
                    │  │ │ - Show candidat│ │  │
                    │  │ └────────────────┘ │  │
                    │  └────────────────────┘  │
                    │          │               │
                    │          ▼               │
                    │  ┌────────────────────┐  │
                    │  │ User Actions:      │  │
                    │  │ ✓ Confirm          │  │
                    │  │ ✓ Override value   │  │
                    │  │ ✓ Select sentences │  │
                    │  │ ✓ Mark wrong       │  │
                    │  │ ✓ Skip row         │  │
                    │  └────────────────────┘  │
                    │          │               │
                    │          ▼               │
                    │  ┌────────────────────┐  │
                    │  │ Collect Feedback   │  │
                    │  │ {row, category,    │  │
                    │  │  status, sentences}│  │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │  Submit Validation       │
                    │  Feedback to Backend     │
                    │  POST /validate-extract  │
                    └──────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │  Backend: Save Feedback  │
                    │  - Store in JSON/DB      │
                    │  - Track metrics         │
                    │  - Build learning ctx   │
                    └──────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────┐
            │   LEARNING LOOP (Future)         │
            │                                  │
            │  1. Aggregate feedback           │
            │  2. Find patterns                │
            │  3. Build successful examples    │
            │  4. Enhance prompt with learnings│
            │  5. Run extraction again         │
            │  6. Compare accuracy metrics     │
            │  → Continuous improvement        │
            └──────────────────────────────────┘
```

---

## Frontend Component Flow

```
ResultsViewer (Page)
    │
    ├── Props:
    │   └── jobId, categories
    │
    └── ResultsTable (Main Component)
        │
        ├── State Management:
        │   ├── page, rowsPerPage
        │   ├── order, orderBy (sorting)
        │   ├── expandedRows
        │   ├── searchFilter
        │   ├── validationMode          ← NEW
        │   ├── currentRowForValidation ← NEW
        │   ├── submittingFeedback      ← NEW
        │   └── feedbackMessage         ← NEW
        │
        ├── Modes:
        │   ├── Normal Mode
        │   │   ├── Search Bar
        │   │   ├── Results Table
        │   │   │   ├── Row ID
        │   │   │   ├── Categories (with values)
        │   │   │   ├── Status (Success/Error)
        │   │   │   └── Expand Button
        │   │   └── Pagination
        │   │
        │   └── Validation Mode  ← NEW
        │       ├── Progress Alert
        │       ├── ExtractionValidation
        │       │   ├── Display each category:
        │       │   │   ├── Extracted Value
        │       │   │   ├── Confidence
        │       │   │   ├── Justification
        │       │   │   ├── Supporting Sentences
        │       │   │   └── Candidate Sentences
        │       │   │
        │       │   └── User Actions:
        │       │       ├── Review & Validate
        │       │       │   └── Dialog:
        │       │       │       ├── Edit Value
        │       │       │       └── Select Sentences
        │       │       ├── Mark as Incorrect
        │       │       └── Submit Feedback
        │       │
        │       └── Navigation:
        │           ├── Skip This Row
        │           └── Exit Validation Mode
        │
        └── Handlers:
            ├── handleStartValidation()      ← NEW
            ├── handleValidationComplete()   ← NEW
            ├── handleSkipValidation()       ← NEW
            ├── handleExitValidation()       ← NEW
            └── (existing sort/filter handlers)
```

---

## Data Flow: Single Row Validation

```
Row Data Arrives
      │
      ▼
┌────────────────────────────────┐
│  ExtractionResultItemWithValid │
│  ├── row_id: "D5"              │
│  ├── extracted_data: {         │
│  │   "revenue": {              │
│  │     value: "$5M",           │
│  │     confidence: 0.95,       │
│  │     supporting_sentences:   │
│  │     [{id:1, text:"...",     │
│  │       justif:"..."}],       │
│  │     justification: "..."    │
│  │   },                        │
│  │   "growth_rate": {          │
│  │     value: null,            │
│  │     confidence: 0.0,        │
│  │     candidate_sentences:    │
│  │     [{id:2, text:"...",     │
│  │       score:0.7,            │
│  │       reason:"..."}]        │
│  │   }                         │
│  │ }                           │
│  └── enumerated_sentences: [   │
│      {id:1, text:"..."},       │
│      {id:2, text:"..."},       │
│      ...                       │
│    ]                           │
└────────────────────────────────┘
      │
      ▼ (pass to ExtractionValidation)
┌────────────────────────────────┐
│   Display to User:             │
│                                │
│  ✓ Revenue ($5M)               │
│    Supporting: [1]             │
│    "The company earned..."     │
│                                │
│  ? Growth Rate (Not found)      │
│    Candidates: [2]             │
│    "Growth was..."             │
│                                │
│  [Review & Validate]           │
│  [Mark as Incorrect]           │
└────────────────────────────────┘
      │
      ▼ (user clicks "Review & Validate")
┌────────────────────────────────┐
│   Dialog: Edit Supporting      │
│   - Edit value text            │
│   - Select sentences (checks)  │
│   - [Cancel] [Confirm]         │
└────────────────────────────────┘
      │
      ▼ (user clicks "Confirm")
┌────────────────────────────────┐
│   ValidationFeedback:          │
│   {                            │
│     row_id: "D5",              │
│     category: "revenue",       │
│     validation_status:         │
│       "confirmed",             │
│     user_validated_sentences:  │
│       [1],                     │
│     manual_value: null         │
│   }                            │
└────────────────────────────────┘
      │
      ▼ (submit to backend)
┌────────────────────────────────┐
│   POST /validate-extraction    │
│   {job_id}                     │
│                                │
│   Body: [ValidationFeedback]   │
└────────────────────────────────┘
      │
      ▼
Success Message
      │
      ▼
Move to Next Row
```

---

## Supporting Sentences Display

```
┌─────────────────────────────────────────────────────────┐
│  Revenue                                      ✓ 95%    │
├─────────────────────────────────────────────────────────┤
│  Extracted: $5M                                         │
│                                                         │
│  Justification:                                         │
│  "Sentences [1] and [3] mention X, which indicates..." │
│                                                         │
│  Supporting Sentences:                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [1] The company earned $5M in 2023.                 ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ [3] Revenue increased to record levels.             ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [Review & Validate]  [Mark as Incorrect]              │
└─────────────────────────────────────────────────────────┘
```

---

## Candidate Sentences Display (Missing Extractions)

```
┌─────────────────────────────────────────────────────────┐
│  Founder Name                                    ? (Not Found)
├─────────────────────────────────────────────────────────┤
│  Extracted: (Not found)                                 │
│                                                         │
│  Justification:                                         │
│  "No clear mention of founder name in provided text"   │
│                                                         │
│  Candidate Sentences (LLM Suggestions):                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [2] Company Score: 75%                              ││
│  │ "Founded by John Smith in 1995 with..."             ││
│  │                              [Use This]             ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ [5] Company Score: 65%                              ││
│  │ "Led by John Smith, the company has grown..."       ││
│  │                              [Use This]             ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [Review & Validate]                                    │
└─────────────────────────────────────────────────────────┘

User can:
✓ Click [Use This] on any candidate sentence
✓ Click [Review & Validate] to manually select sentences
✓ Override with own value
✓ Skip without validating
```

---

## Validation Workflow Timeline

```
Time ──────────────────────────────────────────────────────→

T0:  User clicks "Start Validation"
     ├─ validationMode = true
     ├─ currentRowForValidation = 0
     └─ Show: Row 1 of 100

T1:  User reviews extraction
     └─ Sees supporting sentences and justification

T2:  User clicks "Review & Validate"
     ├─ Dialog opens
     └─ Show: Full sentence list with checkboxes

T3:  User selects sentences and confirms
     ├─ Dialog closes
     └─ API call: submitValidationFeedback([feedback])

T4:  Feedback submitted successfully
     ├─ Show: Success message
     ├─ Set: feedbackMessage = {type: 'success', ...}
     └─ Wait: 2 seconds

T5:  Auto-progress to next row
     ├─ currentRowForValidation = 1
     ├─ Clear: feedbackMessage
     └─ Show: Row 2 of 100

T6+: Repeat T1-T5 for each row...

TN:  User clicks "Exit Validation Mode" (or all rows done)
     ├─ validationMode = false
     ├─ currentRowForValidation = null
     └─ Return to: ResultsTable normal view

```

---

## Backend Processing (Simplified)

```
Frontend: POST /validate-extraction/job_123
              [ValidationFeedback, ...]
                  │
                  ▼
Backend:  @router.post("/validate-extraction/{job_id}")
              │
              ├─ Receive feedback list
              │
              ├─ For each feedback item:
              │  ├─ Validate row exists
              │  ├─ Validate sentences exist
              │  ├─ Save to database/JSON
              │  └─ Update metrics
              │
              ├─ Save to:
              │  ├─ ./storage/validation_feedback/{job_id}/{row_id}_feedback.json
              │  └─ Database (if configured)
              │
              └─ Return: {status: "success", message: "..."}
                  │
                  ▼
Frontend:  Show success message
           Progress to next row
```

---

## Feedback Persistence

```
Backend Storage:
./storage/validation_feedback/
└── job_123/
    ├── D5_feedback.json
    │   ├── job_id: "job_123"
    │   ├── row_id: "D5"
    │   ├── timestamp: "2025-01-15T10:30:00Z"
    │   └── validations: [
    │       {
    │         "category": "revenue",
    │         "validation_status": "confirmed",
    │         "user_validated_sentences": [1, 3],
    │         "manual_value": null
    │       },
    │       {
    │         "category": "founder",
    │         "validation_status": "override",
    │         "user_validated_sentences": [2],
    │         "manual_value": "John Smith"
    │       }
    │     ]
    │
    ├── D6_feedback.json
    ├── D7_feedback.json
    └── ...

Learning Loop:
  Load all feedback for job_123
  Group by category
  Identify patterns
  Build learning context
  → Next extraction uses this context
  → Improved accuracy expected
```

---

## Confidence Score Visualization

```
Green (High Confidence: 80%+)
┌───────────────────────────────┐
│ ✓ Revenue: $5M        95%     │  Extracted with high confidence
└───────────────────────────────┘

Yellow (Medium Confidence: 50-79%)
┌───────────────────────────────┐
│ ≈ Founder: J. Smith   72%     │  Extracted but needs review
└───────────────────────────────┘

Red (Low Confidence: <50%)
┌───────────────────────────────┐
│ ⚠ Market Size: Unknown 30%    │  Low confidence, might be wrong
└───────────────────────────────┘

Orange (Not Found)
┌───────────────────────────────┐
│ ? Employee Count    (Not Found)│  LLM suggests checking [2], [5], [8]
└───────────────────────────────┘
```

---

**Last Updated**: 2025-01-15
**Component Status**: ✅ Frontend Complete


