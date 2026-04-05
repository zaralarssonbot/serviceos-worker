import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Linking, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../components/Card';
import Knapp from '../components/Knapp';
import Spinner from '../components/Spinner';
import { COLORS, jobbTypEtikett, jobbTypFarg } from '../services/auth';
import { getJobb, startaJobb, avslutaJobb } from '../services/api';

const AVKLARADE_KEY = 'avklarade_jobb_antal';

const STATUS_ETIKETT = {
  OBOKAD: 'Obokad', TILLDELAD: 'Tilldelad', PAGAENDE: 'Pågående',
  KLAR: 'Klar', FAKTURERAD: 'Fakturerad', BETALD: 'Betald',
};
const STATUS_FARG = {
  OBOKAD: '#6B7280', TILLDELAD: '#3B82F6', PAGAENDE: '#F59E0B',
  KLAR: '#10B981', FAKTURERAD: '#8B5CF6', BETALD: '#10B981',
};

async function begärRecension() {
  try {
    const nuvarandeStr = await AsyncStorage.getItem(AVKLARADE_KEY);
    const nya = (nuvarandeStr ? parseInt(nuvarandeStr) : 0) + 1;
    await AsyncStorage.setItem(AVKLARADE_KEY, String(nya));
    // Begär recension vid exakt 5 avklarade jobb (en gång)
    if (nya === 5 && await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  } catch (e) {
    // Recensionsfel blockerar inte flödet
  }
}

export default function JobbDetaljerScreen({ route, navigation }) {
  const { jobbId } = route.params;
  const [jobb, setJobb] = useState(null);
  const [laddar, setLaddar] = useState(true);
  const [agerar, setAgerar] = useState(false);

  useEffect(() => {
    laddaJobb();
  }, [jobbId]);

  const laddaJobb = async () => {
    try {
      setLaddar(true);
      const data = await getJobb(jobbId);
      setJobb(data);
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte hämta jobbdetaljer');
      navigation.goBack();
    } finally {
      setLaddar(false);
    }
  };

  const hamtaGPS = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Platsbehörighet krävs', 'Aktivera platstjänster för att checka in/ut.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 5,
    });
    return loc.coords;
  };

  const handleStarta = async () => {
    Alert.alert('Starta jobb', 'Vill du starta jobbet nu? Din GPS-position sparas.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Starta', style: 'default', onPress: async () => {
          setAgerar(true);
          try {
            const gps = await hamtaGPS();
            const uppdaterat = await startaJobb(jobbId, gps?.latitude, gps?.longitude);
            setJobb(uppdaterat);
            Alert.alert('✅ Jobb startat', 'Din position har sparats. Lycka till!');
          } catch (e) {
            Alert.alert('Fel', e.response?.data?.detail || 'Kunde inte starta jobbet');
          } finally {
            setAgerar(false);
          }
        }
      },
    ]);
  };

  const handleAvsluta = async () => {
    Alert.alert('Avsluta jobb', 'Bekräfta att jobbet är klart. Din GPS-position sparas.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Avsluta', style: 'destructive', onPress: async () => {
          setAgerar(true);
          try {
            const gps = await hamtaGPS();
            const uppdaterat = await avslutaJobb(jobbId, gps?.latitude, gps?.longitude);
            setJobb(uppdaterat);
            Alert.alert('🎉 Jobb avslutat', 'Bra jobbat! Jobbet är nu markerat som klart.');
            // Räkna upp och begär eventuell App Store-recension
            await begärRecension();
          } catch (e) {
            Alert.alert('Fel', e.response?.data?.detail || 'Kunde inte avsluta jobbet');
          } finally {
            setAgerar(false);
          }
        }
      },
    ]);
  };

  const öppnaKarta = () => {
    const lat = jobb?.gps_start_lat || 59.3293;
    const lng = jobb?.gps_start_lng || 18.0686;
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${lat},${lng}`
      : `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  if (laddar) return <Spinner text="Hämtar jobbinfo..." />;
  if (!jobb) return null;

  const prisMedMoms = jobb.pris_exkl_moms * (1 + jobb.moms_procent);
  const kundBetalar = jobb.rut_avdrag
    ? (jobb.pris_exkl_moms - jobb.rut_avdrag) * (1 + jobb.moms_procent)
    : prisMedMoms;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status-banner */}
      <View style={[styles.statusBanner, { backgroundColor: STATUS_FARG[jobb.status] + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_FARG[jobb.status] }]} />
        <Text style={[styles.statusText, { color: STATUS_FARG[jobb.status] }]}>
          {STATUS_ETIKETT[jobb.status] || jobb.status}
        </Text>
      </View>

      {/* Jobbinfo */}
      <Card>
        <View style={styles.typRow}>
          <View style={[styles.typBadge, { backgroundColor: jobbTypFarg(jobb.typ) + '20' }]}>
            <Text style={[styles.typText, { color: jobbTypFarg(jobb.typ) }]}>
              {jobbTypEtikett(jobb.typ)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRad}>
          <Text style={styles.infoEtikett}>📅 Starttid</Text>
          <Text style={styles.infoVarde}>
            {new Date(jobb.startdatum).toLocaleDateString('sv-SE', {
              weekday: 'short', day: 'numeric', month: 'short',
            })} kl {new Date(jobb.startdatum).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {jobb.uppskattad_sluttid && (
          <View style={styles.infoRad}>
            <Text style={styles.infoEtikett}>🏁 Uppskattad sluttid</Text>
            <Text style={styles.infoVarde}>
              {new Date(jobb.uppskattad_sluttid).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {jobb.faktisk_sluttid && (
          <View style={styles.infoRad}>
            <Text style={styles.infoEtikett}>✅ Faktisk sluttid</Text>
            <Text style={[styles.infoVarde, { color: COLORS.success }]}>
              {new Date(jobb.faktisk_sluttid).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </Card>

      {/* Ekonomi */}
      <Card>
        <Text style={styles.kortRubrik}>Ersättning</Text>
        <View style={styles.infoRad}>
          <Text style={styles.infoEtikett}>Pris (exkl. moms)</Text>
          <Text style={styles.infoVarde}>{jobb.pris_exkl_moms.toFixed(0)} kr</Text>
        </View>
        {jobb.rut_avdrag > 0 && (
          <View style={styles.infoRad}>
            <Text style={styles.infoEtikett}>RUT-avdrag</Text>
            <Text style={[styles.infoVarde, { color: COLORS.success }]}>-{jobb.rut_avdrag.toFixed(0)} kr</Text>
          </View>
        )}
        <View style={[styles.infoRad, styles.totalRad]}>
          <Text style={styles.totalEtikett}>Kund betalar</Text>
          <Text style={styles.totalVarde}>{kundBetalar.toFixed(0)} kr</Text>
        </View>
      </Card>

      {/* GPS / Karta */}
      <Card onPress={öppnaKarta}>
        <Text style={styles.kortRubrik}>📍 Plats</Text>
        {jobb.gps_start_lat ? (
          <Text style={styles.gpsKoord}>
            {jobb.gps_start_lat.toFixed(5)}, {jobb.gps_start_lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.ingenGPS}>Ingen startposition sparad ännu</Text>
        )}
        <Text style={styles.kartaLank}>Öppna i karta →</Text>
      </Card>

      {/* Noteringar */}
      {jobb.noteringar && (
        <Card>
          <Text style={styles.kortRubrik}>📝 Instruktioner</Text>
          <Text style={styles.noteringar}>{jobb.noteringar}</Text>
        </Card>
      )}

      {/* Åtgärdsknappar */}
      <View style={styles.knappar}>
        {jobb.status === 'TILLDELAD' && (
          <Knapp
            title="▶ Starta jobb"
            onPress={handleStarta}
            loading={agerar}
            style={styles.startaKnapp}
          />
        )}
        {jobb.status === 'PAGAENDE' && (
          <Knapp
            title="⏹ Avsluta jobb"
            onPress={handleAvsluta}
            loading={agerar}
            variant="danger"
          />
        )}
        {(jobb.status === 'KLAR' || jobb.status === 'FAKTURERAD' || jobb.status === 'BETALD') && (
          <View style={styles.klartBox}>
            <Text style={styles.klartText}>✅ Jobbet är avslutat</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, marginBottom: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontWeight: '700', fontSize: 15 },
  typRow: { marginBottom: 12 },
  typBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  typText: { fontSize: 13, fontWeight: '700' },
  infoRad: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoEtikett: { color: COLORS.textSecondary, fontSize: 14 },
  infoVarde: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  kortRubrik: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  totalRad: { borderBottomWidth: 0, marginTop: 4 },
  totalEtikett: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  totalVarde: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  gpsKoord: { color: COLORS.textSecondary, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  ingenGPS: { color: COLORS.textSecondary, fontSize: 14 },
  kartaLank: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 8 },
  noteringar: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  knappar: { marginTop: 8, gap: 12 },
  startaKnapp: {},
  klartBox: { backgroundColor: COLORS.success + '15', borderRadius: 14, padding: 16, alignItems: 'center' },
  klartText: { color: COLORS.success, fontSize: 16, fontWeight: '700' },
});
