import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobApi } from '@/services/api/jobs';
import { fileManager } from '@/services/fileManager';
import { MapPin, Camera, CheckSquare, Square } from 'lucide-react-native';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { Header, Button, Badge, EmptyState } from '../../../components/ui';
import type { BadgeVariant } from '../../../components/ui/Badge';
import { useAuthStore } from '../../../stores/authStore';
import { useProviderId } from '../../../hooks/useProviderId';
import { useTrackingLocation } from '../../../hooks/useTrackingLocation';
import { formatKoboToNaira } from '../../../utils/currency';

const ACTIVE_JOURNEY_STATUSES = new Set(['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']);

/** Server job machine: provider-driven forward transitions (POST /v1/jobs/:id/transition). */
const NEXT_TRANSITION: Record<string, { to: string; label: string }> = {
  PROVIDER_ACCEPTED: { to: 'EN_ROUTE', label: 'Start — Head En Route' },
  EN_ROUTE: { to: 'ARRIVED', label: 'I Have Arrived' },
  ARRIVED: { to: 'IN_PROGRESS', label: 'Start Job' },
  IN_PROGRESS: { to: 'COMPLETED', label: 'Mark Job Completed' },
};

/** Statuses where the offer accept path applies if no offer row is matched. */
const ACCEPT_VIA_TRANSITION = new Set(['CONFIRMED', 'PROVIDER_ASSIGNED', 'MATCHING']);

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  OFFER: { label: 'New offer', variant: 'warning' },
  PROVIDER_ACCEPTED: { label: 'Accepted', variant: 'info' },
  EN_ROUTE: { label: 'En route', variant: 'info' },
  ARRIVED: { label: 'Arrived', variant: 'info' },
  IN_PROGRESS: { label: 'In progress', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
};

const CHECKLIST = [
  { id: '1', text: 'Arrived at the service location' },
  { id: '2', text: 'Completed the requested service' },
  { id: '3', text: 'Cleaned up after the job' },
];

function errText(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
}

