import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';

export default function KycLocationScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { location, setLocation } = useKycStore();
  
  const [region, setRegion] = useState({
    latitude: location.latitude || 9.06,
    longitude: location.longitude || 7.49,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const [radiusStr, setRadiusStr] = useState(location.radiusKm.toString());

  const handleNext = () => {
    setLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      radiusKm: parseFloat(radiusStr) || 10,
    });
    router.push('/(provider)/kyc/payout');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Service Area" onBack={() => router.back()} />
      
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
          <Circle
            center={{ latitude: region.latitude, longitude: region.longitude }}
            radius={(parseFloat(radiusStr) || 10) * 1000} // km to meters
            fillColor="rgba(84, 51, 235, 0.2)"
            strokeColor="rgba(84, 51, 235, 0.5)"
          />
        </MapView>
      </View>

      <View style={[styles.bottomCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 4: Location & Radius</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pin your base location and set how far you are willing to travel.
        </Text>
        
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
  continueBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
});

