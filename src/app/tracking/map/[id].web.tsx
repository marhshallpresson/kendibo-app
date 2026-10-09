import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import { useBooking } from '../../../services/queryClient';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { Header } from '../../../components/ui/Header';
import { Button } from '../../../components/ui/Button';
import { spacing, typography, radii, ColorTokens } from '../../../constants/theme';
import { useAppTheme } from '../../_layout';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

type LatLngTuple = [number, number];

export default function TrackingMapScreenWeb() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = typeof id === 'string' ? id : '';

  const { data: booking, isLoading } = useBooking(bookingId);
  const { data: tracking, isLoading: isTrackingLoading } = useBookingTracking(bookingId);

  if (isLoading || !booking) {
    return (
      <View style={styles.container}>
        <Header title="Tracking Job" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Button title="Loading Map..." onPress={() => {}} />
        </View>
      </View>
    );
  }

  const addressCoords: LatLngTuple | null = booking.address?.coordinates
    ? [booking.address.coordinates.latitude, booking.address.coordinates.longitude]
    : null;

  const destinationCoords: LatLngTuple | null = tracking?.destination
    ? [tracking.destination.lat, tracking.destination.lng]
    : addressCoords;

  const providerCoords: LatLngTuple | null = tracking?.location
    ? [tracking.location.lat, tracking.location.lng]
    : null;

  const center: LatLngTuple | null = destinationCoords || providerCoords || null;

  const hasProviderLocation = Boolean(providerCoords);
  const hasDestination = Boolean(destinationCoords);

  const destinationLabel =
    tracking?.destination?.label ||
    (booking.address ? `${booking.address.houseNumber} ${booking.address.street}` : 'Destination');

  const providerName = tracking?.provider?.name || booking.provider?.name || 'Technician';
  const etaMinutes = tracking?.etaMinutes ?? null;

  if (!center) {
    return (
      <View style={styles.container}>
        <Header title="Tracking Job" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.emptyStateTitle}>Provider location not available yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            The map will centre here once a location is shared.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const routeLine: LatLngTuple[] | null =
    hasProviderLocation && hasDestination ? [providerCoords!, destinationCoords!] : null;

  return (
    <View style={styles.container}>
      <Header title="Tracking Job" onBack={() => router.back()} />
      <View style={styles.mapContainer}>
        <MapContainer
          key={`${center[0]},${center[1]}`}
          center={center}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routeLine && <Polyline positions={routeLine} color="#002a63" weight={4} />}

          {hasDestination && (
            <Marker position={destinationCoords!}>
              <Popup>{destinationLabel}</Popup>
            </Marker>
          )}

          {hasProviderLocation && (
            <Marker position={providerCoords!}>
              <Popup>
                {providerName}
                {etaMinutes !== null ? ` (${etaMinutes}m)` : ''}
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {!hasProviderLocation && !isTrackingLoading && (
          <View style={styles.waitingPill}>
            <Text style={styles.waitingText}>Provider location not available yet</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    mapContainer: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    emptyStateTitle: {
      ...typography.title,
      fontSize: 16,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    waitingPill: {
      position: 'absolute',
      top: spacing.md,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 6,
      borderRadius: radii.full,
    },
    waitingText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
