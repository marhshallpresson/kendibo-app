import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapView, Camera, MarkerView } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { MapPin, Navigation } from '@/components/ui/icons';
import { Header, Button, Input } from '../../components/ui';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { useAuthStore } from '../../stores/authStore';
import { useAddAddress } from '../../services/queryClient';
import { apiFetch } from '@/services/api/client';
import { initMapbox } from '@/services/mapbox';

type MapCenter = { latitude: number; longitude: number };
type CoverageCity = { cityId: string; city: string; lat: number; lng: number; radiusKm: number };
type GeoResult = { lat?: number; lng?: number; formatted?: string };

/** ~0.01° street-level delta equivalent in Mapbox zoom. */
const ZOOM_STREET = 15;
const REVERSE_DEBOUNCE_MS = 450;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_CHARS = 3;

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

export default function AddLocationScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const { currentAddress, currentCoordinates } = useLocationStore();
  const addAddressMutation = useAddAddress();
  const hasMapbox = initMapbox();
  const cameraRef = useRef<React.ElementRef<typeof Camera>>(null);

  const [center, setCenter] = useState<MapCenter | null>(() => {
    if (isRealCoord(currentAddress?.coordinates?.latitude, currentAddress?.coordinates?.longitude)) {
      return { latitude: currentAddress!.coordinates.latitude, longitude: currentAddress!.coordinates.longitude };
    }
    if (isRealCoord(currentCoordinates?.latitude, currentCoordinates?.longitude)) {
      return { latitude: currentCoordinates!.latitude, longitude: currentCoordinates!.longitude };
    }
    return null;
  });
  const centerRef = useRef<MapCenter | null>(center);

  const [addressText, setAddressText] = useState('');
  const [hint, setHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(center == null);
  const [city, setCity] = useState<string | undefined>(currentAddress?.city);

  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  /** Who owns the address input: typed text wins over reverse-geocode labels. */
  const sourceRef = useRef<'gps' | 'map' | 'input'>('gps');
  const mountedRef = useRef(true);

  const applyCenter = useCallback((lat: number, lng: number, zoom = ZOOM_STREET) => {
    setCenter({ latitude: lat, longitude: lng });
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: zoom,
      animationDuration: 400,
    });
  }, []);

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

  const locateOnce = useCallback(async () => {
    // 1) Real device GPS.
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        if (isRealCoord(latitude, longitude)) {
          if (!mountedRef.current) return;
          setLocating(false);
          sourceRef.current = 'gps';
          applyCenter(latitude, longitude);
          await reverseGeocode(latitude, longitude);
          return;
        }
      }
    } catch (e) {
      console.warn('GPS unavailable', e);
    }
    // 2) Backend-configured coverage center (launch city from the API — never hardcoded).
    try {
      const coverage = await apiFetch<CoverageCity[] | null>('/v1/geo/coverage', { auth: false });
      const first = Array.isArray(coverage)
        ? coverage.find((c) => isRealCoord(c.lat, c.lng))
        : undefined;
      if (first && mountedRef.current) {
        setLocating(false);
        sourceRef.current = 'gps';
        applyCenter(first.lat, first.lng);
        await reverseGeocode(first.lat, first.lng);
        return;
      }
    } catch (e) {
      console.warn('coverage unavailable', e);
    }
    if (!mountedRef.current) return;
    setLocating(false);
    setHint('Location unavailable. Type your address to search for it.');
  }, [applyCenter, reverseGeocode]);

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
        applyCenter(lat as number, lng as number);
        setHint('');
        // Refresh city only — reverseGeocode must not overwrite typed text.
        void reverseGeocode(lat as number, lng as number);
      } catch (e) {
        if (seq === searchSeqRef.current) console.warn('forward geocode failed', e);
      }
    },
    [applyCenter, reverseGeocode],
  );

  useEffect(() => {
    mountedRef.current = true;
    const start = centerRef.current;
    if (start) {
      void reverseGeocode(start.latitude, start.longitude);
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

  const handleMapIdle = (state: { properties?: { center?: number[] } }) => {
    const c = state?.properties?.center;
    if (!Array.isArray(c) || c.length < 2 || !isRealCoord(c[1], c[0])) return;
    setCenter({ latitude: c[1], longitude: c[0] });
    if (sourceRef.current === 'input') return; // programmatic move caused by a typed search
    sourceRef.current = 'map';
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    reverseDebounceRef.current = setTimeout(() => {
      void reverseGeocode(c[1], c[0]);
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
    if (!center) {
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
        coordinates: { latitude: center.latitude, longitude: center.longitude },
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
        {Platform.OS === 'web' || !center || !hasMapbox ? (
          <View style={[styles.mapFallback, { backgroundColor: colors.primaryLight }]}>
            <MapPin size={40} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bold, textAlign: 'center' }}>
              {!hasMapbox
                ? 'Map unavailable'
                : !center
                  ? locating
                    ? 'Finding your location…'
                    : 'Location unavailable'
                  : 'Map View'}
            </Text>
            {!center && (
              <Button
                title="Use my current location"
                onPress={handleUseMyLocation}
                size="sm"
                variant="secondary"
                loading={locating}
                icon={<Navigation size={16} color={colors.primary} />}
              />
            )}
          </View>
        ) : (
          <MapView style={styles.map} onMapIdle={handleMapIdle}>
            <Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: [center.longitude, center.latitude],
                zoomLevel: ZOOM_STREET,
              }}
            />
            <MarkerView coordinate={[center.longitude, center.latitude]}>
              <MapPin size={32} color={colors.primary} />
            </MarkerView>
          </MapView>
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
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
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
    marginTop: -20, // Overlap map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.lg,
  },
  locateBtn: {
    marginBottom: spacing.sm,
  },
  continueBtn: {
    width: '100%',
  },
});
