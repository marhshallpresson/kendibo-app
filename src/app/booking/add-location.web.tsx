import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react-native';
import { Header, Button } from '../../components/ui';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function ClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Web variant — Leaflet instead of react-native-maps (no web implementation). */
export default function AddLocationScreenWeb() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentAddress } = useLocationStore();

  const [lat, setLat] = useState(currentAddress?.coordinates?.latitude || 9.06);
  const [lng, setLng] = useState(currentAddress?.coordinates?.longitude || 7.49);
  const [addressText] = useState('Gwarinpa, Abuja');

  const handleContinue = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Your Address/Location" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        <MapContainer center={[lat, lng]} zoom={13} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickSetter
            onPick={(a, b) => {
              setLat(a);
              setLng(b);
            }}
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </View>
      <View style={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <View style={styles.handle} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Location Details</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>Address</Text>
        <Pressable style={[styles.inputBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.inputText, { color: colors.textPrimary }]} numberOfLines={1}>
            {addressText}
          </Text>
          <MapPin size={20} color={colors.textPrimary} />
        </Pressable>
        <Button title="Continue" onPress={handleContinue} size="lg" style={styles.continueBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  bottomCard: {
    borderTopLeftRadius: radii.modalSheet,
    borderTopRightRadius: radii.modalSheet,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    marginTop: -20,
  },
  handle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: radii.full, alignSelf: 'center', marginBottom: spacing.lg },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center', marginBottom: spacing.md },
  divider: { height: 1, width: '100%', marginBottom: spacing.lg },
  label: { fontFamily: fonts.semiBold, fontSize: 16, marginBottom: spacing.sm },
  inputBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.lg },
  inputText: { fontSize: 15, flex: 1 },
  continueBtn: { width: '100%' },
});
