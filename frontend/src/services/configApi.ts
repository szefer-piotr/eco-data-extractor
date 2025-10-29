import api from './api';
import { ModelConfig } from '@api-types/api';

export const configApi = {
  getModels: async (): Promise<ModelConfig> => {
    const response = await api.get('/config/models');
    return response.data;
  },

  setApiKey: async (provider: string, apiKey: string) => {
    const response = await api.post('/config/api-keys', {
      provider,
      api_key: apiKey,
    });
    return response.data;
  },

  getApiKeys: async () => {
    const response = await api.get('/config/api-keys');
    return response.data;
  },
};

export default configApi;