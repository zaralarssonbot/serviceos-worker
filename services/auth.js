import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, setAuthToken, clearAuthToken } from './api';

export const COLORS = {
  primary: '#1D9E75',
  primaryDark: '#157a5a',
  background: '#F7F9FC',
  white: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  cardBg: '#FFFFFF',
};

const TOKEN_KEY = 'access_token';

export const loggaIn = async (username, password) => {
  const data = await apiLogin(username, password);
  // Sätt token i minnet OCH spara till AsyncStorage
  setAuthToken(data.access_token);
  await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
};

export const loggaUt = async () => {
  clearAuthToken();
  await AsyncStorage.multiRemove([TOKEN_KEY, 'worker_data']);
};

export const harToken = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

export const hamtaSparatToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const sparaWorkerData = async (worker) => {
  await AsyncStorage.setItem('worker_data', JSON.stringify(worker));
};

export const hamtaWorkerData = async () => {
  const data = await AsyncStorage.getItem('worker_data');
  return data ? JSON.parse(data) : null;
};

// Formatera datum på svenska
export const formateraDatum = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
};

export const formateraTid = (dateStr) => {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
};

export const jobbTypEtikett = (typ) => {
  const etiketter = { STADNING: 'Städning', OMSORG: 'Omsorg', LOGISTIK: 'Logistik' };
  return etiketter[typ] || typ;
};

export const jobbTypFarg = (typ) => {
  const farger = {
    STADNING: '#1D9E75',
    OMSORG: '#6366F1',
    LOGISTIK: '#F59E0B',
  };
  return farger[typ] || '#6B7280';
};
