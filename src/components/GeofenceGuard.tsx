import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui';
import { useAppTheme } from '@/app/_layout';
import { fonts } from '@/constants/theme';

type Status = 'checking' | 'ok' | 'unsupported' | 'error';
type Coverage = { cityId: string; city: string; lat: number; lng: number; radiusKm: number; zones: { zone: string; lat: number; lng: number; radiusKm: number }[] };

/**
 * Location verification is NON-BLOCKING: the app always opens. Failures show
 * as a dismissible in-app notification with a Retry button, and the supported
 * city coordinates are listed so a user inside Uyo/Eket can see exactly where
 * we cover instead of hitting a dead end.
 */
export function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const { colors } = useAppTheme();

  const verifyWithBackend = useCallback(async (lat: number, lng: number) => {
    const res = await apiFetch<{ data: { serviceable: boolean; city?: string } }>(
      `/v1/geo/zones/check?lat=${lat}&lng=${lng}`,
    );
    setStatus(res.data?.serviceable ? 'ok' : 'unsupported');
  }, []);

  const checkLocation = useCallback(async () => {
    setDismissed(false);
    setStatus('checking');
    try {
      if (Platform.OS === 'web' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            verifyWithBackend(position.coords.latitude, position.coords.longitude).catch((e) => {
              console.error(e);
              setErrorMsg('Could not verify your location. Check your connection.');
              setStatus('error');
            });
          },
          (error) => {
            console.error('Web Geolocation error:', error);
            setErrorMsg('Location permission is needed to confirm Kendibo is available near you.');
            setStatus('error');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      } else {
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== 'granted') {
          setErrorMsg('Location permission is needed to confirm Kendibo is available near you.');
          setStatus('error');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        await verifyWithBackend(location.coords.latitude, location.coords.longitude);
      }
    } catch (e) {
      console.error('Geofence check failed:', e);
      setErrorMsg('Could not verify your location. Check your connection and retry.');
      setStatus('error');
    }
  }, [verifyWithBackend]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount sync with location + backend zones; state set in async callbacks
    checkLocation();
    apiFetch<{ data: Coverage[] }>('/v1/geo/coverage')
      .then((r) => setCoverage(r.data ?? []))
      .catch(() => setCoverage([]));
  }, [checkLocation]);

  const failed = status === 'unsupported' || status === 'error';
  const showNotice = failed && !dismissed;

  return (
    <View style={styles.root}>
      {children}
      {status === 'checking' && (
        <View pointerEvents="none" style={[styles.toast, styles.checkingToast, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.toastText, { color: colors.textSecondary }]}>Verifying your location…</Text>
        </View>
      )}

      {showNotice && (
        <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: status === 'error' ? colors.error : colors.warning }]}>
          <Text style={[styles.toastTitle, { color: status === 'error' ? colors.error : colors.textPrimary }]}>
            {status === 'error' ? 'Location check failed' : 'Kendibo isn’t available here yet'}
          </Text>
          <Text style={[styles.toastText, { color: colors.textSecondary }]}>
            {status === 'error'
              ? errorMsg
              : 'You can keep browsing. We’re expanding rapidly — here’s where we live today:'}
          </Text>

          {status === 'unsupported' && coverage.length > 0 && (
            <View style={styles.coverageList}>
              {coverage.map((c) => (
                <Text key={c.cityId} style={[styles.coverageItem, { color: colors.textSecondary }]}>
                  {c.city}: Lat {c.lat.toFixed(4)}, Lng {c.lng.toFixed(4)} (±{c.radiusKm} km)
                </Text>
              ))}
            </View>
          )}

          <View style={styles.toastActions}>
            <Button title="Retry" size="sm" onPress={checkLocation} />
            <Button title="Dismiss" size="sm" variant="ghost" onPress={() => setDismissed(true)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 90,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  checkingToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    bottom: 24,
  },
  toastTitle: { fontSize: 15, fontFamily: fonts.semiBold, marginBottom: 4 },
  toastText: { fontSize: 13, lineHeight: 18 },
  coverageList: { marginTop: 8, gap: 2 },
  coverageItem: { fontSize: 12, lineHeight: 17 },
  toastActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
