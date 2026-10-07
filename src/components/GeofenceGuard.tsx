import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui';
import { useAppTheme } from '@/app/_layout';

export function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'supported' | 'unsupported' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { colors } = useAppTheme();

  const checkLocation = async () => {
    setStatus('loading');
    try {
      let { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setErrorMsg('Location permission is required to use Kendibo.');
        setStatus('error');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      const res = await apiFetch<{ data: { serviceable: boolean } }>(
        `/v1/geo/zones/check?lat=${location.coords.latitude}&lng=${location.coords.longitude}`
      );
      
      if (res.data?.serviceable) {
        setStatus('supported');
      } else {
        setStatus('unsupported');
      }
    } catch (e) {
      console.error('Geofence check failed:', e);
      setErrorMsg('Failed to verify your location. Please check your network.');
      setStatus('error');
    }
  };

  useEffect(() => {
    checkLocation();
  }, []);

  if (status === 'supported') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {status === 'loading' && <Text style={{ color: colors.textPrimary }}>Verifying your location...</Text>}
      
      {status === 'unsupported' && (
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Not Available Here</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Kendibo is not yet supported in your location. We are expanding rapidly, check back later!
          </Text>
          <Button title="Refresh Location" onPress={checkLocation} />
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.error }]}>Location Error</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{errorMsg}</Text>
          <Button title="Try Again" onPress={checkLocation} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  center: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  }
});
