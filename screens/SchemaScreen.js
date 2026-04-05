import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Spinner from '../components/Spinner';
import { hamtaWorkerData, COLORS, jobbTypEtikett, jobbTypFarg } from '../services/auth';
import { getSchema } from '../services/api';

const DAGAR = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function veckoStart(offset = 0) {
  const d = new Date();
  const dag = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dag + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function veckoSlut(start) {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function veckodatumRubrik(start) {
  const slut = veckoSlut(start);
  return `${start.getDate()} ${start.toLocaleDateString('sv-SE', { month: 'short' })} – ${slut.getDate()} ${slut.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' })}`;
}

function cacheNyckel(veckaOffset) {
  return `schema_vecka_v1_${veckaOffset}`;
}

export default function SchemaScreen({ navigation }) {
  const [schema, setSchema] = useState([]);
  const [veckaOffset, setVeckaOffset] = useState(0);
  const [valtDatum, setValtDatum] = useState(formatDate(new Date()));
  const [laddar, setLaddar] = useState(true);
  const [refreshar, setRefreshar] = useState(false);
  const [offline, setOffline] = useState(false);

  const start = veckoStart(veckaOffset);
  const slut = veckoSlut(start);

  const ladda = useCallback(async () => {
    try {
      await hamtaWorkerData();
      const data = await getSchema(null, formatDate(start), formatDate(slut));
      const pas = data || [];
      setSchema(pas);
      await AsyncStorage.setItem(cacheNyckel(veckaOffset), JSON.stringify(pas));
      setOffline(false);
    } catch (e) {
      console.log('Schema-fel (försöker cache):', e.message);
      try {
        const cached = await AsyncStorage.getItem(cacheNyckel(veckaOffset));
        if (cached) {
          setSchema(JSON.parse(cached));
          setOffline(true);
        } else {
          setSchema([]);
          setOffline(true);
        }
      } catch (cacheErr) {
        setSchema([]);
      }
    } finally {
      setLaddar(false);
      setRefreshar(false);
    }
  }, [veckaOffset]);

  useFocusEffect(useCallback(() => { setLaddar(true); ladda(); }, [ladda]));

  const onRefresh = () => { setRefreshar(true); ladda(); };

  // Generera veckodagar
  const veckodagar = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { datum: formatDate(d), dag: DAGAR[i], nr: d.getDate() };
  });

  const passForDag = (datum) => schema.filter(s => s.datum === datum);
  const valda = passForDag(valtDatum);
  const idag = formatDate(new Date());

  if (laddar) return <Spinner text="Hämtar schema..." />;

  return (
    <View style={styles.container}>
      {/* Veckokontroll */}
      <View style={styles.veckokontroll}>
        <TouchableOpacity onPress={() => setVeckaOffset(v => v - 1)} style={styles.pilKnapp}>
          <Text style={styles.pil}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.veckorubrik}>{veckodatumRubrik(start)}</Text>
        <TouchableOpacity onPress={() => setVeckaOffset(v => v + 1)} style={styles.pilKnapp}>
          <Text style={styles.pil}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Offline-banner */}
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📴 Offline – visar cachat schema. Dra ner för att uppdatera.</Text>
        </View>
      )}

      {/* Dagväljare */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dagRad} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {veckodagar.map(({ datum, dag, nr }) => {
          const aktiv = datum === valtDatum;
          const arIdag = datum === idag;
          const harPas = passForDag(datum).length > 0;
          return (
            <TouchableOpacity
              key={datum}
              style={[styles.dagCell, aktiv && styles.dagCellAktiv]}
              onPress={() => setValtDatum(datum)}
            >
              <Text style={[styles.dagNamn, aktiv && styles.dagTextAktiv]}>{dag}</Text>
              <Text style={[styles.dagNr, aktiv && styles.dagTextAktiv, arIdag && !aktiv && styles.dagIdag]}>{nr}</Text>
              {harPas && <View style={[styles.passPrick, aktiv && styles.passPrickAktiv]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pass för valt datum */}
      <ScrollView
        style={styles.passLista}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshar} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Text style={styles.datumRubrik}>
          {new Date(valtDatum).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {valda.length === 0 ? (
          <View style={styles.ingenBox}>
            <Text style={styles.ingenEmoji}>📅</Text>
            <Text style={styles.ingenText}>Inga pass denna dag</Text>
          </View>
        ) : (
          valda.map((pas) => (
            <Card
              key={pas.id}
              onPress={() => pas.jobb_id && navigation.navigate('JobbDetaljer', { jobbId: pas.jobb_id })}
            >
              <View style={styles.pasHeader}>
                <View style={[styles.typStreck, { backgroundColor: jobbTypFarg(pas.typ || 'STADNING') }]} />
                <View style={styles.pasInfo}>
                  <Text style={styles.pasTid}>
                    {pas.starttid?.slice(0, 5)} – {pas.sluttid?.slice(0, 5)}
                  </Text>
                  <Text style={styles.pasTyp}>{jobbTypEtikett(pas.typ || 'STADNING')}</Text>
                </View>
                <View style={styles.pasMeta}>
                  {pas.ob_tillagg && (
                    <View style={styles.obBadge}>
                      <Text style={styles.obText}>OB</Text>
                    </View>
                  )}
                  {pas.bekraftad && <Text style={styles.bekraftad}>✓</Text>}
                </View>
              </View>
              {pas.jobb_id && (
                <Text style={styles.detaljer}>Tryck för jobbdetaljer →</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  veckokontroll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pilKnapp: { padding: 8 },
  pil: { fontSize: 24, color: COLORS.primary, fontWeight: '600' },
  veckorubrik: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  offlineBanner: {
    backgroundColor: '#FEF3C7', paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  offlineText: { color: '#92400E', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  dagRad: { backgroundColor: COLORS.white, maxHeight: 80, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dagCell: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10,
    marginVertical: 6, marginHorizontal: 3, borderRadius: 12, minWidth: 44,
  },
  dagCellAktiv: { backgroundColor: COLORS.primary },
  dagNamn: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dagNr: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  dagTextAktiv: { color: COLORS.white },
  dagIdag: { color: COLORS.primary },
  passPrick: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 3 },
  passPrickAktiv: { backgroundColor: COLORS.white },
  passLista: { flex: 1 },
  datumRubrik: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16, textTransform: 'capitalize' },
  ingenBox: { alignItems: 'center', paddingVertical: 48 },
  ingenEmoji: { fontSize: 40, marginBottom: 12 },
  ingenText: { color: COLORS.textSecondary, fontSize: 16 },
  pasHeader: { flexDirection: 'row', alignItems: 'center' },
  typStreck: { width: 4, height: 48, borderRadius: 2, marginRight: 12 },
  pasInfo: { flex: 1 },
  pasTid: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  pasTyp: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  pasMeta: { alignItems: 'flex-end', gap: 4 },
  obBadge: { backgroundColor: COLORS.warning + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  obText: { color: COLORS.warning, fontSize: 11, fontWeight: '700' },
  bekraftad: { color: COLORS.success, fontSize: 16, fontWeight: '800' },
  detaljer: { fontSize: 12, color: COLORS.primary, marginTop: 8, textAlign: 'right' },
});
