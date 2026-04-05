import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import Knapp from '../components/Knapp';
import { COLORS } from '../services/auth';
import { registreraPushToken } from '../services/push';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginScreen() {
  const { loggaIn, sparaWorker } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fel, setFel] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setFel('Fyll i användarnamn och lösenord');
      return;
    }
    setFel('');
    setLoading(true);
    try {
      await loggaIn(username.trim(), password);

      // Hämta riktig worker-profil från API:et (matchar på e-post)
      let workerData = null;
      try {
        const resp = await api.get('/api/workers/', { params: { limit: 200 } });
        const workers = resp.data?.items || [];
        const u = username.trim().toLowerCase();
        workerData = workers.find(w =>
          w.email?.toLowerCase() === u ||
          w.email?.toLowerCase().startsWith(u)
        ) || null;
      } catch (e) {
        console.log('[LOGIN] Worker-sökning misslyckades:', e.message);
      }

      // Fallback om ingen worker-profil hittades (t.ex. admin-konto)
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

      // Registrera Expo push-token i bakgrunden — blockerar ej login
      registreraPushToken(workerData.id).catch(e =>
        console.log('[PUSH] Registrering misslyckades:', e.message)
      );

      // isAuthenticated i AuthContext triggar AppNavigator att visa HuvudTabs
    } catch (err) {
      const httpStatus = err.response?.status;
      const serverMsg = err.response?.data?.detail;
      const reqUrl = (err.config?.baseURL || '') + (err.config?.url || '');
      console.log('[LOGIN] FEL:', JSON.stringify({
        message: err.message, code: err.code, status: httpStatus,
        url: reqUrl, response: err.response?.data,
      }));
      if (!err.response) {
        setFel(`Nätverksfel\nURL: ${reqUrl || 'okänd'}\nFel: ${err.message}\nKod: ${err.code || '-'}`);
      } else if (httpStatus === 401) {
        setFel(`401 – ${serverMsg || 'Fel användarnamn eller lösenord'}`);
      } else if (httpStatus === 422) {
        const details = Array.isArray(serverMsg)
          ? serverMsg.map(d => d.msg).join(', ')
          : JSON.stringify(err.response?.data);
        setFel(`422 Valideringsfel – ${details}`);
      } else {
        setFel(`HTTP ${httpStatus} – ${serverMsg || err.message}`);
      }
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
          </View>
        )}

        <Knapp
          title="Logga in"
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
  loginKnapp: { marginTop: 8 },
  tips: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },
});
