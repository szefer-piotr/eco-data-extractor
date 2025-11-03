import api from './api';
import { JobStatus, ExtractionResult } from '@api-types/api';

export const extractionApi = {
  uploadCSV: async (
    file: File, 
    idColumn: string, 
    textColumn: string, 
    categories: Record<string, string>,
    provider: string,
    model: string,
    apiKey: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Convert categories Record to array of CategoryField objects
    const categoriesArray = Object.entries(categories).map(([name, prompt]) => ({
      name,
      prompt,
    }));
    formData.append('categories_json', JSON.stringify(categoriesArray));
    formData.append('provider', provider);
    formData.append('model', model);
    formData.append('api_key', apiKey);

    const response = await api.post('/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadPDF: async (
    files: File[], 
    categories: Record<string, string>,
    provider: string,
    model: string,
    apiKey: string
  ) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    // Convert categories Record to array of CategoryField objects
    const categoriesArray = Object.entries(categories).map(([name, prompt]) => ({
      name,
      prompt,
    }));
    formData.append('categories_json', JSON.stringify(categoriesArray));
    formData.append('provider', provider);
    formData.append('model', model);
    formData.append('api_key', apiKey);

    const response = await api.post('/upload/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getStatus: async (jobId: string): Promise<JobStatus> => {
    const response = await api.get(`/extraction/status/${jobId}`);
    return response.data;
  },

  getResults: async (jobId: string): Promise<ExtractionResult> => {
    const response = await api.get(`/extraction/results/${jobId}`);
    return response.data;
  },

  cancelJob: async (jobId: string) => {
    const response = await api.delete(`/extraction/${jobId}`);
    return response.data;
  },
};

export default extractionApi;