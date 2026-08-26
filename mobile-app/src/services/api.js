// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://TU_IP_LOCAL:4000/api'; // Cambia por la IP de tu servidor

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(err);
  }
);

export default api;

export const authService = {
  login: (data) => api.post('/auth/login', data),
};

export const vehicleService = {
  getByPlate: (plate) => api.get(`/vehicles/plate/${plate}`),
  getAll: (params) => api.get('/vehicles', { params }),
};

export const ocrService = {
  recognize: (formData) =>
    api.post('/ocr/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),
};

export const permitService = {
  getToday: () => api.get('/permits/today'),
  getAll: (params) => api.get('/permits', { params }),
  create: (data) => api.post('/permits', data),
  delete: (id) => api.delete(`/permits/${id}`),
};

export const logService = {
  getToday: () => api.get('/logs/today'),
  getAll: (params) => api.get('/logs', { params }),
  create: (formData) =>
    api.post('/logs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
