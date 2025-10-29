import { create } from 'zustand';
import { ExtractionConfig, Category, UploadedFile } from '@api-types/extraction';

interface ExtractionStore {
  // State
  file: UploadedFile | null;
  idColumn: string | null;
  textColumn: string | null;
  categories: Category[];
  providerId: string;
  modelId: string;
  temperature: number;
  jobId: string | null;

  // Actions
  setFile: (file: UploadedFile | null) => void;
  setIdColumn: (column: string | null) => void;
  setTextColumn: (column: string | null) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setProvider: (providerId: string) => void;
  setModel: (modelId: string) => void;
  setTemperature: (temperature: number) => void;
  setJobId: (jobId: string | null) => void;
  reset: () => void;
  getConfig: () => ExtractionConfig;
}

const initialState = {
  file: null,
  idColumn: null,
  textColumn: null,
  categories: [],
  providerId: 'openai',
  modelId: 'gpt-4',
  temperature: 0.7,
  jobId: null,
};

export const useExtractionStore = create<ExtractionStore>((set, get) => ({
  ...initialState,

  setFile: (file) => set({ file }),

  setIdColumn: (column) => set({ idColumn: column }),       // ADD THIS

  setTextColumn: (column) => set({ textColumn: column }),   // ADD THIS

  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      ),
    })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    })),

  setProvider: (providerId) => set({ providerId }),

  setModel: (modelId) => set({ modelId }),

  setTemperature: (temperature) => set({ temperature }),

  setJobId: (jobId) => set({ jobId }),

  reset: () => set(initialState),

  getConfig: () => {
    const state = get();
    return {
      categories: state.categories,
      providerId: state.providerId,
      modelId: state.modelId,
      temperature: state.temperature,
    };
  },
}));

export default useExtractionStore;