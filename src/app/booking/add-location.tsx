import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { Header, Button } from '../../components/ui';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { apiFetch } from '@/services/api/client';

export default function AddLocationScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentAddress } = useLocationStore();

  const [region, setRegion] = useState({
    latitude: currentAddress?.coordinates?.latitude ?? 0,
    longitude: currentAddress?.coordinates?.longitude ?? 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [addressText, setAddressText] = useState('');
  const [hint, setHint] = useState('');
  const [city, setCity] = useState<string | undefined>(currentAddress?.city);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (region.latitude !== 0 || region.longitude !== 0) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async GPS init on mount
    (async () => {
      try {
        const { status: permissionStatus } = await Location.getForegroundPermissionsAsync();
        if (permissionStatus !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status !== 'granted' || !mounted) return;
        }
        const location = await Location.getCurrentPositionAsync({});
        if (!mounted) return;
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [region.latitude, region.longitude]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await apiFetch<{ area?: string; city?: string }>(`/v1/geo/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res) {
        const label = [res.area, res.city].filter(Boolean).join(', ');
        setAddressText(label);
        setCity(res.city || undefined);
        setHint('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegionChangeComplete = (r: typeof region) => {
    setRegion(r);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      reverseGeocode(r.latitude, r.longitude);
    }, 500);
  };

  const handleContinue = () => {
    if (!addressText.trim()) {
      setHint('Please select or wait for the address to be detected');
      return;
    }
    useLocationStore.getState().setAddress({
      id: 'picked',
      street: addressText,
      city,
      state: undefined,
      coordinates: { latitude: region.latitude, longitude: region.longitude },
    } as any);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Your Address/Location" onBack={() => router.back()} />
      
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={[styles.webMapFallback, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>Map View</Text>
            <MapPin size={40} color={colors.primary} />
          </View>
        ) : (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
          </MapView>
        )}
      </View>

      <View style={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <View style={styles.handle} />
        
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Location Details</Text>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <Text style={[styles.label, { color: colors.textPrimary }]}>Address</Text>
        
        <View style={[styles.inputBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.inputText, { color: colors.textPrimary }]} numberOfLines={1}>
            {addressText || 'Move the map to detect address'}
          </Text>
          <MapPin size={20} color={colors.textPrimary} />
        </View>
        {hint ? (
          <Text style={{ color: colors.error, fontFamily: fonts.regular, fontSize: 12, marginBottom: spacing.sm }}>
            {hint}
          </Text>
        ) : null}

        <Button
          title="Continue"
          onPress={handleContinue}
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
  webMapFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
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
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  inputText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    flex: 1,
    marginRight: spacing.sm,
  },
  continueBtn: {
    width: '100%',
  },
});


