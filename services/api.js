import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://web-production-5e7b9.up.railway.app';

// Global token i minnet — inga AsyncStorage-anrop, helt synkront
let _accessToken = null;

export const setAuthToken = (token) => { _accessToken = token; };
export const clearAuthToken = () => { _accessToken = null; };

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Synkron interceptor — läser från minnet, inte AsyncStorage
api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url} | token: ${_accessToken ? 'SET' : 'NULL'}`);
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// Fånga 401 och logga ut
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      await AsyncStorage.removeItem('worker_data');
      const { navigationRef } = require('./navigationService');
      if (navigationRef.current?.isReady()) {
        navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const login = async (username, password) => {
  const url = `${BASE_URL}/api/auth/login`;
  const body = { username, password };
  console.log('[LOGIN] POST', url);
  console.log('[LOGIN] Body:', JSON.stringify(body));
  const res = await api.post('/api/auth/login', body);
  console.log('[LOGIN] Status:', res.status);
  console.log('[LOGIN] Data:', JSON.stringify(res.data));
  return res.data;
};

// ── Workers ───────────────────────────────────────────────────
export const getWorker = async (workerId) => {
  const res = await api.get(`/api/workers/${workerId}`);
  return res.data;
};

// ── Schema ────────────────────────────────────────────────────
export const getSchema = async (workerId, from, to) => {
  const params = { fran: from, till: to };
  if (workerId) params.worker_id = workerId;
  const res = await api.get('/api/schema', { params });
  return res.data;
};

// ── Jobb ──────────────────────────────────────────────────────
export const getJobb = async (jobbId) => {
  const res = await api.get(`/api/jobb/${jobbId}`);
  return res.data;
};

export const getJobbForWorker = async (workerId) => {
  const res = await api.get('/api/jobb', { params: { worker_id: workerId } });
  return res.data;
};

export const startaJobb = async (jobbId, lat, lng) => {
  const res = await api.patch(`/api/jobb/${jobbId}/starta`, { lat, lng });
  return res.data;
};

export const avslutaJobb = async (jobbId, lat, lng) => {
  const res = await api.patch(`/api/jobb/${jobbId}/avsluta`, { lat, lng });
  return res.data;
};

// ── Löner ─────────────────────────────────────────────────────
export const getLoner = async (workerId) => {
  const res = await api.get('/api/loner', { params: { worker_id: workerId } });
  return res.data;
};

export const getLonSpecifikation = async (lonId) => {
  const res = await api.get(`/api/loner/${lonId}/specifikation`);
  return res.data;
};

export default api;
