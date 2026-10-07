import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ABUJA: [number, number] = [9.06, 7.49];

function ClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Web variant — react-native-maps has no web implementation, so Leaflet renders here. */
export default function KycLocationScreenWeb() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { location, setLocation } = useKycStore();

  const [lat, setLat] = useState(location.latitude || ABUJA[0]);
  const [lng, setLng] = useState(location.longitude || ABUJA[1]);
  const [radiusStr, setRadiusStr] = useState(location.radiusKm.toString());

  const handleNext = () => {
    setLocation({ latitude: lat, longitude: lng, radiusKm: parseFloat(radiusStr) || 10 });
    router.push('/(provider)/kyc/payout');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Service Area" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        <MapContainer center={[lat, lng]} zoom={12} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickSetter onPick={(a, b) => { setLat(a); setLng(b); }} />
          <Marker position={[lat, lng]} />
          <Circle center={[lat, lng]} radius={(parseFloat(radiusStr) || 10) * 1000} />
        </MapContainer>
      </View>
      <ScrollView contentContainerStyle={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 4: Location &amp; Radius</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Click the map to pin your base location and set how far you are willing to travel.
        </Text>
        <Input
          label="Service Radius (km)"
          value={radiusStr}
          onChangeText={setRadiusStr}
          keyboardType="numeric"
          placeholder="e.g. 15"
        />
        <Button title="Continue to Payouts" onPress={handleNext} size="lg" style={styles.continueBtn} />
      </ScrollView>
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
    paddingTop: spacing.lg,
    marginTop: -20,
  },
  title: { fontFamily: fonts.display, fontSize: 22, marginBottom: spacing.sm },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.lg },
  continueBtn: { width: '100%', marginTop: spacing.md },
});
