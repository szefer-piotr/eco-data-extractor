import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Vite dev server proxies /api → http://127.0.0.1:8000 (see vite.config.ts).
// Override with VITE_API_URL for Docker/production builds.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Extraction, PDF ingest, and Q&A are synchronous and can run for minutes.
  timeout: 0,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    let message = error.response?.data?.detail || error.message || 'An error occurred';
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        message = 'Request timed out waiting for the API.';
      } else {
        message =
          'Cannot reach the API. Start the backend with: uvicorn app.main:app --reload --port 8000 --host 127.0.0.1';
      }
    }
    console.error('[API Response Error]', message);
    error.message = message;
    return Promise.reject(error);
  }
);

export default api;