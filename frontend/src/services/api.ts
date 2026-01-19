/**
 * API Client - Cliente HTTP para comunicación con backend refactorizado
 * Soporta API v1 (core) y API admin
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_V1_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Cliente para API Core (v1) - 7 funciones esenciales
export const apiClient = axios.create({
  baseURL: API_V1_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente para autenticación
export const authClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente para API Admin - funciones avanzadas
export const adminClient = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las peticiones
const addAuthToken = (config: any) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(addAuthToken);
adminClient.interceptors.request.use(addAuthToken);

// Interceptor para manejar errores de autenticación
const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((response) => response, handleAuthError);
adminClient.interceptors.response.use((response) => response, handleAuthError);

// Exportar cliente por defecto (API v1)
export const api = apiClient;
export default apiClient;
