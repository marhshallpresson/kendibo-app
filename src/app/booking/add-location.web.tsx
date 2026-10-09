import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react-native';
import { Header, Button } from '../../components/ui';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { apiFetch } from '@/services/api/client';

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
  const [addressText, setAddressText] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState<string | undefined>(currentAddress?.city);

  const handleContinue = () => {
    if (!addressText.trim()) return;
    useLocationStore.getState().setAddress({
      id: 'picked',
      street: addressText,
      city,
      state: undefined,
      coordinates: { latitude: lat, longitude: lng },
    } as any);
    router.back();
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('Geolocation is not supported in this browser');
      return;
    }
    setStatus('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await apiFetch<{ area?: string; city?: string }>(`/v1/geo/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res) {
            const label = [res.area, res.city].filter(Boolean).join(', ');
            setAddressText(label);
            setCity(res.city || undefined);
          }
        } catch (e) {
          console.error(e);
        }
        setStatus('');
      },
      (error) => {
        console.error(error);
        setStatus('Location permission denied or unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Your Address/Location" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        <MapContainer center={[lat, lng]} zoom={13} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickSetter
            onPick={async (a, b) => {
              setLat(a);
              setLng(b);
              try {
                const res = await apiFetch<{ area?: string; city?: string }>(`/v1/geo/reverse-geocode?lat=${a}&lng=${b}`);
                if (res) {
                  const label = [res.area, res.city].filter(Boolean).join(', ');
                  setAddressText(label);
                  setCity(res.city || undefined);
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </View>
      <View style={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <View style={styles.handle} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Location Details</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Button
          title="Use my current location"
          onPress={handleUseMyLocation}
          size="md"
          variant="secondary"
          style={styles.continueBtn}
          icon={<Navigation size={16} color={colors.primary} />}
        />
        {status ? (
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, marginVertical: spacing.sm }}>
            {status}
          </Text>
        ) : null}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Address</Text>
        <Pressable style={[styles.inputBox, { backgroundColor: colors.background }]} onPress={() => {}}>
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
  inputText: { fontSize: 15, flex: 1, fontFamily: fonts.regular },
  continueBtn: { width: '100%' },
});