export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const qc = useQueryClient();

  const routeId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const providerId = useProviderId();
  const token = useAuthStore((s) => s.token);

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['provider-offers', providerId],
    enabled: !!providerId,
    queryFn: () => jobApi.getOffers(providerId!),
    refetchInterval: 10000,
  });

  const {
    data: booking,
    isLoading: bookingLoading,
    isError: bookingFailed,
    refetch,
  } = useQuery({
    queryKey: ['provider-booking', providerId, routeId],
    enabled: !!providerId && !!routeId,
    queryFn: () => jobApi.getProviderBooking(providerId!, routeId),
  });

  const offer = offers.find(
    (o) =>
      o.jobId === routeId ||
      o.bookingId === routeId ||
      (booking?.id ? o.bookingId === booking.id : false) ||
      o.id === routeId,
  );

  const pendingOffer = offer && offer.status === 'offered' ? offer : undefined;
  const bookingStatus = (booking?.status ?? '').toUpperCase();
  const offerAccepted = offer?.status === 'accepted';
  // The dispatch status can lag behind the offer response; if the provider
  // already accepted the offer, treat the job as PROVIDER_ACCEPTED until the
  // booking catches up.
  const status =
    offerAccepted &&
    (bookingStatus === '' ||
      bookingStatus === 'UNKNOWN' ||
      bookingStatus === 'CONFIRMED' ||
      bookingStatus === 'MATCHING' ||
      bookingStatus === 'PROVIDER_ASSIGNED')
      ? 'PROVIDER_ACCEPTED'
      : bookingStatus;
  const step = pendingOffer ? 'OFFER' : status;
  const jobId = booking?.jobId ?? offer?.jobId ?? routeId;

  // Real GPS batch upload while the job is live (EN_ROUTE..IN_PROGRESS).
  useTrackingLocation({
    token: token ?? undefined,
    providerId,
    activeJourney: ACTIVE_JOURNEY_STATUSES.has(status),
  });

  const invalidateJobQueries = () => {
    qc.invalidateQueries({ queryKey: ['provider-booking'] });
    qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    qc.invalidateQueries({ queryKey: ['provider-offers'] });
    qc.invalidateQueries({ queryKey: ['provider-jobs'] });
    qc.invalidateQueries({ queryKey: ['booking', booking?.id ?? routeId] });
  };

  const respondMutation = useMutation({
    mutationFn: ({ accept }: { accept: boolean }) => jobApi.respondToOffer(offer!.id, accept),
    onSuccess: (_data, { accept }) => {
      invalidateJobQueries();
      if (!accept) {
        Alert.alert('Offer declined', 'You declined this job offer.');
        router.back();
      }
    },
    onError: (err) => Alert.alert('Could not respond', errText(err)),
  });

  const transitionMutation = useMutation({
    mutationFn: (to: string) => jobApi.transitionState(jobId, to),
    onSuccess: (_data, to) => {
      invalidateJobQueries();
      if (to === 'COMPLETED') {
        Alert.alert('Job completed', 'The job has been marked as complete.');
        router.replace('/(provider)/bookings');
      }
    },
    onError: (err) => Alert.alert('Could not update job', errText(err)),
  });

  const uploadEvidence = async (uri: string) => {
    try {
      await fileManager.queueForUpload({
        localUri: uri,
        endpoint: `/v1/provider/jobs/${jobId}/evidence`,
        mimeType: 'image/jpeg',
        fieldName: 'file',
        additionalData: { type: 'post_service' },
      });
      await fileManager.processOutbox();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheck = (cid: string) => {
    setCheckedItems((prev) => (prev.includes(cid) ? prev.filter((item) => item !== cid) : [...prev, cid]));
  };

  const addEvidence = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setEvidence((prev) => [...prev, uri]);
      uploadEvidence(uri);
    }
  };

  const handleTransition = (to: string) => {
    if (to === 'COMPLETED') {
      if (checkedItems.length < CHECKLIST.length) {
        Alert.alert('Incomplete checklist', 'Please tick every checklist item before completing the job.');
        return;
      }
      if (evidence.length === 0) {
        Alert.alert('Proof of work required', 'Please add at least one photo of the completed work.');
        return;
      }
    }
    transitionMutation.mutate(to);
  };

  const openNavigation = () => {
    const destination =
      booking?.lat != null && booking?.lng != null
        ? `${booking.lat},${booking.lng}`
        : booking?.address ?? offer?.address ?? '';
    if (!destination) {
      Alert.alert('No location yet', 'This job does not have a service address yet.');
      return;
    }
    const q = encodeURIComponent(destination);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`).catch(() => {
      Alert.alert('Navigation unavailable', 'Could not open the maps app.');
    });
  };

  const badge = STATUS_BADGE[step] ?? { label: step ? step.toLowerCase() : 'Unknown', variant: 'neutral' as BadgeVariant };
  const next = NEXT_TRANSITION[status];
  const canAcceptViaTransition = !pendingOffer && !offer && ACCEPT_VIA_TRANSITION.has(status);
  const showExecutionCards =
    !!next || status === 'ARRIVED' || ACTIVE_JOURNEY_STATUSES.has(status) || canAcceptViaTransition;

  const serviceName = booking?.serviceTitle ?? offer?.serviceTitle ?? booking?.serviceId ?? offer?.serviceId ?? 'Job details';
  const customerName = booking?.customerName ?? offer?.customerName ?? 'Customer';
  const scheduledAt = booking?.scheduledAt ?? offer?.scheduledAt;
  const totalKobo = booking?.totalKobo ?? offer?.totalKobo;

  const waiting = !providerId || !routeId || offersLoading || bookingLoading;

  if (waiting) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Job Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking && !offer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Job Details" onBack={() => router.back()} />
        {bookingFailed ? (
          <EmptyState
            title="Couldn't load this job"
            description="We couldn't fetch the job details. Check your connection and try again."
            buttonTitle="Retry"
            onButtonPress={() => refetch()}
          />
        ) : (
          <EmptyState
            title="Job not found"
            description="This job doesn't exist or is no longer assigned to you."
            buttonTitle="Go back"
            onButtonPress={() => router.back()}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Job Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {pendingOffer && (
          <View style={[styles.card, styles.offerCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.offerTitle, { color: colors.textPrimary }]}>New job offer</Text>
            <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
              Accept this job to start the assignment, or decline to pass it on.
            </Text>
            <View style={styles.offerRow}>
              <Button
                title="Decline"
                variant="outline"
                style={styles.offerBtn}
                loading={respondMutation.isPending && respondMutation.variables?.accept === false}
                onPress={() => respondMutation.mutate({ accept: false })}
              />
              <Button
                title="Accept Job"
                style={styles.offerBtn}
                loading={respondMutation.isPending && respondMutation.variables?.accept === true}
                onPress={() => respondMutation.mutate({ accept: true })}
              />
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{serviceName}</Text>
            <Badge label={badge.label} variant={badge.variant} />
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {customerName}
            {scheduledAt ? ` • ${new Date(scheduledAt).toLocaleString()}` : ''}
          </Text>
          {!!booking?.address && (
            <View style={styles.addressRow}>
              <MapPin size={16} color={colors.primary} />
              <Text style={[styles.address, { color: colors.textPrimary }]}>{booking.address}</Text>
            </View>
          )}
          {!!totalKobo && (
            <Text style={[styles.price, { color: colors.primary }]}>{formatKoboToNaira(Number(totalKobo))}</Text>
          )}
          <Button title="Navigate to Location" variant="outline" style={styles.navBtn} onPress={openNavigation} />
        </View>

        {!pendingOffer && next && (
          <Button
            title={next.label}
            size="lg"
            loading={transitionMutation.isPending}
            onPress={() => handleTransition(next.to)}
          />
        )}
        {canAcceptViaTransition && (
          <Button
            title="Accept Job"
            size="lg"
            loading={transitionMutation.isPending}
            onPress={() => transitionMutation.mutate('PROVIDER_ACCEPTED')}
          />
        )}
        {status === 'COMPLETED' && (
          <Text style={[styles.terminalNote, { color: colors.textSecondary }]}>
            This job has been completed.
          </Text>
        )}
        {status === 'CANCELLED' && (
          <Text style={[styles.terminalNote, { color: colors.error }]}>This job was cancelled.</Text>
        )}

        {showExecutionCards && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Service Checklist</Text>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Check off items as you complete them</Text>
            <View style={styles.checklist}>
              {CHECKLIST.map((item) => {
                const isChecked = checkedItems.includes(item.id);
                return (
                  <Pressable key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)}>
                    {isChecked ? (
                      <CheckSquare size={24} color={colors.primary} />
                    ) : (
                      <Square size={24} color={colors.border} />
                    )}
                    <Text
                      style={[
                        styles.checkText,
                        { color: isChecked ? colors.textPrimary : colors.textSecondary },
                        isChecked && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {showExecutionCards && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Proof of Work</Text>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Take photos to verify completion</Text>
            <View style={styles.evidenceGrid}>
              {evidence.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.evidenceImage} />
              ))}
              <Pressable style={[styles.addEvidence, { borderColor: colors.border }]} onPress={addEvidence}>
                <Camera size={32} color={colors.textSecondary} />
                <Text style={[styles.addEvidenceText, { color: colors.textSecondary }]}>Add Photo</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  offerCard: { borderWidth: 1.5 },
  offerTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: 4 },
  offerDesc: { fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.md },
  offerRow: { flexDirection: 'row', gap: spacing.md },
  offerBtn: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: 20, flex: 1 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, marginBottom: spacing.md, marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  address: { fontFamily: fonts.medium, fontSize: 14, flex: 1 },
  price: { fontFamily: fonts.bold, fontSize: 18, marginBottom: spacing.md },
  navBtn: { width: '100%' },
  terminalNote: { fontFamily: fonts.medium, fontSize: 14, textAlign: 'center', paddingVertical: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18 },
  helper: { fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.md, marginTop: 2 },
  checklist: { gap: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkText: { fontFamily: fonts.medium, fontSize: 15, flex: 1 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  evidenceImage: { width: 80, height: 80, borderRadius: radii.md, resizeMode: 'cover' },
  addEvidence: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEvidenceText: { fontFamily: fonts.medium, fontSize: 11, marginTop: 4 },
});
