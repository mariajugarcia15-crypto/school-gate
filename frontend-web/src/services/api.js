// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// --- Auth ---
export const authService = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// --- Vehicles ---
export const vehicleService = {
  getAll: (params) => api.get('/vehicles', { params }),
  getOne: (id) => api.get(`/vehicles/${id}`),
  getByPlate: (plate) => api.get(`/vehicles/plate/${plate}`),
  create: (formData) => api.post('/vehicles', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/vehicles/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

// --- Students ---
export const studentService = {
  getAll: (params) => api.get('/students', { params }),
  getOne: (id) => api.get(`/students/${id}`),
  create: (formData) => api.post('/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/students/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/students/${id}`),
};

// --- Permits ---
export const permitService = {
  getToday: () => api.get('/permits/today'),
  getAll: (params) => api.get('/permits', { params }),
  create: (data) => api.post('/permits', data),
  markUsed: (id) => api.patch(`/permits/${id}/use`),
  delete: (id) => api.delete(`/permits/${id}`),
};

// --- Logs ---
export const logService = {
  getAll: (params) => api.get('/logs', { params }),
  getToday: () => api.get('/logs/today'),
  getStats: () => api.get('/logs/stats'),
  create: (formData) => api.post('/logs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// --- OCR ---
export const ocrService = {
  recognize: (formData) => api.post('/ocr/recognize', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }),
};
