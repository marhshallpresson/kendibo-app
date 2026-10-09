import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ShieldAlert,
  Compass,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { useBooking } from '../../../services/queryClient';
import { useBookingTracking } from '../../../hooks/useBookingTracking';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { spacing, typography, radii, shadows, ColorTokens } from '../../../constants/theme';
import { useAppTheme } from '../../_layout';
import { avatarSource } from '../../../constants/images';

export default function TrackingMapScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView | null>(null);
  const bookingId = typeof id === 'string' ? id : '';

  // Fetch booking and live tracking
  const { data: booking, isLoading } = useBooking(bookingId);
  const { data: tracking, isLoading: isTrackingLoading } = useBookingTracking(bookingId);

  if (isLoading || !booking) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const provider = booking.provider;
  const trackingProvider = tracking?.provider;

  const addressCoords: LatLng | null = booking.address?.coordinates
    ? {
        latitude: booking.address.coordinates.latitude,
        longitude: booking.address.coordinates.longitude,
      }
    : null;

  const destinationCoords: LatLng | null = tracking?.destination
    ? {
        latitude: tracking.destination.lat,
        longitude: tracking.destination.lng,
      }
    : addressCoords;

  const providerCoords: LatLng | null = tracking?.location
    ? {
        latitude: tracking.location.lat,
        longitude: tracking.location.lng,
      }
    : null;

  // Center on the destination (or booking address), else the provider location.
  const mapCenter: LatLng | null = destinationCoords || providerCoords || null;

  const hasProviderLocation = Boolean(providerCoords);
  const hasDestination = Boolean(destinationCoords);

  const destinationLabel =
    tracking?.destination?.label ||
    (booking.address ? `${booking.address.houseNumber} ${booking.address.street}` : 'Destination');

  // Build route line if we have both
  const routeLine: LatLng[] | null = hasProviderLocation && hasDestination ? [providerCoords!, destinationCoords!] : null;

  if (!mapCenter) {
    return (
      <View style={styles.screen}>
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
          </View>
        </View>
        <View style={styles.emptyStateWrap}>
          <View style={styles.emptyStateCard}>
            <MapPin size={28} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>Provider location not available yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              The map will centre here once a location is shared.
            </Text>
            <Button title="Go Back" variant="primary" size="md" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const handleRecenter = () => {
    const target = providerCoords || destinationCoords || mapCenter;
    mapRef.current?.animateToRegion(
      {
        ...target,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500
    );
  };

  const handleCallProvider = () => {
    const phone = trackingProvider?.phone || provider?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Unable to place call', 'Could not open phone app');
      });
    } else {
      router.push(`/chat/call/${booking.id}`);
    }
  };

  const getStatusLabel = () => {
    const status = String(tracking?.status ?? booking.status ?? '').toUpperCase();
    switch (status) {
      case 'EN_ROUTE':
        return 'En Route';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'PROVIDER_ACCEPTED':
        return 'Accepted';
      case 'ARRIVED':
        return 'Arrived';
      case 'CHECK_IN':
        return 'Checked In';
      case 'INSPECTION':
        return 'Inspecting';
      case 'AWAITING_APPROVAL':
        return 'Awaiting Approval';
      case 'COMPLETED':
        return 'Completed';
      case 'PROVIDER_ASSIGNED':
        return 'Assigned';
      case 'MATCHING':
        return 'Matching';
      default:
        return status || 'Assigned';
    }
  };

  const getStatusVariant = (): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    const status = String(tracking?.status ?? booking.status ?? '').toUpperCase();
    switch (status) {
      case 'EN_ROUTE':
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'info';
    }
  };

  const etaMinutes = tracking?.etaMinutes ?? null;
  const distanceKm = tracking?.distanceKm ?? null;
  const providerName = trackingProvider?.name || provider?.name || 'Assigned Provider';

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.mapCanvas}
        initialRegion={{
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
      >
        {routeLine && (
          <Polyline coordinates={routeLine} strokeColor={colors.primary} strokeWidth={5} />
        )}

        {hasDestination && (
          <Marker
            coordinate={destinationCoords!}
            title={destinationLabel}
            anchor={{ x: 0.5, y: 0.9 }}
          >
            <View style={styles.destinationWrap}>
              {hasDestination && (
                <View style={styles.destPinCallout}>
                  <Text style={styles.destPinText}>{destinationLabel}</Text>
                </View>
              )}
              <View style={styles.destCircle}>
                <MapPin size={22} color="#FFFFFF" fill={colors.error} />
              </View>
            </View>
          </Marker>
        )}

        {hasProviderLocation && (
          <Marker
            coordinate={providerCoords!}
            title={providerName}
            anchor={{ x: 0.5, y: 0.6 }}
          >
            <View style={styles.providerWrap}>
              <View style={styles.providerMarkerCallout}>
                <Text style={styles.providerMarkerText}>
                  {providerName}
                  {etaMinutes !== null ? ` (${etaMinutes}m)` : ''}
                </Text>
              </View>
              <View style={styles.markerBadge}>
                <View style={styles.markerIcon} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

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

          {(etaMinutes !== null || distanceKm !== null) && (
            <View style={styles.etaPill}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.etaPillText}>
                {etaMinutes !== null ? `${etaMinutes} mins` : 'ETA —'}
                {distanceKm !== null ? ` • ${distanceKm} km away` : ''}
              </Text>
            </View>
          )}

          <Pressable
            style={styles.sosButton}
            accessibilityRole="button"
            accessibilityLabel="Emergency support"
          >
            <ShieldAlert size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {!hasProviderLocation && !isTrackingLoading && (
          <View style={styles.waitingPill}>
            <Text style={styles.waitingText}>Provider location not available yet</Text>
          </View>
        )}
      </View>

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

      <Card variant="elevated" padding="md" style={styles.bottomSheetCard}>
        <View style={styles.sheetHandle} />

        <View style={styles.providerProfileRow}>
          <Image
            source={avatarSource(trackingProvider?.avatarUrl || provider?.avatarUrl)}
            style={styles.sheetAvatar}
          />

          <View style={styles.sheetInfo}>
            <View style={styles.sheetNameRow}>
              <Text style={styles.sheetName}>{providerName}</Text>
              <Badge label={getStatusLabel()} variant={getStatusVariant()} size="sm" />
            </View>
            <Text style={styles.sheetSubtitle}>
              {booking.service?.name || booking.serviceId || 'Service'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <Button
            title="Call Pro"
            variant="outline"
            size="md"
            icon={<Phone size={17} color={colors.primary} />}
            style={styles.actionButton}
            onPress={handleCallProvider}
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
          <Text style={styles.viewTimelineText}>View Detailed Lifecycle Tracker</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
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
    markerIcon: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
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
    waitingPill: {
      alignSelf: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 6,
      borderRadius: radii.full,
      marginTop: spacing.sm,
      ...shadows.sm,
    },
    waitingText: {
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
      gap: spacing.sm,
    },
    sheetName: {
      ...typography.title,
      fontSize: 16,
      color: colors.textPrimary,
      flex: 1,
    },
    sheetSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 4,
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
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    emptyStateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyStateCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
      ...shadows.md,
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
  });
