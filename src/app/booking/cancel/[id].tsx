import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, Wallet, CreditCard, CheckCircle2 } from 'lucide-react-native';
import { useBooking, useCancelBooking } from '../../../services/queryClient';
import { Booking } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useAppTheme } from '../../_layout';
import { spacing, fonts, shadows } from '../../../constants/theme';
import { formatKoboToNaira } from '../../../utils/currency';

const CANCELLATION_REASONS = [
  'Change of plans / Schedule conflict',
  'Severe weather / Rain conditions',
  'Want to book a different service package',
  'Found an alternative solution',
  'Technician is unresponsive or late',
  'Other reason',
];

export default function CancelBookingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const cancelBooking = useCancelBooking();

  const { data: liveBooking } = useBooking(typeof id === 'string' ? id : '');
  const activeBooking = liveBooking ?? null;

  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'wallet' | 'card'>('wallet');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const isDispatched = activeBooking
    ? ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(activeBooking.status)
    : false;
  const cancellationFeeKobo = isDispatched ? 200000 : 0;
  const netRefundKobo = Math.max(0, (activeBooking?.totalKobo ?? 0) - cancellationFeeKobo);

  const cancelMutation = {
    mutate: () => {
      if (!activeBooking) return;
      const finalReason =
        selectedReason === 'Other reason' ? otherReasonText || selectedReason : selectedReason;
      cancelBooking.mutate(
        { bookingId: activeBooking.id, reason: finalReason },
        {
          onSuccess: () => {
            setShowConfirmModal(false);
            setShowSuccessModal(true);
          },
        },
      );
    },
    get isPending() {
      return cancelBooking.isPending;
    },
  };
  const booking: Booking = (activeBooking ?? {
    id: typeof id === 'string' ? id : '',
    bookingNumber: '',
    status: 'REQUESTED',
    totalKobo: 0,
    service: undefined,
  }) as Booking;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Cancel Booking</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Misc Cancel Booking: rounded service card */}
        <View style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {booking.service?.imageUrl ? (
            <Image source={resolveImage(booking.service.imageUrl)} style={styles.serviceThumb} />
          ) : (
            <View style={[styles.serviceThumb, { backgroundColor: colors.primaryLight }]} />
          )}
          <View style={styles.serviceMeta}>
            <Text style={[styles.serviceName, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
              {booking.service?.name || 'Home Service'}
            </Text>
            <Text style={[styles.serviceBullet, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              • {booking.service?.durationMinutes ? `${Math.round(booking.service.durationMinutes / 60 * 10) / 10} hrs` : '2 hrs'}
            </Text>
            <Text style={[styles.serviceBullet, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={2}>
              • Order #{booking.bookingNumber} • {formatKoboToNaira(booking.totalKobo)}
            </Text>
          </View>
        </View>

        <View style={[styles.refundBanner, { backgroundColor: colors.badgeOrangeBg }]}>
          <AlertTriangle size={18} color={colors.badgeOrangeText} />
          <Text style={[styles.refundBannerText, { color: colors.badgeOrangeText, fontFamily: fonts.semiBold }]}>
            {isDispatched
              ? 'Technician dispatched — ₦2,000 mobilization fee applies.'
              : 'Cancelling early — 100% FULL REFUND, zero fees.'}{' '}
            Net refund {formatKoboToNaira(netRefundKobo)}.
          </Text>
        </View>

        {/* Misc Cancel Booking: grey band label */}
        <View style={[styles.bandLabel, { backgroundColor: colors.surfaceCard }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: fonts.bold }]}>
            REASON FOR CANCELLATION
          </Text>
        </View>

        <View style={styles.reasonsList}>
          {CANCELLATION_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <Pressable key={reason} onPress={() => setSelectedReason(reason)} style={styles.reasonRow}>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.primary : colors.border },
                  ]}
                >
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.reasonText, { color: colors.textPrimary, fontFamily: fonts.regular }]}>{reason}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedReason === 'Other reason' && (
          <TextInput
            placeholder="Please specify your reason for cancelling..."
            placeholderTextColor={colors.textMuted}
            value={otherReasonText}
            onChangeText={setOtherReasonText}
            multiline
            numberOfLines={3}
            style={[styles.otherInput, { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary, fontFamily: fonts.regular }]}
          />
        )}

        {/* Misc: large rounded comment box */}
        <TextInput
          placeholder="Describe a problem / comment"
          placeholderTextColor={colors.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          numberOfLines={5}
          style={[styles.commentBox, { backgroundColor: colors.surfaceCard, color: colors.textPrimary, fontFamily: fonts.regular }]}
        />

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
          Where should we send your refund?
        </Text>
        <View style={styles.refundMethodsList}>
          <Pressable
            onPress={() => setRefundMethod('wallet')}
            style={[
              styles.methodCard,
              refundMethod === 'wallet'
                ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                : { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <View style={[styles.methodIconWrapper, { backgroundColor: colors.surface }]}>
              <Wallet size={20} color={colors.primary} />
            </View>
            <View style={styles.methodDetails}>
              <View style={styles.methodNameRow}>
                <Text style={[styles.methodName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>KENDIBO Wallet</Text>
                <Badge label="Instant" variant="success" size="sm" />
              </View>
              <Text style={[styles.methodSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>0 fees • Ready for next booking</Text>
            </View>
            <View style={[styles.radioOuter, refundMethod === 'wallet' && { borderColor: colors.primary }]}>
              {refundMethod === 'wallet' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setRefundMethod('card')}
            style={[
              styles.methodCard,
              refundMethod === 'card'
                ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                : { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <View style={[styles.methodIconWrapper, { backgroundColor: colors.surface }]}>
              <CreditCard size={20} color={colors.primary} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={[styles.methodName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Original Payment Card</Text>
              <Text style={[styles.methodSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Mastercard •••• 4242 (3–5 business days)</Text>
            </View>
            <View style={[styles.radioOuter, refundMethod === 'card' && { borderColor: colors.primary }]}>
              {refundMethod === 'card' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </Pressable>
        </View>

        <View style={styles.submitArea}>
          <Button title="Cancel Now" variant="danger" size="lg" onPress={() => setShowConfirmModal(true)} />
        </View>
      </ScrollView>

      <Modal visible={showConfirmModal} onClose={() => setShowConfirmModal(false)} type="bottomSheet">
        <View style={styles.modalContent}>
          <View style={[styles.modalAlertIcon, { backgroundColor: colors.badgeRedBg }]}>
            <AlertTriangle size={36} color={colors.error} />
          </View>
          <Text style={[styles.modalHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Are you sure you want to cancel?</Text>
          <Text style={[styles.modalText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            You will receive a refund of {formatKoboToNaira(netRefundKobo)} to your{' '}
            {refundMethod === 'wallet' ? 'KENDIBO Wallet' : 'Original Payment Card'}.
          </Text>
          <View style={styles.modalButtonsRow}>
            <Button title="Don't Cancel" variant="outline" size="md" style={styles.modalBtn} onPress={() => setShowConfirmModal(false)} />
            <Button
              title="Cancel Anyway"
              variant="danger"
              size="md"
              loading={cancelMutation.isPending}
              style={styles.modalBtn}
              onPress={() => cancelMutation.mutate()}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/bookings');
        }}
        type="center"
      >
        <View style={styles.successModalContent}>
          <View style={[styles.successIconWrapper, { backgroundColor: colors.badgeGreenBg }]}>
            <CheckCircle2 size={48} color={colors.success} />
          </View>
          <Text style={[styles.successHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Booking Cancelled</Text>
          <Text style={[styles.successText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Your service order #{booking.bookingNumber} has been successfully cancelled.
          </Text>
          <View style={[styles.refundReceiptCard, { backgroundColor: colors.surfaceCard }]}>
            <Text style={[styles.receiptTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Refund Summary</Text>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Refund Amount</Text>
              <Text style={[styles.receiptValue, { color: colors.success, fontFamily: fonts.extraBold }]}>{formatKoboToNaira(netRefundKobo)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Destination</Text>
              <Text style={[styles.receiptValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                {refundMethod === 'wallet' ? 'KENDIBO Wallet (Instant)' : 'Original Card (3-5 days)'}
              </Text>
            </View>
          </View>
          <Button
            title="Back to My Bookings"
            variant="primary"
            size="md"
            onPress={() => {
              setShowSuccessModal(false);
              router.replace('/bookings');
            }}
            style={styles.successButton}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  serviceCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  serviceThumb: { width: 96, height: 96, borderRadius: 16 },
  serviceMeta: { flex: 1, justifyContent: 'center' },
  serviceName: { fontSize: 16 },
  serviceBullet: { fontSize: 13, marginTop: 3 },
  refundBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  refundBannerText: { fontSize: 12, flex: 1, lineHeight: 17 },
  bandLabel: { marginHorizontal: -16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 12, letterSpacing: 0.6, marginVertical: spacing.xs },
  sectionTitle: { fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm },
  reasonsList: { gap: spacing.md, marginBottom: spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  reasonText: { fontSize: 14, flex: 1, lineHeight: 20 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C4C9D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  otherInput: { borderWidth: 1, borderRadius: 16, padding: spacing.md, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: spacing.sm },
  commentBox: { borderRadius: 24, padding: spacing.lg, fontSize: 14, minHeight: 150, textAlignVertical: 'top', marginVertical: spacing.sm },
  refundMethodsList: { gap: spacing.sm, marginBottom: spacing.lg },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: 20, borderWidth: 1.5 },
  methodIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  methodDetails: { flex: 1 },
  methodNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  methodName: { fontSize: 14 },
  methodSub: { fontSize: 12, marginTop: 2 },
  submitArea: { marginTop: spacing.xs },
  modalContent: { padding: spacing.md, alignItems: 'center' },
  modalAlertIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  modalHeading: { fontSize: 18, textAlign: 'center', marginBottom: spacing.xs },
  modalText: { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  modalButtonsRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  modalBtn: { flex: 1 },
  successModalContent: { padding: spacing.md, alignItems: 'center' },
  successIconWrapper: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  successHeading: { fontSize: 20, textAlign: 'center', marginBottom: spacing.xs },
  successText: { fontSize: 14, textAlign: 'center', marginBottom: spacing.md },
  refundReceiptCard: { width: '100%', borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, gap: 8 },
  receiptTitle: { fontSize: 13, marginBottom: 4 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  receiptLabel: { fontSize: 12 },
  receiptValue: { fontSize: 13, textAlign: 'right', flex: 1 },
  successButton: { width: '100%' },
});



