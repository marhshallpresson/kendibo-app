import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from '@/components/ui/icons';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';
import { useLocationStore } from '../../../stores/locationStore';
import { apiFetch } from '../../../services/api/client';

type CoverageCity = { cityId: string; city: string; lat: number; lng: number; radiusKm: number };
type FlyTarget = { lat: number; lng: number };

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/** (0,0) means "no fix yet" — never a city default. */
function isRealCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function ClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Re-centres the map for programmatic moves only (GPS / coverage), never for clicks. */
function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.setView([target.lat, target.lng]);
  }, [target, map]);
  return null;
}

/** Web variant — react-native-maps has no web implementation, so Leaflet renders here. */
export default function KycLocationScreenWeb() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { location, setLocation } = useKycStore();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() =>
    isRealCoord(location.latitude, location.longitude)
      ? { lat: location.latitude, lng: location.longitude }
      : null,
  );
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [radiusStr, setRadiusStr] = useState(location.radiusKm.toString());
  const [locating, setLocating] = useState(coords == null);
  const [notice, setNotice] = useState('');
  const locatedRef = useRef(false);

  const locateOnce = useCallback(async () => {
    // 1) Browser GPS.
    const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    });
    if (gps && isRealCoord(gps.lat, gps.lng)) {
      setLocating(false);
      setCoords(gps);
      setFlyTarget(gps);
      useLocationStore.getState().setCoordinates({ latitude: gps.lat, longitude: gps.lng });
      return;
    }
    // 2) Backend-configured coverage center (launch city from the API — never hardcoded).
    try {
      const coverage = await apiFetch<CoverageCity[] | null>('/v1/geo/coverage', { auth: false });
      const first = Array.isArray(coverage)
        ? coverage.find((c) => isRealCoord(c.lat, c.lng))
        : undefined;
      if (first) {
        const next = { lat: first.lat, lng: first.lng };
        setLocating(false);
        setCoords(next);
        setFlyTarget(next);
        return;
      }
    } catch (e) {
      console.warn('coverage unavailable', e);
    }
    setLocating(false);
    setNotice('Location permission denied or unavailable — click the map to pin your base.');
  }, []);

  useEffect(() => {
    if (locatedRef.current) return;
    locatedRef.current = true;
    if (coords) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve GPS/coverage on mount; every setState inside locateOnce runs after an await
    void locateOnce();
  }, [coords, locateOnce]);

  const handleUseMyLocation = () => {
    setLocating(true);
    setNotice('');
    void locateOnce();
  };

  const handleNext = () => {
    if (!coords) return;
    setLocation({ latitude: coords.lat, longitude: coords.lng, radiusKm: parseFloat(radiusStr) || 10 });
    router.push('/(provider)/kyc/payout');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Service Area" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        {coords ? (
          <MapContainer center={[coords.lat, coords.lng]} zoom={12} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyTo target={flyTarget} />
            <ClickSetter onPick={(a, b) => setCoords({ lat: a, lng: b })} />
            <Marker position={[coords.lat, coords.lng]} />
            <Circle center={[coords.lat, coords.lng]} radius={(parseFloat(radiusStr) || 10) * 1000} />
          </MapContainer>
        ) : (
          <View style={[styles.mapFallback, { backgroundColor: colors.primaryLight }]}>
            <MapPin size={40} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bold, textAlign: 'center' }}>
              {locating ? 'Finding your location…' : notice || 'Location unavailable'}
            </Text>
            <Button
              title="Use my current location"
              onPress={handleUseMyLocation}
              size="sm"
              variant="secondary"
              loading={locating}
              icon={<Navigation size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 4: Location &amp; Radius</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Click the map to pin your base location and set how far you are willing to travel.
        </Text>
        <Button
          title="Use my current location"
          onPress={handleUseMyLocation}
          size="md"
          variant="secondary"
          loading={locating}
          icon={<Navigation size={16} color={colors.primary} />}
          style={styles.locateBtn}
        />
        <Input
          label="Service Radius (km)"
          value={radiusStr}
          onChangeText={setRadiusStr}
          keyboardType="numeric"
          placeholder="e.g. 15"
        />
        <Button
          title="Continue to Payouts"
          onPress={handleNext}
          size="lg"
          disabled={!coords}
          style={styles.continueBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  mapFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
  },
  bottomCard: {
    borderTopLeftRadius: radii.modalSheet,
    borderTopRightRadius: radii.modalSheet,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    marginTop: -20,
  },
  title: { fontFamily: fonts.display, fontSize: 22, marginBottom: spacing.sm },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.lg },
  locateBtn: { marginBottom: spacing.md },
  continueBtn: { width: '100%', marginTop: spacing.md },
});
