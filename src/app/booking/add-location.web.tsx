import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react-native';
import { Header, Button, Input } from '../../components/ui';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { useAuthStore } from '../../stores/authStore';
import { useAddAddress } from '../../services/queryClient';
import { apiFetch } from '@/services/api/client';

type CoverageCity = { cityId: string; city: string; lat: number; lng: number; radiusKm: number };
type GeoResult = { lat?: number; lng?: number; formatted?: string };
type FlyTarget = { lat: number; lng: number };

const REVERSE_DEBOUNCE_MS = 450;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_CHARS = 3;

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/** (0,0) means "no fix yet" — never a real service location. */
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

/** Re-centres the map for programmatic moves only (GPS / typed search), never for clicks. */
function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.setView([target.lat, target.lng]);
  }, [target, map]);
  return null;
}

/** Web variant — Leaflet instead of react-native-maps (no web implementation). */
export default function AddLocationScreenWeb() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const { currentAddress, currentCoordinates } = useLocationStore();
  const addAddressMutation = useAddAddress();

  const initialCoords = isRealCoord(currentAddress?.coordinates?.latitude, currentAddress?.coordinates?.longitude)
    ? { lat: currentAddress!.coordinates.latitude, lng: currentAddress!.coordinates.longitude }
    : isRealCoord(currentCoordinates?.latitude, currentCoordinates?.longitude)
      ? { lat: currentCoordinates!.latitude, lng: currentCoordinates!.longitude }
      : null;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [addressText, setAddressText] = useState('');
  const [status, setStatus] = useState('');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(initialCoords == null);
  const [city, setCity] = useState<string | undefined>(currentAddress?.city);

  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  /** Who owns the address input: typed text wins over reverse-geocode labels. */
  const sourceRef = useRef<'gps' | 'map' | 'input'>('gps');
  const mountedRef = useRef(true);
  const startCoordsRef = useRef(initialCoords);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await apiFetch<{ area?: string; city?: string } | null>(
        `/v1/geo/reverse-geocode?lat=${lat}&lng=${lng}`,
        { auth: false },
      );
      if (!res || !mountedRef.current) return;
      const label = [res.area, res.city].filter(Boolean).join(', ');
      // While the user is typing, their query is the source of truth.
      if (sourceRef.current !== 'input' && label) setAddressText(label);
      if (res.city) {
        setCity(res.city);
        useLocationStore.getState().setSelectedCity(res.city);
      }
      setHint('');
    } catch (e) {
      console.warn('reverse geocode failed', e);
    }
  }, []);

  const pickCoords = useCallback(
    (lat: number, lng: number, opts?: { fly?: boolean }) => {
      setCoords({ lat, lng });
      if (opts?.fly) setFlyTarget({ lat, lng });
      void reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  const locateOnce = useCallback(async () => {
    setStatus('Getting your location...');
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
      if (!mountedRef.current) return;
      setStatus('');
      setLocating(false);
      sourceRef.current = 'gps';
      pickCoords(gps.lat, gps.lng, { fly: true });
      return;
    }
    // 2) Backend-configured coverage center (launch city from the API — never hardcoded).
    try {
      const coverage = await apiFetch<CoverageCity[] | null>('/v1/geo/coverage', { auth: false });
      const first = Array.isArray(coverage)
        ? coverage.find((c) => isRealCoord(c.lat, c.lng))
        : undefined;
      if (first && mountedRef.current) {
        setStatus('');
        setLocating(false);
        sourceRef.current = 'gps';
        pickCoords(first.lat, first.lng, { fly: true });
        return;
      }
    } catch (e) {
      console.warn('coverage unavailable', e);
    }
    if (!mountedRef.current) return;
    setLocating(false);
    setStatus('Location permission denied or unavailable — type your address instead.');
  }, [pickCoords]);

  /** Forward geocode: typed query → map center/marker + stored coordinates. */
  const forwardGeocode = useCallback(
    async (query: string) => {
      const seq = ++searchSeqRef.current;
      try {
        const cityHint =
          useLocationStore.getState().selectedCity || useLocationStore.getState().currentAddress?.city || '';
        const url =
          `/v1/geo/geocode?q=${encodeURIComponent(query)}` +
          (cityHint ? `&city=${encodeURIComponent(cityHint)}` : '');
        const res = await apiFetch<GeoResult | null>(url, { auth: false });
        if (!mountedRef.current || seq !== searchSeqRef.current) return; // stale response
        const lat = res?.lat;
        const lng = res?.lng;
        if (!isRealCoord(lat, lng)) return;
        sourceRef.current = 'input'; // typed text stays authoritative
        pickCoords(lat as number, lng as number, { fly: true });
        setHint('');
      } catch (e) {
        if (seq === searchSeqRef.current) console.warn('forward geocode failed', e);
      }
    },
    [pickCoords],
  );

  useEffect(() => {
    mountedRef.current = true;
    const start = startCoordsRef.current;
    if (start) {
      void reverseGeocode(start.lat, start.lng);
    } else {
      void locateOnce();
    }
    return () => {
      mountedRef.current = false;
      if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [locateOnce, reverseGeocode]);

  const handleAddressChange = (text: string) => {
    sourceRef.current = 'input';
    setAddressText(text);
    setHint('');
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const query = text.trim();
    if (query.length < MIN_SEARCH_CHARS) return;
    searchDebounceRef.current = setTimeout(() => {
      void forwardGeocode(query);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handlePickOnMap = (lat: number, lng: number) => {
    if (!isRealCoord(lat, lng)) return;
    sourceRef.current = 'map';
    setCoords({ lat, lng });
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    reverseDebounceRef.current = setTimeout(() => {
      void reverseGeocode(lat, lng);
    }, REVERSE_DEBOUNCE_MS);
  };

  const handleUseMyLocation = () => {
    setLocating(true);
    setHint('');
    void locateOnce();
  };

  const handleContinue = async () => {
    const text = addressText.trim();
    if (!text) {
      setHint('Enter an address, or allow location access so we can detect one.');
      return;
    }
    if (!coords) {
      setHint('Set your location first — allow GPS or search for your address.');
      return;
    }
    if (saving) return;
    setSaving(true);
    setHint('');
    try {
      const created = await addAddressMutation.mutateAsync({
        userId: user?.id ?? '',
        label: 'Home',
        street: text,
        houseNumber: '',
        landmark: '',
        contactPhone: user?.phone ?? currentAddress?.contactPhone ?? '',
        isDefault: false,
        city: city || undefined,
        state: currentAddress?.state,
        coordinates: { latitude: coords.lat, longitude: coords.lng },
      });
      const store = useLocationStore.getState();
      store.setAddress(created);
      store.addSavedAddress(created);
      router.back();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not save this address. Check your connection and try again.';
      setHint(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Your Address/Location" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        {coords ? (
          <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyTo target={flyTarget} />
            <ClickSetter onPick={handlePickOnMap} />
            <Marker position={[coords.lat, coords.lng]} />
          </MapContainer>
        ) : (
          <View style={[styles.mapFallback, { backgroundColor: colors.primaryLight }]}>
            <MapPin size={40} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bold, textAlign: 'center' }}>
              {locating ? 'Finding your location…' : 'Location unavailable'}
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
      <View style={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <View style={styles.handle} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Location Details</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Button
          title="Use my current location"
          onPress={handleUseMyLocation}
          size="md"
          variant="secondary"
          loading={locating}
          icon={<Navigation size={16} color={colors.primary} />}
          style={styles.locateBtn}
        />
        {status ? (
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, marginBottom: spacing.sm }}>
            {status}
          </Text>
        ) : null}
        <Input
          label="Address"
          value={addressText}
          onChangeText={handleAddressChange}
          placeholder="Start typing your address…"
          leftIcon={<MapPin size={18} color={colors.textSecondary} />}
          helperText="Type to search — the map follows your address"
          error={hint || undefined}
          autoCorrect
        />
        <Button
          title={saving ? 'Saving…' : 'Continue'}
          onPress={handleContinue}
          loading={saving}
          size="lg"
          style={styles.continueBtn}
        />
      </View>
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
  handle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: radii.full, alignSelf: 'center', marginBottom: spacing.lg },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center', marginBottom: spacing.md },
  divider: { height: 1, width: '100%', marginBottom: spacing.lg },
  locateBtn: { marginBottom: spacing.sm },
  continueBtn: { width: '100%' },
});
