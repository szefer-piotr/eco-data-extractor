import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// For local development with Docker Compose: http://ecodata-backend:8000/api
// For production on remote VM: https://ecodataextractor.byst.re/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
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
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('[API Response Error]', message);
    return Promise.reject(error);
  }
);

export default api;