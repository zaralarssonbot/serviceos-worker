import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggaIn as apiLoggaIn, loggaUt as apiLoggaUt, sparaWorkerData, hamtaWorkerData } from '../services/auth';
import { setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Token hålls i minnet — inga async-problem, aldrig null mellan renders
  const [token, setToken] = useState(null);
  const [worker, setWorker] = useState(null);

  const loggaIn = useCallback(async (username, password) => {
    const data = await apiLoggaIn(username, password);
    setToken(data.access_token);
    return data;
  }, []);

  const sparaWorker = useCallback(async (workerData) => {
    await sparaWorkerData(workerData);
    setWorker(workerData);
  }, []);

  const laddaWorker = useCallback(async () => {
    const data = await hamtaWorkerData();
    if (data) setWorker(data);
    return data;
  }, []);

  const loggaUt = useCallback(async () => {
    clearAuthToken();
    setToken(null);
    setWorker(null);
    await AsyncStorage.removeItem('worker_data');
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      worker,
      isAuthenticated: !!token,
      loggaIn,
      loggaUt,
      sparaWorker,
      laddaWorker,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth måste användas inuti AuthProvider');
  return ctx;
}
