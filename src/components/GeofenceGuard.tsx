import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui';
import { useAppTheme } from '@/app/_layout';

export function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'supported' | 'unsupported' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { colors } = useAppTheme();

  const verifyWithBackend = async (lat: number, lng: number) => {
    if (Platform.OS === 'web') {
      // For web, use Mapbox reverse geocoding via our backend to get the precise city name
      const reverseRes = await apiFetch<{ data: { city: string } }>(
        `/v1/geo/reverse-geocode?lat=${lat}&lng=${lng}`
      );
      
      const cityRes = await apiFetch<{ data: any[] }>(`/v1/cities`);
      
      const mapboxCity = reverseRes.data?.city?.toLowerCase();
      // Check if the city returned by Mapbox matches any of our supported cities
      const isSupported = cityRes.data?.some((c: any) => c.id.toLowerCase() === mapboxCity || c.name.toLowerCase() === mapboxCity);
      
      if (isSupported) {
        setStatus('supported');
      } else {
        setStatus('unsupported');
      }
    } else {
      // For app, use the precise spatial zone check which is already integrated with live tracking
      const res = await apiFetch<{ data: { serviceable: boolean } }>(
        `/v1/geo/zones/check?lat=${lat}&lng=${lng}`
      );
      
      if (res.data?.serviceable) {
        setStatus('supported');
      } else {
        setStatus('unsupported');
      }
    }
  };

  const checkLocation = async () => {
    setStatus('loading');
    try {
      if (Platform.OS === 'web' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            verifyWithBackend(position.coords.latitude, position.coords.longitude).catch(e => {
              console.error(e);
              setErrorMsg('Failed to verify location with backend.');
              setStatus('error');
            });
          },
          (error) => {
            console.error('Web Geolocation error:', error);
            setErrorMsg('Browser location permission is required.');
            setStatus('error');
          }
        );
      } else {
        // App Location fetching
        let { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== 'granted') {
          setErrorMsg('Location permission is required to use Kendibo.');
          setStatus('error');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        await verifyWithBackend(location.coords.latitude, location.coords.longitude);
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
