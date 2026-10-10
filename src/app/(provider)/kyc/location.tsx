import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapView, Camera, MarkerView, ShapeSource, FillLayer, LineLayer } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { MapPin, Navigation } from '@/components/ui/icons';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';
import { useLocationStore } from '../../../stores/locationStore';
import { apiFetch } from '../../../services/api/client';
import { initMapbox, circlePolygon } from '../../../services/mapbox';

type MapCenter = { latitude: number; longitude: number };
type CoverageCity = { cityId: string; city: string; lat: number; lng: number; radiusKm: number };

/** ~0.1° city-level delta equivalent in Mapbox zoom. */
const ZOOM_CITY = 12;

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

export default function KycLocationScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { location, setLocation } = useKycStore();
  const hasMapbox = initMapbox();

  const [center, setCenter] = useState<MapCenter | null>(() =>
    isRealCoord(location.latitude, location.longitude)
      ? { latitude: location.latitude, longitude: location.longitude }
      : null,
  );
  const [radiusStr, setRadiusStr] = useState(location.radiusKm.toString());
  const [locating, setLocating] = useState(center == null);
  const [notice, setNotice] = useState('');
  const locatedRef = useRef(false);

  const locateOnce = useCallback(async () => {
    // 1) Real device GPS.
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        if (isRealCoord(latitude, longitude)) {
          setLocating(false);
          setCenter({ latitude, longitude });
          useLocationStore.getState().setCoordinates({ latitude, longitude });
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
      if (first) {
        setLocating(false);
        setCenter({ latitude: first.lat, longitude: first.lng });
        return;
      }
    } catch (e) {
      console.warn('coverage unavailable', e);
    }
    setLocating(false);
    setNotice('Location unavailable — allow location access to pin your base.');
  }, []);

  useEffect(() => {
    if (locatedRef.current) return;
    locatedRef.current = true;
    if (center) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve GPS/coverage on mount; every setState inside locateOnce runs after an await
    void locateOnce();
  }, [center, locateOnce]);

  const handleUseMyLocation = () => {
    setLocating(true);
    setNotice('');
    void locateOnce();
  };

  const handleNext = () => {
    if (!center) return;
    setLocation({
      latitude: center.latitude,
      longitude: center.longitude,
      radiusKm: parseFloat(radiusStr) || 10,
    });
    router.push('/(provider)/kyc/payout');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Service Area" onBack={() => router.back()} />

      <View style={styles.mapContainer}>
        {center && hasMapbox ? (
          <MapView
            style={styles.map}
            onMapIdle={(state) => {
              const c = state?.properties?.center;
              if (Array.isArray(c) && isRealCoord(c[1], c[0])) {
                setCenter({ latitude: c[1], longitude: c[0] });
              }
            }}
          >
            <Camera
              defaultSettings={{
                centerCoordinate: [center.longitude, center.latitude],
                zoomLevel: ZOOM_CITY,
              }}
              animationDuration={0}
            />
            <MarkerView coordinate={[center.longitude, center.latitude]}>
              <MapPin size={32} color={colors.primary} />
            </MarkerView>
            <ShapeSource
              id="service-radius"
              shape={circlePolygon(center.longitude, center.latitude, (parseFloat(radiusStr) || 10) * 1000)}
            >
              <FillLayer id="service-radius-fill" style={{ fillColor: 'rgba(84, 51, 235, 0.2)' }} />
              <LineLayer
                id="service-radius-line"
                style={{ lineColor: 'rgba(84, 51, 235, 0.5)', lineWidth: 1.5 }}
              />
            </ShapeSource>
          </MapView>
        ) : (
          <View style={[styles.mapFallback, { backgroundColor: colors.primaryLight }]}>
            <MapPin size={40} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bold, textAlign: 'center' }}>
              {!hasMapbox
                ? 'Map unavailable'
                : locating
                  ? 'Finding your location…'
                  : notice || 'Location unavailable'}
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 4: Location & Radius</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pin your base location and set how far you are willing to travel.
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
          disabled={!center}
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
    paddingTop: spacing.lg,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  locateBtn: {
    marginBottom: spacing.md,
  },
  continueBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
});
