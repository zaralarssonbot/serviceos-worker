import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, StatusBar, TouchableOpacity,
} from 'react-native';
import Knapp from '../components/Knapp';
import { COLORS } from '../services/auth';
import { registreraPushToken } from '../services/push';
import { useAuth } from '../context/AuthContext';
import api, { klassficeraFel } from '../services/api';

export default function LoginScreen() {
  const { loggaIn, sparaWorker } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fel, setFel] = useState('');
  const [felTyp, setFelTyp] = useState('');         // 'timeout' | 'offline' | 'lösenord' | ...
  const [förfluten, setFörfluten] = useState(0);    // sekunder sedan knappen trycktes
  const timerRef = useRef(null);

  // Sekund-räknare under inloggningsförsök
  useEffect(() => {
    if (loading) {
      setFörfluten(0);
      timerRef.current = setInterval(() => setFörfluten(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setFel('Fyll i användarnamn och lösenord');
      setFelTyp('inmatning');
      return;
    }
    setFel('');
    setFelTyp('');
    setLoading(true);

    try {
      await loggaIn(username.trim(), password);

      // Hämta riktig worker-profil (matchar på e-post)
      let workerData = null;
      try {
        const resp = await api.get('/api/workers/', { params: { limit: 100 } });
        const workers = resp.data?.items || [];
        const u = username.trim().toLowerCase();
        workerData = workers.find(w =>
          w.email?.toLowerCase() === u ||
          w.email?.toLowerCase().startsWith(u)
        ) || null;
      } catch (e) {
        console.log('[LOGIN] Worker-sökning misslyckades:', e.message);
      }

      // Fallback för admin-konton utan worker-profil
      if (!workerData) {
        workerData = {
          id: null,
          fornamn: username.trim(),
          efternamn: '',
          email: username.trim(),
          kommunskattesats: 0.32,
          f_skatt_godkand: false,
        };
      }
      await sparaWorker(workerData);

      // Push-token i bakgrunden — blockerar ej
      registreraPushToken(workerData.id).catch(e =>
        console.log('[PUSH] Registrering misslyckades:', e.message)
      );

    } catch (err) {
      console.log('[LOGIN] FEL:', {
        message: err.message, code: err.code,
        status: err.response?.status,
        url: (err.config?.baseURL || '') + (err.config?.url || ''),
      });
      const klassad = klassficeraFel(err);
      setFel(klassad.meddelande);
      setFelTyp(klassad.typ);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>sOS</Text>
        </View>
        <Text style={styles.appName}>serviceOS</Text>
        <Text style={styles.tagline}>Plattform för servicepersonal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.rubrik}>Logga in</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.etikett}>Användarnamn</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ditt användarnamn"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.etikett}>Lösenord</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Ditt lösenord"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        {!!fel && (
          <View style={styles.felBox}>
            <Text style={styles.felText}>⚠ {fel}</Text>
            {felTyp === 'timeout' && (
              <TouchableOpacity style={styles.retryKnapp} onPress={handleLogin}>
                <Text style={styles.retryText}>Försök igen</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Knapp
          title={loading ? `Ansluter... (${förfluten}s)` : 'Logga in'}
          onPress={handleLogin}
          loading={loading}
          style={styles.loginKnapp}
        />

        <Text style={styles.tips}>Testkonto: admin / admin</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: { flex: 0.4, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoText: { color: COLORS.white, fontSize: 22, fontWeight: '900' },
  appName: { color: COLORS.white, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  form: {
    flex: 0.6,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingTop: 32,
  },
  rubrik: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  etikett: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: COLORS.textPrimary,
  },
  felBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  felText: { color: COLORS.error, fontSize: 14, fontWeight: '500' },
  retryKnapp: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: COLORS.error, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loginKnapp: { marginTop: 8 },
  tips: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },
});
