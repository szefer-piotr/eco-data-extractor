import { create } from 'zustand';
import { ModelConfig } from '@api-types/api';

interface ConfigStore {
  // State
  models: ModelConfig | null;
  apiKeys: Record<string, string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setModels: (models: ModelConfig) => void;
  setApiKey: (provider: string, key: string) => void;
  removeApiKey: (provider: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  models: null,
  apiKeys: {},
  isLoading: false,
  error: null,

  setModels: (models) => set({ models }),

  setApiKey: (provider, key) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    })),

  removeApiKey: (provider) =>
    set((state) => ({
      apiKeys: Object.fromEntries(
        Object.entries(state.apiKeys).filter(([key]) => key !== provider)
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

export default useConfigStore;