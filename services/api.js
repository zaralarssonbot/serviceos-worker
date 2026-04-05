import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://web-production-5e7b9.up.railway.app';

// Global token i minnet — inga AsyncStorage-anrop, helt synkront
let _accessToken = null;

export const setAuthToken = (token) => { _accessToken = token; };
export const clearAuthToken = () => { _accessToken = null; };

const api = axios.create({
  baseURL: BASE_URL,
  // 30s timeout — Railway kan ha cold starts på ~20s efter inaktivitet
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────
api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url} | token: ${_accessToken ? 'SET' : 'NULL'}`);
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  // Säkerställ att Accept och Content-Type alltid finns
  config.headers['Accept'] = 'application/json';
  if (config.method !== 'get' && config.method !== 'delete') {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ── Response interceptor — fånga 401 och logga ut ────────────
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

/**
 * Klassificera axios-fel till ett läsbart felmeddelande på svenska.
 * Används av screens för att visa rätt meddelande.
 */
export const klassficeraFel = (error) => {
  // Timeout (ECONNABORTED) eller ingen respons alls
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      typ: 'timeout',
      meddelande:
        'Servern svarar inte just nu.\n' +
        'Railway startar upp efter inaktivitet — detta tar 15–25 sekunder.\n' +
        'Försök igen om en stund.',
      åtgärd: 'retry',
    };
  }
  // Inget nätverk / DNS-fel
  if (!error.response) {
    const code = error.code || '';
    if (code === 'ERR_NETWORK' || code === 'ERR_INTERNET_DISCONNECTED') {
      return {
        typ: 'offline',
        meddelande: 'Ingen nätverksanslutning.\nKontrollera WiFi eller mobildata.',
        åtgärd: 'retry',
      };
    }
    return {
      typ: 'nätverk',
      meddelande: `Nätverksfel (${code || error.message}).\nURL: ${(error.config?.baseURL || '') + (error.config?.url || '')}`,
      åtgärd: 'retry',
    };
  }
  // HTTP-fel
  const status = error.response.status;
  const detail = error.response.data?.detail;
  if (status === 401) return { typ: '401', meddelande: detail || 'Fel användarnamn eller lösenord.', åtgärd: 'lösenord' };
  if (status === 422) {
    const msgs = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : String(detail || 'Valideringsfel');
    return { typ: '422', meddelande: `Ogiltiga uppgifter: ${msgs}`, åtgärd: 'inmatning' };
  }
  if (status === 429) return { typ: '429', meddelande: 'För många försök — vänta en minut.', åtgärd: 'vänta' };
  if (status >= 500) return { typ: 'server', meddelande: `Serverfel (${status}) — försök igen.`, åtgärd: 'retry' };
  return { typ: String(status), meddelande: `HTTP ${status}: ${detail || error.message}`, åtgärd: 'retry' };
};

// ── Auth ──────────────────────────────────────────────────────
export const login = async (username, password) => {
  console.log('[LOGIN] POST', `${BASE_URL}/api/auth/login`);
  const res = await api.post('/api/auth/login', { username, password });
  console.log('[LOGIN] Status:', res.status);
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
  const res = await api.get('/api/schema/', { params });
  return res.data;
};

// ── Jobb ──────────────────────────────────────────────────────
export const getJobb = async (jobbId) => {
  const res = await api.get(`/api/jobb/${jobbId}`);
  return res.data;
};

export const getJobbForWorker = async (workerId) => {
  const res = await api.get('/api/jobb/', { params: { worker_id: workerId } });
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
  const res = await api.get('/api/loner/', { params: { worker_id: workerId } });
  return res.data;
};

export const getLonSpecifikation = async (lonId) => {
  const res = await api.get(`/api/loner/${lonId}/specifikation`);
  return res.data;
};

export default api;
