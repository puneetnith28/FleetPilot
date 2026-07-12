import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fleet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fleet_token');
      localStorage.removeItem('fleet_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  signup: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/signup', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// ─── Vehicles ─────────────────────────────────────────────────
export const vehiclesApi = {
  list: (params?: any) => api.get('/vehicles', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/vehicles', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/vehicles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}`).then((r) => r.data),
};

// ─── Drivers ──────────────────────────────────────────────────
export const driversApi = {
  list: (params?: any) => api.get('/drivers', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/drivers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/drivers', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/drivers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/drivers/${id}`).then((r) => r.data),
};

// ─── Trips ────────────────────────────────────────────────────
export const tripsApi = {
  list: (params?: any) => api.get('/trips', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/trips/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/trips', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/trips/${id}`, data).then((r) => r.data),
  dispatch: (id: string) => api.post(`/trips/${id}/dispatch`).then((r) => r.data),
  complete: (id: string, data: unknown) => api.post(`/trips/${id}/complete`, data).then((r) => r.data),
  cancel: (id: string) => api.post(`/trips/${id}/cancel`).then((r) => r.data),
};

// ─── Maintenance ──────────────────────────────────────────────
export const maintenanceApi = {
  list: (params?: any) => api.get('/maintenance', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/maintenance/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/maintenance', data).then((r) => r.data),
  close: (id: string) => api.post(`/maintenance/${id}/close`).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/maintenance/${id}`, data).then((r) => r.data),
};

// ─── Fuel ─────────────────────────────────────────────────────
export const fuelApi = {
  list: (params?: any) => api.get('/fuel', { params }).then((r) => r.data),
  create: (data: unknown) => api.post('/fuel', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/fuel/${id}`).then((r) => r.data),
};

// ─── Expenses ─────────────────────────────────────────────────
export const expensesApi = {
  list: (params?: any) => api.get('/expenses', { params }).then((r) => r.data),
  create: (data: unknown) => api.post('/expenses', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  get: (params?: any) => api.get('/dashboard', { params }).then((r) => r.data),
};

// ─── Reports ──────────────────────────────────────────────────
export const reportsApi = {
  get: () => api.get('/reports').then((r) => r.data),
};

// ─── Notifications ────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  read: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  readAll: () => api.patch('/notifications/read-all').then((r) => r.data),
};

// ─── Driver Portal ────────────────────────────────────────────
export const driverPortalApi = {
  me: () => api.get('/driver-portal/me').then((r) => r.data),
  activeTrip: () => api.get('/driver-portal/active-trip').then((r) => r.data),
};

export default api;
