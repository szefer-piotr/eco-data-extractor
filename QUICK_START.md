# EcoDataExtractor - Quick Start Guide

## 📋 Overview

Your project has a **working backend** (synchronous, in-memory) and needs **frontend development**. This guide tells you exactly what to do next.

## 🎯 Immediate Next Steps (This Week)

### 1. Read the Master Plan
```bash
# Open and read in this order:
1. CURRENT_STATUS.md          # Project status overview
2. refactoring_plan/NEXT_STEPS.md    # Detailed roadmap (70% of what you need)
3. refactoring_plan/IMPLEMENTATION_CHECKLIST.md  # Daily checklist
```

### 2. Make 3 Technical Decisions

Before writing code, decide:

| Decision | Option A | Option B |
|----------|----------|----------|
| **UI Framework** | Material-UI (MUI) - Full-featured | Shadcn/ui - Lightweight |
| **State Manager** | Zustand - Simple & fast | Redux - Powerful & verbose |
| **Styling** | Tailwind CSS - Utility-first | CSS Modules - Scoped CSS |

**Recommendation**: Zustand + MUI for simplicity, or Zustand + Shadcn/Tailwind for minimal bundle.

### 3. Start Priority 1: Frontend Foundation

#### Install Core Dependencies
```bash
cd /home/piotr/projects/EcoDataExtractor/frontend

# Core dependencies (always needed)
npm install react-router-dom zustand axios

# If using MUI (recommended):
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

# If using Shadcn/ui instead:
npx shadcn-ui@latest init

# Forms & validation (optional but helpful):
npm install react-hook-form zod
```

#### Create Folder Structure
```bash
mkdir -p src/{components/layout,components/upload,components/categories,components/model-config,components/extraction,components/results,components/common}
mkdir -p src/{pages,services,store,types,theme,utils,styles}
```

#### Start with Layout.tsx
```bash
# Create: src/components/layout/Layout.tsx
# This is the main wrapper for all pages
# Contains Header, Navigation, Footer
```

#### Create Page Shells
```bash
# Create empty page files:
src/pages/HomePage.tsx
src/pages/ExtractionPage.tsx
src/pages/HistoryPage.tsx
src/pages/SettingsPage.tsx
src/pages/NotFoundPage.tsx
```

#### Setup Router
Update `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// ... import pages

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/extract" element={<ExtractionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 🔌 Backend Status (No Changes Needed)

Backend is fully functional and ready to serve the frontend:

### Running Backend
```bash
cd /home/piotr/projects/EcoDataExtractor/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### Key Endpoints (for frontend integration)
```
POST   /api/upload/csv              - Upload CSV file
POST   /api/upload/pdf              - Upload PDF file
GET    /api/extraction/status/{id}  - Check job progress
GET    /api/extraction/results/{id} - Get results
DELETE /api/extraction/{id}         - Cancel job
GET    /api/config/models           - List available models
POST   /api/config/api-keys         - Set API key
GET    /health                      - Health check
```

### Example API Usage
```typescript
// In frontend, call backend like this:
const response = await axios.post('http://localhost:8000/api/upload/csv', formData);
const jobId = response.data.job_id;

// Poll for status
const status = await axios.get(`http://localhost:8000/api/extraction/status/${jobId}`);
```

## 📊 Timeline

| Week | Priority | Focus |
|------|----------|-------|
| 1-2  | 1 | Foundation (routing, theme, stores, API client) |
| 2-3  | 2 | File Upload & Preview |
| 3-4  | 3 | Category Configuration |
| 4-5  | 4 | Model Configuration |
| 5-6  | 5 | Extraction & Status UI |
| 6-7  | 6 | Results Display & Export |
| 7-8  | 7 | Polish & Responsiveness |

## 🛠️ Development Workflow

### 1. Create a Component
```bash
# Example: create upload component
touch src/components/upload/FileUploader.tsx
```

### 2. Write Component (with TypeScript)
```tsx
import React from 'react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected }) => {
  // Component implementation
  return <div>File uploader</div>;
};
```

### 3. Test Against Backend
- Backend already running at `localhost:8000`
- Use Postman or `curl` to test endpoints first
- Then integrate component with API calls

### 4. Add to Page
```tsx
// In ExtractionPage.tsx
import { FileUploader } from '../components/upload/FileUploader';

