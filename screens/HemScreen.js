import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Knapp from '../components/Knapp';
import Spinner from '../components/Spinner';
import { hamtaWorkerData, COLORS, formateraTid, jobbTypEtikett, jobbTypFarg } from '../services/auth';
import { getSchema } from '../services/api';

const CACHE_WORKER = 'hem_worker_v1';
const CACHE_SCHEMA = 'hem_schema_v1';

function dagensVeckodag() {
  return new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function minuterKvar(startdatum) {
  const nu = new Date();
  const start = new Date(startdatum);
  return Math.round((start - nu) / 60000);
}

export default function HemScreen({ navigation }) {
  const [worker, setWorker] = useState(null);
  const [dagensPas, setDagensPas] = useState([]);
  const [nastaJobb, setNastaJobb] = useState(null);
  const [laddar, setLaddar] = useState(true);
  const [refreshar, setRefreshar] = useState(false);
  const [offline, setOffline] = useState(false);

  const beraknaLastaJobb = (schema) => {
    const nu = new Date();
    const kommande = (schema || [])
      .filter(s => new Date(s.datum + 'T' + s.starttid) > nu)
      .sort((a, b) => new Date(a.datum + 'T' + a.starttid) - new Date(b.datum + 'T' + b.starttid));
    setNastaJobb(kommande[0] || null);
  };

  const ladda = useCallback(async () => {
    try {
      const w = await hamtaWorkerData();
      setWorker(w);
      await AsyncStorage.setItem(CACHE_WORKER, JSON.stringify(w));

      const idag = new Date();
      const schema = await getSchema(null, formatDate(idag), formatDate(idag));
      const pas = schema || [];
      setDagensPas(pas);
      await AsyncStorage.setItem(CACHE_SCHEMA, JSON.stringify(pas));
      beraknaLastaJobb(pas);
      setOffline(false);
    } catch (e) {
      console.log('Hem-fel (försöker cache):', e.message);
      try {
        const [cachadWorker, cachatSchema] = await Promise.all([
          AsyncStorage.getItem(CACHE_WORKER),
          AsyncStorage.getItem(CACHE_SCHEMA),
        ]);
        if (cachadWorker) setWorker(JSON.parse(cachadWorker));
        if (cachatSchema) {
          const pas = JSON.parse(cachatSchema);
          setDagensPas(pas);
          beraknaLastaJobb(pas);
        }
        setOffline(true);
      } catch (cacheErr) {
        console.log('Cache-fel:', cacheErr.message);
      }
    } finally {
      setLaddar(false);
      setRefreshar(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { ladda(); }, [ladda]));

  const onRefresh = () => { setRefreshar(true); ladda(); };

  const totalTimmar = dagensPas.reduce((acc, s) => {
    const start = new Date(`${s.datum}T${s.starttid}`);
    const slut = new Date(`${s.datum}T${s.sluttid}`);
    return acc + (slut - start) / 3600000;
  }, 0);

  const kanCheckaIn = nastaJobb && Math.abs(minuterKvar(nastaJobb.datum + 'T' + nastaJobb.starttid)) <= 30;

  if (laddar) return <Spinner text="Hämtar ditt schema..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshar} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Offline-banner */}
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📴 Offline – visar cachat schema</Text>
        </View>
      )}

      {/* Hälsning */}
      <View style={styles.halsning}>
        <Text style={styles.hej}>Hej, {worker?.fornamn || 'Worker'}! 👋</Text>
        <Text style={styles.datum}>{dagensVeckodag()}</Text>
      </View>

      {/* Statusrad */}
      <View style={styles.statusrad}>
        <View style={styles.statBox}>
          <Text style={styles.statSiffra}>{dagensPas.length}</Text>
          <Text style={styles.statEtikett}>Pass idag</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statSiffra}>{totalTimmar.toFixed(1)}h</Text>
          <Text style={styles.statEtikett}>Totalt idag</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statSiffra, { color: COLORS.success }]}>
            {dagensPas.filter(s => s.bekraftad).length}
          </Text>
          <Text style={styles.statEtikett}>Bekräftade</Text>
        </View>
      </View>

      {/* Nästa jobb */}
      <Text style={styles.sektionRubrik}>Nästa pass</Text>
      {nastaJobb ? (
        <Card>
          <View style={styles.jobbHeader}>
            <View style={[styles.typBadge, { backgroundColor: jobbTypFarg(nastaJobb.typ) + '20' }]}>
              <Text style={[styles.typText, { color: jobbTypFarg(nastaJobb.typ) }]}>
                {jobbTypEtikett(nastaJobb.typ || 'STADNING')}
              </Text>
            </View>
            {nastaJobb.bekraftad && (
              <View style={styles.bekraftadBadge}>
                <Text style={styles.bekraftadText}>✓ Bekräftad</Text>
              </View>
            )}
          </View>
          <Text style={styles.jobbTid}>
            🕐 {nastaJobb.starttid?.slice(0, 5)} – {nastaJobb.sluttid?.slice(0, 5)}
          </Text>
          <Text style={styles.jobbDatum}>📅 {nastaJobb.datum}</Text>

          {kanCheckaIn && (
            <Knapp
              title="⚡ Checka in nu"
              onPress={() => navigation.navigate('Schema')}
              style={styles.checkInKnapp}
            />
          )}
          {!kanCheckaIn && nastaJobb && (
            <Text style={styles.tidKvar}>
              {minuterKvar(nastaJobb.datum + 'T' + nastaJobb.starttid) > 0
                ? `Startar om ${minuterKvar(nastaJobb.datum + 'T' + nastaJobb.starttid)} min`
                : 'Pågår nu'}
            </Text>
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.ingenData}>Inga fler pass idag 🎉</Text>
        </Card>
      )}

      {/* Alla pass idag */}
      {dagensPas.length > 0 && (
        <>
          <Text style={styles.sektionRubrik}>Alla pass idag</Text>
          {dagensPas.map((s) => (
            <Card key={s.id} style={styles.pasRad}>
              <View style={styles.pasInfo}>
                <Text style={styles.pasTid}>{s.starttid?.slice(0,5)} – {s.sluttid?.slice(0,5)}</Text>
                <Text style={styles.pasTyp}>{jobbTypEtikett(s.typ || 'STADNING')}</Text>
              </View>
              {s.ob_tillagg && <Text style={styles.obBadge}>OB</Text>}
            </Card>
          ))}
        </>
      )}

      {/* Demo-meddelande om demo-worker */}
      {worker?.id === 'demo-worker' && (
        <Card style={styles.demoBox}>
          <Text style={styles.demoText}>
            💡 Demo-läge aktiv. Koppla din worker-profil i Inställningar för att se riktigt schema.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  offlineBanner: {
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    marginBottom: 12, alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  offlineText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  halsning: { marginBottom: 20, marginTop: 8 },
  hej: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  datum: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  statusrad: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statSiffra: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statEtikett: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  sektionRubrik: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  jobbHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typText: { fontSize: 12, fontWeight: '700' },
  bekraftadBadge: { backgroundColor: COLORS.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bekraftadText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
  jobbTid: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  jobbDatum: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  checkInKnapp: { marginTop: 8 },
  tidKvar: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 },
  ingenData: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15, padding: 8 },
  pasRad: { padding: 12 },
  pasInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pasTid: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  pasTyp: { fontSize: 13, color: COLORS.textSecondary },
  obBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.warning + '20',
    color: COLORS.warning, fontSize: 11, fontWeight: '700',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden',
  },
  demoBox: { backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  demoText: { color: '#1D4ED8', fontSize: 13, lineHeight: 20 },
});
