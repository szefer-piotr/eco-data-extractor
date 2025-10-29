import { create } from 'zustand';
import { ModelConfig, SelectedModelConfig, ModelParameters } from '@api-types/api';

interface ConfigStore {
  // State
  models: ModelConfig | null;
  apiKeys: Record<string, string>;
  selectedConfig: SelectedModelConfig | null;
  isLoading: boolean;
  error: string | null;
  testingConnection: Record<string, boolean>;

  // Actions
  setModels: (models: ModelConfig) => void;
  setApiKey: (provider: string, key: string) => void;
  removeApiKey: (provider: string) => void;

  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setModelParameters: (params: ModelParameters) => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTestingConnection: (provider: string, testing: boolean) => void;

  isConfigComplete: () => boolean;
  getProviderInfo: (provider: string) => import('@api-types/api').ProviderInfo | null;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  models: null,
  apiKeys: {},
  selectedConfig: {
    provider: '',
    model: '',
    parameters: { temperature: 0.7 },
  },
  isLoading: false,
  error: null,
  testingConnection: {},

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

  setSelectedProvider: (provider) =>
    set((state) => {
      const models = state.models?.providers[provider]?.models || [];
      const defaultModel = models[0] || '';
      return {
        selectedConfig: {
          ...state.selectedConfig,
          provider,
          model: defaultModel,
          parameters: state.selectedConfig?.parameters || { temperature: 0.7 },
        },
      };
    }),

  setSelectedModel: (model) =>
    set((state) => ({
      selectedConfig: {
        provider: state.selectedConfig?.provider || '',
        model,
        parameters: state.selectedConfig?.parameters || {temperature: 0.7},
      },
    })),

  setModelParameters: (params) =>
    set((state) => ({
      selectedConfig: {
        provider: state.selectedConfig?.provider || '',
        model: state.selectedConfig?.model || '',
        parameters: params,
      },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setTestingConnection: (provider, testing) =>
    set((state) => ({
      testingConnection: {
        ...state.testingConnection,
        [provider]: testing,
      },
    })),

  isConfigComplete: () => {
    const state = get();
    const { provider, model } = state.selectedConfig || {};
    const hasApiKey = !state.models?.providers[provider!]?.requires_api_key ||
                      state.apiKeys[provider!];
    return Boolean(provider && model && hasApiKey);
  },

  getProviderInfo: (provider) => {
    const state = get();
    return state.models?.providers[provider] || null;
  },
}));

export default useConfigStore;