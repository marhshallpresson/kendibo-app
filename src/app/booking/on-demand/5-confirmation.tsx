import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { apiFetch } from '../../../services/api/client';
import { useBooking } from '../../../services/queryClient';
import {
  useMatchCandidates,
  usePickProvider,
} from '../../../hooks/useBookingTracking';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { theme, spacing, typography, radii, fonts } from '../../../constants/theme';
import { formatKoboToNaira } from '../../../utils/currency';
import { avatarSource } from '../../../constants/images';
import {
  CheckCircle2,
  Search,
  Loader2,
  MapPin,
  Star,
  Clock,
  XCircle,
} from '@/components/ui/icons';

interface ServiceRequestStatus {
  id: string;
  status: string;
  bookingId?: string | null;
}

export default function ConfirmationScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const resetStore = useOnDemandStore((s) => s.reset);

  const { data: request, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: () => apiFetch<ServiceRequestStatus>(`/v1/service-requests/${requestId}`),
    enabled: !!requestId,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status ?? '').toUpperCase();
      return status === 'ACCEPTED' || status === 'BOOKED' || status === 'CANCELLED' ? false : 8000;
    },
  });

  const status = String(request?.status ?? '').toUpperCase();
  const bookingId = request?.bookingId || '';
  const isAccepted = status === 'ACCEPTED' || status === 'BOOKED';

  const { data: booking } = useBooking(bookingId);
  const bookingStatus = String(booking?.status ?? '').toUpperCase();

  const showCandidates = bookingStatus === 'MATCHING' && !!bookingId;
  const { data: candidatesData, isLoading: candidatesLoading } = useMatchCandidates(
    bookingId,
    { enabled: showCandidates }
  );

  const pickProviderMutation = usePickProvider(bookingId);

  const handlePickProvider = (providerId: string) => {
    pickProviderMutation.mutate(
      { providerId },
      {
        onSuccess: () => {
          Alert.alert('Provider Selected', 'You have selected a provider. We will notify them.');
        },
        onError: (error: any) => {
          Alert.alert('Error', error?.message || 'Could not pick provider');
        },
      }
    );
  };

  const handleFinish = () => {
    resetStore();
    router.dismissAll();
    router.replace('/(tabs)/bookings');
  };

  const canTrack =
    bookingStatus === 'PROVIDER_ACCEPTED' ||
    bookingStatus === 'EN_ROUTE' ||
    bookingStatus === 'IN_PROGRESS' ||
    bookingStatus === 'ARRIVED' ||
    bookingStatus === 'CHECK_IN' ||
    bookingStatus === 'INSPECTION' ||
    bookingStatus === 'COMPLETED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        {!isAccepted && !showCandidates && !canTrack ? (
          <>
            <View style={styles.iconContainer}>
              <Search size={48} color={theme.light.colors.primary} />
            </View>
            <Text style={styles.title}>Finding a Professional</Text>
            <Text style={styles.desc}>
              Your request has been submitted. We&apos;re matching you with the best available pros nearby.
            </Text>
            <View style={styles.statusRow}>
              <Loader2 size={20} color={theme.light.colors.textMuted} />
              <Text style={styles.statusText}>
                {isLoading || isRefetching ? 'Searching…' : 'Waiting for a pro to accept…'}
              </Text>
            </View>
            {!isLoading && !isRefetching && (
              <Button
                title="Check Again"
                onPress={() => refetch()}
                style={styles.checkButton}
                variant="outline"
                size="sm"
              />
            )}
          </>
        ) : null}

        {showCandidates && (
          <View style={styles.candidatesSection}>
            <View style={styles.iconContainer}>
              <Loader2 size={32} color={theme.light.colors.primary} />
            </View>
            <Text style={styles.title}>Finding your provider…</Text>
            <Text style={styles.desc}>
              We&apos;re matching you with nearby professionals. Here are the candidates we found.
            </Text>

            {candidatesData?.slaExhausted && (candidatesData?.candidates?.length === 0) && (
              <Card variant="flat" padding="md" style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <XCircle size={20} color={theme.light.colors.error} />
                  <Text style={styles.infoText}>No providers available at this time. Please try again later.</Text>
                </View>
              </Card>
            )}

            {(candidatesData?.candidates?.length || 0) > 0 && (
              <View style={styles.candidatesList}>
                {(candidatesData?.candidates || []).map((candidate) => (
                  <Card key={candidate.providerId} variant="flat" padding="md" style={styles.candidateCard}>
                    <View style={styles.candidateRow}>
                      <Image
                        source={avatarSource(candidate.avatarUrl)}
                        style={styles.candidateAvatar}
                      />
                      <View style={styles.candidateInfo}>
                        <View style={styles.candidateHeader}>
                          <Text style={styles.candidateName}>{candidate.name}</Text>
                          {candidate.rating > 0 && (
                            <View style={styles.ratingRow}>
                              <Star size={12} color="#FF9800" fill="#FF9800" />
                              <Text style={styles.ratingText}>{candidate.rating.toFixed(1)}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.metaRow}>
                          {candidate.distanceKm !== null && (
                            <View style={styles.metaItem}>
                              <MapPin size={12} color={theme.light.colors.textMuted} />
                              <Text style={styles.metaText}>{candidate.distanceKm} km</Text>
                            </View>
                          )}
                          {candidate.etaMinutes !== null && (
                            <View style={styles.metaItem}>
                              <Clock size={12} color={theme.light.colors.textMuted} />
                              <Text style={styles.metaText}>{candidate.etaMinutes} min</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.priceText}>{formatKoboToNaira(candidate.rateKobo)}</Text>
                      </View>
                    </View>
                    <Button
                      title={pickProviderMutation.isPending ? 'Selecting...' : 'Choose this provider'}
                      onPress={() => handlePickProvider(candidate.providerId)}
                      style={styles.chooseButton}
                      disabled={pickProviderMutation.isPending || candidate.declined || candidate.offered}
                    />
                  </Card>
                ))}
              </View>
            )}

            {(candidatesLoading || pickProviderMutation.isPending) && (
              <View style={styles.statusRow}>
                <Loader2 size={20} color={theme.light.colors.textMuted} />
                <Text style={styles.statusText}>
                  {pickProviderMutation.isPending ? 'Selecting provider...' : 'Loading candidates...'}
                </Text>
              </View>
            )}
          </View>
        )}

        {canTrack && (
          <>
            <View style={styles.iconContainer}>
              <CheckCircle2 size={48} color={theme.light.colors.success} />
            </View>
            <Text style={styles.title}>Provider Assigned</Text>
            <Text style={styles.desc}>
              {bookingStatus === 'COMPLETED'
                ? 'Your service has been completed.'
                : 'Your provider is ready. Track their progress in real-time.'}
            </Text>
            {booking?.provider && (
              <Card variant="flat" padding="md" style={styles.providerCard}>
                <View style={styles.candidateRow}>
                  <Image
                    source={avatarSource(booking.provider.avatarUrl)}
                    style={styles.candidateAvatar}
                  />
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{booking.provider.name}</Text>
                    <Badge
                      label={bookingStatus.replace('_', ' ')}
                      variant={bookingStatus === 'COMPLETED' ? 'success' : 'info'}
                      size="sm"
                    />
                  </View>
                </View>
              </Card>
            )}
            <Button
              title="Track your provider"
              onPress={() => router.push(`/tracking/map/${bookingId}`)}
              style={styles.trackButton}
            />
          </>
        )}

        {isAccepted && !canTrack && !showCandidates && (
          <>
            <View style={styles.iconContainer}>
              <CheckCircle2 size={48} color={theme.light.colors.success} />
            </View>
            <Text style={styles.title}>A Pro Accepted!</Text>
            <Text style={styles.desc}>
              A professional is assigned to your request. Track their status in your bookings.
            </Text>
            <Button
              title="View Booking"
              onPress={handleFinish}
              style={styles.button}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  contentContainer: { flexGrow: 1, padding: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${theme.light.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: theme.light.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: theme.light.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: { marginTop: 40, width: '100%' },
  checkButton: { marginTop: 24 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  statusText: {
    color: theme.light.colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  candidatesSection: { width: '100%', alignItems: 'center' },
  infoCard: { marginTop: 16, width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: {
    flex: 1,
    color: theme.light.colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  candidatesList: { width: '100%', marginTop: 16, gap: 12 },
  candidateCard: { width: '100%' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  candidateAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.light.colors.surfaceCard,
    marginRight: spacing.md,
  },
  candidateInfo: { flex: 1 },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  candidateName: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: theme.light.colors.textPrimary,
    flex: 1,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: theme.light.colors.textPrimary,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: theme.light.colors.textMuted,
  },
  priceText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: theme.light.colors.primary,
  },
  chooseButton: { marginTop: 8 },
  trackButton: { marginTop: 24, width: '100%' },
  providerCard: { marginTop: 16, width: '100%' },
});
