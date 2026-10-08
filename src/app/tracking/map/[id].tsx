import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ShieldAlert,
  Compass,
  Star,
  Car,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { useBooking } from '../../../services/queryClient';
import { Booking } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { lightColors as colors, spacing, typography, radii, shadows } from '../../../constants/theme';
import { avatarSource } from '../../../constants/images';

const UYO_CENTER: LatLng = { latitude: 5.0377, longitude: 7.9128 };

// Simulated route around Uyo: Hub Dispatch (SW) -> My Home (NE).
// Driven by the existing routeProgress state machine (0-100%).
const ROUTE_COORDS: LatLng[] = [
  { latitude: 5.0148, longitude: 7.8902 }, // Hub Dispatch
  { latitude: 5.0215, longitude: 7.8985 },
  { latitude: 5.0298, longitude: 7.9058 },
  { latitude: 5.0377, longitude: 7.9128 }, // centre
  { latitude: 5.0452, longitude: 7.9205 },
  { latitude: 5.0525, longitude: 7.9288 }, // My Home
];

export default function TrackingMapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView | null>(null);

  // Fetch booking
  const { data: booking, isLoading } = useBooking(typeof id === 'string' ? id : '');

  // Simulated GPS movement state along the route (0% to 100%)
  const [routeProgress, setRouteProgress] = useState(35); // Initial 35% on the way
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [distanceKm, setDistanceKm] = useState(2.1);

  useEffect(() => {
    const timer = setInterval(() => {
      setRouteProgress((prev) => {
        if (prev >= 95) return 95;
        const next = prev + 2;
        return next;
      });
      setEtaMinutes((prev) => (prev > 2 ? prev - 1 : 2));
      setDistanceKm((prev) => (prev > 0.3 ? parseFloat((prev - 0.15).toFixed(1)) : 0.3));
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading || !booking) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  const provider = booking.provider;

  // Interpolate the provider coordinate along ROUTE_COORDS from routeProgress.
  // Same segment math as the previous canvas implementation.
  const { currentCoord, segmentIndex, segmentFraction } = (() => {
    const totalSegments = ROUTE_COORDS.length - 1;
    const progressFactor = routeProgress / 100;
    const idx = Math.min(Math.floor(progressFactor * totalSegments), totalSegments - 1);
    const frac = progressFactor * totalSegments - idx;
    const p1 = ROUTE_COORDS[idx];
    const p2 = ROUTE_COORDS[idx + 1];
    return {
      currentCoord: {
        latitude: p1.latitude + (p2.latitude - p1.latitude) * frac,
        longitude: p1.longitude + (p2.longitude - p1.longitude) * frac,
      } as LatLng,
      segmentIndex: idx,
      segmentFraction: frac,
    };
  })();

  void segmentFraction;

  // Completed route (travelled) + remaining route for the two-tone polyline.
  const completedRoute: LatLng[] = [...ROUTE_COORDS.slice(0, segmentIndex + 1), currentCoord];
  const remainingRoute: LatLng[] = [currentCoord, ...ROUTE_COORDS.slice(segmentIndex + 1)];

  const handleRecenter = () => {
    setRouteProgress(50);
    mapRef.current?.animateToRegion(
      {
        ...currentCoord,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500,
    );
  };

  return (
    <View style={styles.screen}>
      {/* Real map — Uyo, provider Marker driven by the timer/progress state */}
      <MapView
        ref={mapRef}
        style={styles.mapCanvas}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: UYO_CENTER.latitude,
          longitude: UYO_CENTER.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
      >
        {/* Completed (travelled) portion of the route */}
        <Polyline coordinates={completedRoute} strokeColor={colors.primary} strokeWidth={5} />
        {/* Remaining portion */}
        <Polyline coordinates={remainingRoute} strokeColor="#B9C6BD" strokeWidth={4} />

        {/* Starting depot */}
        <Marker coordinate={ROUTE_COORDS[0]} title="Hub Dispatch" anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.depotWrap}>
            <View style={styles.depotCircle} />
            <Text style={styles.depotLabel}>Hub Dispatch</Text>
          </View>
        </Marker>

        {/* Destination (customer home) */}
        <Marker
          coordinate={ROUTE_COORDS[ROUTE_COORDS.length - 1]}
          title="My Home"
          anchor={{ x: 0.5, y: 0.9 }}
        >
          <View style={styles.destinationWrap}>
            <View style={styles.destPinCallout}>
              <Text style={styles.destPinText}>My Home</Text>
            </View>
            <View style={styles.destCircle}>
              <MapPin size={22} color="#FFFFFF" fill={colors.error} />
            </View>
          </View>
        </Marker>

        {/* Moving technician GPS marker */}
        <Marker coordinate={currentCoord} title={`Emeka (${etaMinutes}m)`} anchor={{ x: 0.5, y: 0.6 }}>
          <View style={styles.providerWrap}>
            <View style={styles.providerMarkerCallout}>
              <Text style={styles.providerMarkerText}>Emeka ({etaMinutes}m)</Text>
            </View>
            <View style={styles.markerBadge}>
              <Car size={20} color="#FFFFFF" />
            </View>
          </View>
        </Marker>
      </MapView>

      {/* Top Floating Header & ETA Pill */}
      <View style={styles.topOverlay}>
        <View style={styles.topControlRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.floatingBackButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.etaPill}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.etaPillText}>
              {etaMinutes} mins • {distanceKm} km away
            </Text>
          </View>

          <Pressable
            style={styles.sosButton}
            accessibilityRole="button"
            accessibilityLabel="Emergency support"
          >
            <ShieldAlert size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.trafficAlertPill}>
          <View style={styles.trafficDot} />
          <Text style={styles.trafficText}>Traffic: Light on Main Road • Speed 42 km/h</Text>
        </View>
      </View>

      {/* Floating Compass / Recenter */}
      <View style={styles.rightFloatControls}>
        <Pressable
          style={styles.recenterButton}
          onPress={handleRecenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter location"
        >
          <Compass size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Bottom Sheet Card with Quick Contact */}
      <Card variant="elevated" padding="md" style={styles.bottomSheetCard}>
        <View style={styles.sheetHandle} />

        <View style={styles.providerProfileRow}>
          <Image source={avatarSource(provider?.avatarUrl)} style={styles.sheetAvatar} />

          <View style={styles.sheetInfo}>
            <View style={styles.sheetNameRow}>
              <Text style={styles.sheetName}>{provider?.name || 'Assigned Technician'}</Text>
              <Badge label="En Route" variant="warning" size="sm" />
            </View>
            <Text style={styles.sheetServiceRole}>
              AC Repair & Servicing • Verified Pro
            </Text>
            <View style={styles.sheetMetaRow}>
              <View style={styles.sheetRating}>
                <Star size={12} color="#FF9800" fill="#FF9800" />
                <Text style={styles.sheetRatingText}>4.9 (124)</Text>
              </View>
              <Text style={styles.bulletSeparator}>•</Text>
              <Text style={styles.sheetVehicle}>Toyota Service Van (LSR-482-AB)</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <Button
            title="Call Pro"
            variant="outline"
            size="md"
            icon={<Phone size={17} color={colors.primary} />}
            style={styles.actionButton}
            onPress={() => router.push(`/chat/call/${booking.id}`)}
          />
          <Button
            title="Chat"
            variant="primary"
            size="md"
            icon={<MessageSquare size={17} color="#FFFFFF" />}
            style={styles.actionButton}
            onPress={() => router.push(`/chat/${booking.id}`)}
          />
        </View>

        <Pressable
          onPress={() => router.push(`/tracking/${booking.id}`)}
          style={styles.viewTimelineLink}
        >
          <Text style={styles.viewTimelineText}>View Detailed 19-Stage Lifecycle Tracker</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E8ECEF',
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  destinationWrap: {
    alignItems: 'center',
  },
  destPinCallout: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginBottom: 2,
    ...shadows.sm,
  },
  destPinText: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  destCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  providerWrap: {
    alignItems: 'center',
  },
  markerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },
  providerMarkerCallout: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    ...shadows.sm,
  },
  providerMarkerText: {
    ...typography.micro,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  depotWrap: {
    alignItems: 'center',
  },
  depotCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textSecondary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  depotLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    zIndex: 30,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    gap: spacing.xs + 2,
    ...shadows.md,
  },
  etaPillText: {
    ...typography.title,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sosButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  trafficAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  trafficDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  trafficText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rightFloatControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: 240,
    zIndex: 30,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  bottomSheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.modalSheet,
    borderTopRightRadius: radii.modalSheet,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 36,
    ...shadows.modal,
    zIndex: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  providerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceCard,
    marginRight: spacing.md,
  },
  sheetInfo: {
    flex: 1,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sheetName: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sheetServiceRole: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetRatingText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 3,
  },
  bulletSeparator: {
    marginHorizontal: 6,
    color: colors.textMuted,
    fontSize: 10,
  },
  sheetVehicle: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  viewTimelineLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  viewTimelineText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
