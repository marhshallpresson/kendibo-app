import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Platform, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, MapPin, Clock, Search, CheckCircle2 } from '@/components/ui/icons';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../_layout';
import { spacing, fonts, shadows } from '../../constants/theme';
import { formatKoboToNaira } from '../../utils/currency';
import { useLocationStore } from '../../stores/locationStore';
import { apiFetch, ApiError } from '../../services/api/client';

interface ServiceRequestStatus {
  id: string;
  title: string;
  details: string;
  status: string;
  urgency: string;
  scheduledDate?: string | null;
  timeWindow?: string | null;
  bookingId?: string | null;
}

interface QuoteRevision {
  version: number;
  amountKobo?: string | number;
  status?: string;
  providerNotes?: string;
}

const STATUS_TITLES: Record<string, string> = {
  SUBMITTED: 'Request Submitted',
  MATCHING: 'Finding a Pro',
  OFFERED: 'Sent to Nearby Pros',
  ACCEPTED: 'A Pro Accepted',
  BOOKED: 'Booked',
};

export default function QuoteReviewScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { currentAddress } = useLocationStore();
  const queryClient = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: () => apiFetch<ServiceRequestStatus>(`/v1/service-requests/${requestId}`),
    enabled: !!requestId,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status ?? '').toUpperCase();
      return status === 'CANCELLED' || status === 'EXPIRED' ? false : 8000;
    },
  });

  const bookingId = request?.bookingId ?? null;

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', bookingId],
    queryFn: () => apiFetch<QuoteRevision[]>(`/v1/quotes/${bookingId}`),
    enabled: !!bookingId,
  });

  const latestQuote = quotes.length > 0 ? quotes[quotes.length - 1] : null;
  const quoteAmountKobo = latestQuote?.amountKobo ? Number(latestQuote.amountKobo) : 0;

  const approveQuote = useMutation({
    mutationFn: async () => {
      if (!bookingId || !latestQuote) throw new Error('No quote to approve yet.');
      return apiFetch(`/v1/quotes/${bookingId}/approve`, {
        method: 'POST',
        body: { version: latestQuote.version },
      });
    },
    onSuccess: () => {
      router.push({
        pathname: '/payment/checkout',
        params: {
          totalKobo: quoteAmountKobo.toString(),
          serviceId: '',
          instructions: request?.details ?? '',
        },
      });
    },
    onError: (err) => {
      Alert.alert('Could not approve', err instanceof ApiError ? err.message : 'Please try again.');
    },
  });

  const cancelRequest = useMutation({
    mutationFn: () => apiFetch(`/v1/service-requests/${requestId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      router.replace('/(tabs)/bookings');
    },
    onError: (err) => {
      Alert.alert(
        'Cannot cancel',
        err instanceof ApiError ? err.message : 'This request can no longer be cancelled.',
      );
    },
  });

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'Keep Request', style: 'cancel' },
      { text: 'Cancel Request', style: 'destructive', onPress: () => cancelRequest.mutate() },
    ]);
  };

  const status = String(request?.status ?? '').toUpperCase();
  const isResolved = status === 'CANCELLED' || status === 'EXPIRED';
  const showQuote = !!latestQuote && quoteAmountKobo > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Your Request</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <MapPin size={18} color={colors.primary} />
          <View style={styles.addressMeta}>
            <Text style={[styles.addressTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {currentAddress?.label || 'Service address'}
            </Text>
            <Text style={[styles.addressSub, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={2}>
              {currentAddress ? `${currentAddress.street}${currentAddress.landmark ? `, ${currentAddress.landmark}` : ''}` : 'Address on file'}
            </Text>
          </View>
          {request?.timeWindow ? (
            <View style={[styles.slotChip, { backgroundColor: colors.primaryLight }]}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.slotChipText, { color: colors.primary, fontFamily: fonts.semiBold }]}>
                {request.scheduledDate} | {request.timeWindow}
              </Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : !request ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, textAlign: 'center' }}>
              This request could not be loaded.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.statusRow}>
                {isResolved ? (
                  <Clock size={18} color={colors.textMuted} />
                ) : status === 'ACCEPTED' || status === 'BOOKED' ? (
                  <CheckCircle2 size={18} color={colors.success} />
                ) : (
                  <Search size={18} color={colors.primary} />
                )}
                <Text style={[styles.statusTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
                  {STATUS_TITLES[status] ?? status}
                </Text>
              </View>
              <Text style={[styles.reqTitle, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{request.title}</Text>
              {!!request.details && (
                <Text style={[styles.reqDetails, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                  {request.details}
                </Text>
              )}
            </View>

            {showQuote ? (
              <>
                <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                  <Text style={[styles.quoteLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Quote from your pro</Text>
                  <Text style={[styles.quoteAmount, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                    {formatKoboToNaira(quoteAmountKobo)}
                  </Text>
                  {!!latestQuote.providerNotes && (
                    <Text style={[styles.quoteNotes, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                      &ldquo;{latestQuote.providerNotes}&rdquo;
                    </Text>
                  )}
                  <Text style={[styles.quoteVatNote, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                    7.5% VAT added at checkout
                  </Text>
                </View>

                <View style={[styles.lockBanner, { backgroundColor: colors.primaryLight }]}>
                  <ShieldCheck size={16} color={colors.primary} />
                  <Text style={[styles.lockText, { color: colors.primaryDark, fontFamily: fonts.semiBold }]}>
                    Work never starts until you approve this quote.
                  </Text>
                </View>
              </>
            ) : !isResolved ? (
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.waitingText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                    Waiting for a pro to inspect and send your itemized quote…
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular, textAlign: 'center' }}>
                  This request was {status.toLowerCase()}.
                </Text>
              </View>
            )}

            <View style={[styles.warrantyBox, { backgroundColor: colors.badgeGreenBg }]}>
              <ShieldCheck size={18} color={colors.success} />
              <Text style={[styles.warrantyText, { color: colors.success, fontFamily: fonts.bold }]}>
                30-Day KENDIBO Service Warranty included
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        {isResolved ? (
          <Button title="Done" variant="primary" onPress={() => router.replace('/(tabs)/bookings')} style={{ flex: 1 }} />
        ) : showQuote ? (
          <>
            <Button title="Reject" variant="outline" onPress={handleCancel} style={styles.rejectBtn} />
            <Button
              title="Approve Quote & Pay"
              variant="primary"
              loading={approveQuote.isPending}
              onPress={() => approveQuote.mutate()}
              style={styles.acceptBtn}
            />
          </>
        ) : (
          <Button title="Cancel Request" variant="outline" onPress={handleCancel} style={{ flex: 1 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  addressMeta: { flex: 1 },
  addressTitle: { fontSize: 14 },
  addressSub: { fontSize: 12, marginTop: 2 },
  slotChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  slotChipText: { fontSize: 11 },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusTitle: { fontSize: 14, flex: 1 },
  reqTitle: { fontSize: 16 },
  reqDetails: { fontSize: 13, lineHeight: 19 },
  waitingText: { fontSize: 13, flex: 1, lineHeight: 18 },
  quoteLabel: { fontSize: 12 },
  quoteAmount: { fontSize: 28 },
  quoteNotes: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  quoteVatNote: { fontSize: 11 },
  lockBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: 20, marginBottom: spacing.sm },
  lockText: { fontSize: 12, flex: 1 },
  warrantyBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: 20, marginBottom: spacing.md },
  warrantyText: { fontSize: 12, flex: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  rejectBtn: { flex: 1 },
  acceptBtn: { flex: 1.5 },
});
