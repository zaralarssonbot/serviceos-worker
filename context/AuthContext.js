import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggaIn as apiLoggaIn, loggaUt as apiLoggaUt, sparaWorkerData, hamtaWorkerData, hamtaSparatToken } from '../services/auth';
import { setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [worker, setWorker] = useState(null);
  // true medan vi kontrollerar AsyncStorage på start — förhindrar Login-flash
  const [kollar, setKollar] = useState(true);

  // ── Återställ session från AsyncStorage vid appstart ──────────
  useEffect(() => {
    (async () => {
      try {
        const [sparadToken, sparadWorker] = await Promise.all([
          hamtaSparatToken(),
          hamtaWorkerData(),
        ]);
        if (sparadToken) {
          setAuthToken(sparadToken);
          setToken(sparadToken);
        }
        if (sparadWorker) {
          setWorker(sparadWorker);
        }
      } catch (e) {
        console.log('[AUTH] Kunde inte återställa session:', e.message);
      } finally {
        setKollar(false);
      }
    })();
  }, []);

  const loggaIn = useCallback(async (username, password) => {
    const data = await apiLoggaIn(username, password);   // sparar token till AsyncStorage
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
    await apiLoggaUt();   // rensar AsyncStorage + in-memory token
    setToken(null);
    setWorker(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      worker,
      isAuthenticated: !!token,
      kollar,   // true = kontrollerar sparad session, visa splash istället för login
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