export default function ExtractionPage() {
  return <FileUploader onFileSelected={(file) => console.log(file)} />;
}
```

## 📁 Key Files Reference

```
EcoDataExtractor/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    ← Edit: Add routes
│   │   ├── main.tsx                   ← Main entry point
│   │   ├── components/                ← Create components here
│   │   ├── pages/                     ← Create pages here
│   │   ├── services/                  ← API client services
│   │   ├── store/                     ← Zustand stores
│   │   └── types/                     ← TypeScript interfaces
│   └── package.json                   ← Dependencies
│
├── backend/
│   ├── app/
│   │   ├── main.py                    ← Backend entry point
│   │   ├── routers/                   ← API endpoints (don't change)
│   │   ├── services/                  ← Business logic (don't change)
│   │   └── config.py                  ← Configuration
│   └── requirements.txt
│
└── refactoring_plan/
    ├── NEXT_STEPS.md                  ← YOUR ROADMAP (read this!)
    └── IMPLEMENTATION_CHECKLIST.md    ← Daily checklist
```

## 🚀 First Component to Build

Start with **StateManagement** to understand how frontend will work:

### 1. Create Zustand Stores

**src/store/extractionStore.ts:**
```tsx
import create from 'zustand';

interface ExtractionState {
  uploadedFile: File | null;
  categories: any[];
  currentJobId: string | null;
  results: any[];
  // Actions
  setFile: (file: File) => void;
  addCategory: (category: any) => void;
  setJobId: (id: string) => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  uploadedFile: null,
  categories: [],
  currentJobId: null,
  results: [],
  setFile: (file) => set({ uploadedFile: file }),
  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category]
  })),
  setJobId: (id) => set({ currentJobId: id }),
}));
```

### 2. Create API Client

**src/services/api.ts:**
```tsx
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
```

### 3. Use in Component

```tsx
import { useExtractionStore } from '../store/extractionStore';
import api from '../services/api';

export function MyComponent() {
  const { setJobId } = useExtractionStore();

  const handleUpload = async (file: File) => {
    const response = await api.post('/api/upload/csv', { file });
    setJobId(response.data.job_id);
  };

  return <button onClick={() => handleUpload(file)}>Upload</button>;
}
```

## ✅ Success Checklist (This Week)

- [ ] Read CURRENT_STATUS.md
- [ ] Read NEXT_STEPS.md (sections 1-3)
- [ ] Make 3 technical decisions
- [ ] Install core dependencies
- [ ] Create folder structure
- [ ] Setup React Router in App.tsx
- [ ] Create 5 empty page components
- [ ] Create Zustand stores (extraction, config, ui)
- [ ] Create API client service
- [ ] Test backend is running (`http://localhost:8000/health`)
- [ ] Create Layout component
- [ ] App navigates between pages

## 🔗 Useful Links

- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Router Docs](https://reactrouter.com/)
- [Axios Docs](https://axios-http.com/)
- [MUI Component Library](https://mui.com/components/)
- [Shadcn/ui Components](https://ui.shadcn.com/docs)

## 🆘 Quick Troubleshooting

**Q: Backend not running?**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

**Q: Frontend build errors?**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Q: CORS errors in browser console?**
- Backend CORS is configured to accept `localhost:3000` and `localhost:5173`
- Make sure frontend is running on one of these ports

**Q: API calls not working?**
- Check backend is running: `curl http://localhost:8000/health`
- Check frontend .env has correct API_URL
- Check network tab in DevTools for actual request

## 📝 Next Steps After Reading This

1. **Open NEXT_STEPS.md** - This is your detailed roadmap
2. **Open IMPLEMENTATION_CHECKLIST.md** - For daily progress tracking
3. **Start Priority 1 Phase 1** - Install dependencies and create layout
4. **Update checklist** - Mark items as complete

---

**You're in great shape!** The hard work (backend) is done. Now it's smooth sailing with frontend UI.

Good luck! 🚀
