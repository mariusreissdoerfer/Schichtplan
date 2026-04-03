import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
};

export const itemsApi = {
  getAll: (params) => api.get('/items', { params }),
  getOne: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  move: (id, data) => api.post(`/items/${id}/move`, data),
};

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const warehousesApi = {
  getAll: () => api.get('/warehouses'),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  createLocation: (warehouseId, data) => api.post(`/warehouses/${warehouseId}/locations`, data),
  updateLocation: (id, data) => api.put(`/warehouses/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/warehouses/locations/${id}`),
};

export const rentalsApi = {
  getAll: (params) => api.get('/rentals', { params }),
  checkAvailability: (params) => api.get('/rentals/availability', { params }),
  create: (data) => api.post('/rentals', data),
  update: (id, data) => api.put(`/rentals/${id}`, data),
  delete: (id) => api.delete(`/rentals/${id}`),
};

export const uploadApi = {
  uploadImage: (itemId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/upload/items/${itemId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  setPrimary: (itemId, imageId) => api.put(`/upload/items/${itemId}/images/${imageId}/primary`),
  deleteImage: (itemId, imageId) => api.delete(`/upload/items/${itemId}/images/${imageId}`),
};

export const statsApi = {
  get: () => api.get('/stats'),
};

export const importApi = {
  importCsv: (file, separator = ',') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('separator', separator);
    return api.post('/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => window.open('/api/import/template', '_blank'),
};

export default api;
