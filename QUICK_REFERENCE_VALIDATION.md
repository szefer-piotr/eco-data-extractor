# Quick Reference: Targeted Visual Validation

## 🎯 What Is It?
A feature that lets users validate LLM extraction results by:
1. Seeing extracted values
2. Viewing supporting sentences
3. Confirming or correcting extractions
4. Providing feedback for learning

---

## 📍 Where Is It?
- **Frontend**: `ResultsTable.tsx` → shows "Start Validation" button
- **Component**: `ExtractionValidation.tsx` → handles validation UI
- **Backend** (TODO): Text processing, validation service, API endpoints

---

## 🎮 User Flow

```
Results Page → [Start Validation] → Validation Mode
    ↓
For each row:
  Show extraction → User reviews → User confirms/corrects
    ↓
Collect feedback → Submit to backend → Next row
    ↓
Complete or Exit
```

---

## 🔌 Frontend Props

```typescript
<ResultsTable
  data={results}
  categoryNames={categoryNames}
  showValidation={true}           // Enable feature
  jobId={effectiveJobId}          // For API calls
/>
```

---

## 📊 Component State

```typescript
// In ResultsTable.tsx
const [validationMode, setValidationMode] = useState(false);
const [currentRowForValidation, setCurrentRowForValidation] = useState<number | null>(null);
const [submittingFeedback, setSubmittingFeedback] = useState(false);
const [feedbackMessage, setFeedbackMessage] = useState<...>(null);
```

---

## 🎨 UI Elements

| Element | Location | Purpose |
|---------|----------|---------|
| Validation Bar | Top of table | "Start Validation" button |
| Validation Mode | Full screen | ExtractionValidation component |
| Progress Alert | Top of validation | Shows "Row 1 of 100" |
| Category Cards | Main area | Displays extraction details |
| Dialog | Modal | Select supporting sentences |
| Navigation | Bottom | Skip/Exit buttons |

---

## 📝 Data Structures

### ValidationFeedback
```typescript
{
  row_id: string;
  category: string;
  validation_status: 'confirmed' | 'rejected' | 'override';
  user_validated_sentences: number[];
  manual_value?: string;
  notes?: string;
}
```

### CategoryExtractionWithValidation
```typescript
{
  value: string | null;
  confidence: number;
  supporting_sentences: SentenceReference[];
  justification: string;
  validation_status: string;
  user_validated_sentences: SentenceReference[];
  candidate_sentences?: CandidateSentence[];
}
```

---

## 🔄 Handler Functions

### Start Validation
```typescript
const handleStartValidation = () => {
  setValidationMode(true);
  setCurrentRowForValidation(0);
}
```

### Submit Feedback
```typescript
const handleValidationComplete = async (feedback: ValidationFeedback[]) => {
  // Currently: console.log + simulated delay
  // TODO: Replace with real API call to backend
  // await validationApi.submitValidationFeedback(jobId, feedback);
}
```

### Skip Row
```typescript
const handleSkipValidation = () => {
  if (currentRowForValidation < processedData.length - 1) {
    setCurrentRowForValidation(currentRowForValidation + 1);
  } else {
    exitValidationMode();
  }
}
```

### Exit Validation
```typescript
const handleExitValidation = () => {
  setValidationMode(false);
  setCurrentRowForValidation(null);
}
```

---

## 🎯 Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Show extractions | ✅ Complete | Displays all categories |
| Show supporting sentences | ✅ Complete | With sentence IDs |
| Show candidates (missing) | ✅ Complete | For not-found categories |
| Confirm extraction | ✅ Complete | Mark as validated |
| Override value | ✅ Complete | User edits extracted value |
| Select sentences | ✅ Complete | Dialog with checkboxes |
| Auto-progress | ✅ Complete | Move to next row |
| Skip row | ✅ Complete | Don't validate this row |
| Exit validation | ✅ Complete | Return to normal view |
| Feedback submission | ⏳ Simulated | Ready for backend API |

---

## 🚀 Backend Integration

### Step 1: Create API Service
```typescript
// frontend/src/services/validationApi.ts
export const validationApi = {
  submitValidationFeedback: async (jobId: string, feedback: ValidationFeedback[]) => {
    return axios.post(`${API_BASE_URL}/extraction/validate-extraction/${jobId}`, feedback);
  }
};
```

### Step 2: Update Handler
```typescript
// In handleValidationComplete:
// Replace:
//   console.log('Submitting...'); await delay(1000);
// With:
//   const response = await validationApi.submitValidationFeedback(jobId, feedback);
```

### Step 3: Test End-to-End
```bash
# Backend must have:
POST /api/extraction/validate-extraction/{job_id}
GET /api/extraction/extraction-feedback/{job_id}
```

---

## 🧪 Testing

### Manual Testing
1. Click "Start Validation"
2. See first row in validation component
3. Click "Review & Validate"
4. Toggle sentences
5. Click "Confirm"
6. See success message
7. Auto-progress to next row
8. Click "Exit Validation Mode"
9. Return to results table

### API Testing
```bash
curl -X POST http://localhost:8000/api/extraction/validate-extraction/job_123 \
  -H "Content-Type: application/json" \
  -d '[{"row_id":"D5","category":"revenue","validation_status":"confirmed"}]'
```

---

## 📂 Files at a Glance

| File | Lines | Status |
|------|-------|--------|
| ResultsTable.tsx | ~600 | ✅ Updated |
| ResultViewer.tsx | ~175 | ✅ Updated (2 lines) |
| ExtractionValidation.tsx | ~330 | ✅ Exists |
| validationApi.ts | ~20 | 📝 TODO |

---

## 🔗 Related Endpoints (To Implement)

```
POST   /api/extraction/validate-extraction/{job_id}
GET    /api/extraction/extraction-feedback/{job_id}
```

---

## 💡 Pro Tips

1. **Validation is optional** - Users don't need to validate
2. **Non-blocking** - Users can export without validating
3. **Learning enabled** - Each validation improves future extractions
4. **Feedback saved** - For analytics and refinement
5. **User-friendly** - Clear UI, helpful messages

---

## 🎓 Architecture Pattern

```
Presentation (React Component)
    ↓
  State (useState hooks)
    ↓
  Handlers (event functions)
    ↓
  Business Logic (validation)
    ↓
  API Layer (axios calls)
    ↓
  Backend (FastAPI endpoints)
```

---

## ❓ FAQ

**Q: Can users skip validation?**
A: Yes, click "Skip This Row" or "Exit Validation Mode"

**Q: Does validation break normal usage?**
A: No, it's completely optional

**Q: Where is feedback stored?**
A: Backend (to be implemented)

**Q: Can I see validation metrics?**
A: Yes, through GET /extraction-feedback endpoint

**Q: Is it production-ready?**
A: Frontend is, backend integration needed

---

## 🔄 Current State

```
Frontend:  ✅ 100% Complete
Backend:   📝 0% Complete
API:       📝 0% Complete
Docs:      ✅ 100% Complete
Testing:   ⏳ Ready
```

---

## 📞 Support

- **User Guide**: See `VALIDATION_FEATURE_GUIDE.md`
- **Architecture**: See `VALIDATION_FEATURE_DIAGRAM.md`
- **Implementation**: See `VALIDATION_IMPLEMENTATION_SUMMARY.md`
- **Code**: Check `ResultsTable.tsx` and `ExtractionValidation.tsx`

---

**Last Updated**: 2025-01-15
**Version**: 1.0
**Status**: ✅ Frontend Complete


