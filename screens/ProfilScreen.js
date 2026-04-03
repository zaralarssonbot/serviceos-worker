import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Knapp from '../components/Knapp';
import { COLORS } from '../services/auth';
import { useAuth } from '../context/AuthContext';

function InfoRad({ etikett, varde, farg }) {
  return (
    <View style={styles.infoRad}>
      <Text style={styles.infoEtikett}>{etikett}</Text>
      <Text style={[styles.infoVarde, farg && { color: farg }]}>{varde || '—'}</Text>
    </View>
  );
}

export default function ProfilScreen() {
  const { worker: authWorker, laddaWorker, loggaUt } = useAuth();
  const [worker, setWorker] = useState(authWorker);
  const [loggaUtLaddar, setLoggaUtLaddar] = useState(false);

  useFocusEffect(useCallback(() => {
    laddaWorker().then(setWorker);
  }, [laddaWorker]));

  const handleLoggaUt = () => {
    Alert.alert(
      'Logga ut',
      'Är du säker på att du vill logga ut?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Logga ut', style: 'destructive', onPress: async () => {
            setLoggaUtLaddar(true);
            await loggaUt();
            // AppNavigator visar Login automatiskt när isAuthenticated → false
          }
        },
      ]
    );
  };

  if (!worker) return null;

  const kommunskattProcent = ((worker.kommunskattesats || 0.32) * 100).toFixed(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSektion}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(worker.fornamn?.[0] || '?').toUpperCase()}{(worker.efternamn?.[0] || '').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.namn}>{worker.fornamn} {worker.efternamn}</Text>
        <Text style={styles.email}>{worker.email}</Text>
        <View style={[styles.aktivBadge, worker.aktiv !== false ? styles.aktiv : styles.inaktiv]}>
          <Text style={styles.aktivText}>{worker.aktiv !== false ? '● Aktiv' : '● Inaktiv'}</Text>
        </View>
      </View>

      {/* Kontaktinfo */}
      <Text style={styles.sektionRubrik}>Kontaktuppgifter</Text>
      <Card>
        <InfoRad etikett="📧 E-post" varde={worker.email} />
        <InfoRad etikett="📱 Telefon" varde={worker.telefon} />
        <InfoRad etikett="📅 Anställd sedan" varde={
          worker.anstallningsdatum
            ? new Date(worker.anstallningsdatum).toLocaleDateString('sv-SE')
            : null
        } />
      </Card>

      {/* Skatt & Lön */}
      <Text style={styles.sektionRubrik}>Skatt & ersättning</Text>
      <Card>
        <View style={styles.fSkattRad}>
          <View>
            <Text style={styles.fSkattEtikett}>F-skattsedel</Text>
            <Text style={styles.fSkattInfo}>
              {worker.f_skatt_godkand
                ? 'Godkänd — du ansvarar för din skatt'
                : 'Ej godkänd — A-skatt dras av arbetsgivaren'}
            </Text>
          </View>
          <View style={[
            styles.fSkattBadge,
            worker.f_skatt_godkand ? styles.fSkattJa : styles.fSkattNej
          ]}>
            <Text style={styles.fSkattBadgeText}>
              {worker.f_skatt_godkand ? 'JA' : 'NEJ'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <InfoRad
          etikett="🏛 Kommunskatt"
          varde={`${kommunskattProcent}%`}
        />
        <InfoRad
          etikett="💼 Arbetsgivaravgift"
          varde={worker.f_skatt_godkand ? '0%' : '31.42%'}
          farg={worker.f_skatt_godkand ? COLORS.success : null}
        />
        <InfoRad
          etikett="🏖 Semesterersättning"
          varde="12% av bruttolön"
        />
      </Card>

      {/* Skattekalkyl */}
      <Text style={styles.sektionRubrik}>Snabbkalkyl (150 kr/h)</Text>
      <Card style={styles.kalkylCard}>
        {[
          { h: 8, label: '8h (heltidsdag)' },
          { h: 40, label: '40h (heltidsvecka)' },
          { h: 160, label: '160h (heltidsmånad)' },
        ].map(({ h, label }) => {
          const brutto = h * 150 * 1.12; // inkl. semesterersättning
          const skatt = brutto * (worker.kommunskattesats || 0.32);
          const netto = brutto - skatt;
          return (
            <View key={h} style={styles.kalkylRad}>
              <Text style={styles.kalkylLabel}>{label}</Text>
              <View style={styles.kalkylSiffror}>
                <Text style={styles.kalkylNetto}>{netto.toFixed(0)} kr</Text>
                <Text style={styles.kalkylNetto2}>netto</Text>
              </View>
            </View>
          );
        })}
        <Text style={styles.kalkylAnm}>* Baserat på minimilön 150 kr/h, kommunalskatt {kommunskattProcent}%</Text>
      </Card>

      {/* Logga ut */}
      <Knapp
        title="Logga ut"
        onPress={handleLoggaUt}
        loading={loggaUtLaddar}
        variant="outline"
        style={styles.loggaUtKnapp}
      />

      <Text style={styles.version}>serviceOS Worker App v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  avatarSektion: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  namn: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  aktivBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  aktiv: { backgroundColor: COLORS.success + '20' },
  inaktiv: { backgroundColor: COLORS.error + '20' },
  aktivText: { fontWeight: '700', fontSize: 13, color: COLORS.success },
  sektionRubrik: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  infoRad: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoEtikett: { color: COLORS.textSecondary, fontSize: 14 },
  infoVarde: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
  fSkattRad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fSkattEtikett: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  fSkattInfo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, maxWidth: '80%' },
  fSkattBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fSkattJa: { backgroundColor: COLORS.success + '20' },
  fSkattNej: { backgroundColor: COLORS.error + '20' },
  fSkattBadgeText: { fontWeight: '800', fontSize: 13, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  kalkylCard: { backgroundColor: COLORS.white },
  kalkylRad: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  kalkylLabel: { color: COLORS.textSecondary, fontSize: 14 },
  kalkylSiffror: { alignItems: 'flex-end' },
  kalkylNetto: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  kalkylNetto2: { fontSize: 11, color: COLORS.textSecondary },
  kalkylAnm: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10 },
  loggaUtKnapp: { marginTop: 24 },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 20 },
});
