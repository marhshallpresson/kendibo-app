import React, { useState } from 'react';
import { useWatchupScreen } from '../../hooks/useWatchupScreen';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Calendar,
  MapPin,
  ChevronDown,
  Zap,
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../_layout';
import { radii, spacing, fonts, shadows } from '../../constants/theme';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { useAuthStore } from '../../stores/authStore';
import { formatKoboToNaira, calculateBookingTotalKobo } from '../../utils/currency';
import { apiFetch } from '../../services/api/client';

const newPaymentRef = () => `PAY-KBD-${Date.now().toString(36)}`;

export default function CheckoutScreen() {
  useWatchupScreen('PaymentCheckout');

  const router = useRouter();
  const params = useLocalSearchParams<{
    totalKobo?: string;
    subtotalKobo?: string;
    vatKobo?: string;
    discountKobo?: string;
    scheduledDate?: string;
    timeSlot?: string;
    serviceId?: string;
    frequency?: string;
    instructions?: string;
  }>();
  const { colors } = useAppTheme();

  const { items, clearCart } = useCartStore();
  const { currentAddress } = useLocationStore();
  const { user } = useAuthStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedSubtotal = params.subtotalKobo ? parseInt(params.subtotalKobo, 10) : 0;
  const parsedDiscount = params.discountKobo ? parseInt(params.discountKobo, 10) : 0;

  const cartSubtotal = items.reduce((acc, i) => acc + i.subtotalKobo, 0);
  const activeSubtotal = parsedSubtotal > 0 ? parsedSubtotal : cartSubtotal;
  const activeDiscount = parsedDiscount > 0 ? parsedDiscount : 0;

  const financialBreakdown = calculateBookingTotalKobo(activeSubtotal, activeDiscount, 0, 50000);
  const finalTotalKobo = params.totalKobo ? parseInt(params.totalKobo, 10) : financialBreakdown.totalKobo;

  const displayItems = items;

  const scheduledDate = params.scheduledDate || '';
  const timeSlot = params.timeSlot || '';
  const addressDisplay = currentAddress
    ? `${currentAddress.houseNumber ? currentAddress.houseNumber + ', ' : ''}${currentAddress.street}${currentAddress.city ? `, ${currentAddress.city}` : ''}`
    : 'No service address selected';

  const targetServiceId = params.serviceId || displayItems[0]?.service.id || '';
  const targetServiceName = displayItems[0]?.service.name || 'Service';

  const handlePay = async () => {
    if (!currentAddress?.id) {
      Alert.alert('Address Required', 'Select a service address before paying.', [
        { text: 'Add Address', onPress: () => router.push('/booking/address') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    if (!targetServiceId) {
      Alert.alert('No Service', 'Return to the service page and try again.');
      return;
    }
    if (finalTotalKobo <= 0) {
      Alert.alert('Invalid Amount', 'The order total could not be calculated. Return to the service page and try again.');
      return;
    }

    const { requireOnline, failedTransactionAlert } = require('../../services/txnGuard');
    if (!(await requireOnline('Payment'))) return;

    setIsProcessing(true);
    setError(null);
    const paymentRef = newPaymentRef();
    try {
      // 1. Create the real booking.
      const booking = await apiFetch<{ id: string; bookingNumber?: string }>('/v1/bookings', {
        method: 'POST',
        body: {
          serviceId: targetServiceId,
          addressId: currentAddress.id,
          scheduledAt: new Date().toISOString(),
        },
      });

      // 2. Initiate a real Bachs checkout session against that booking.
      const session = await apiFetch<{ checkoutUrl?: string; reference?: string; checkoutId?: string }>(
        `/v1/bookings/${booking.id}/payments`,
        {
          method: 'POST',
          body: {
            amountKobo: String(finalTotalKobo),
            email: user?.email || 'customer@kendibo.app',
          },
        },
      );

      clearCart();

      try {
        const { watchup } = require('../../services/watchup') as typeof import('../../services/watchup');
        watchup.track('booking.created', { bookingId: booking.id, method: 'BACHS_CHECKOUT' });
        watchup.track('payment.initiated', { bookingId: booking.id, method: 'BACHS_CHECKOUT' });
      } catch {
        /* telemetry must never break checkout */
      }

      // 3. Open the Bachs hosted checkout in the browser. The webhook is the
      //    source of truth for completion; the deep-link callback verifies it.
      if (session?.checkoutUrl) {
        const WebBrowser = require('expo-web-browser');
        await WebBrowser.openBrowserAsync(session.checkoutUrl);
      }

      setIsProcessing(false);
      router.replace({
        pathname: '/payment/success',
        params: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber ?? '',
          paymentRef: session?.reference ?? paymentRef,
          amountKobo: finalTotalKobo.toString(),
          method: 'BACHS_CHECKOUT',
          serviceName: targetServiceName,
        },
      });
    } catch (err) {
      setIsProcessing(false);
      const message = err instanceof Error ? err.message : 'Payment could not be started.';
      setError(message);
      failedTransactionAlert(paymentRef, () => handlePay());
    }
  };

  const reviewValues = [
    displayItems.map((i) => i.service.name).join(', ') || targetServiceName,
    displayItems[0]?.service.categoryId || 'Service',
    'KENDIBO Pro',
    scheduledDate && timeSlot ? `${scheduledDate} | ${timeSlot}` : 'To be scheduled',
    `${displayItems[0]?.service.durationMinutes || 60} mins`,
  ];

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
          Checkout
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayItems.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Your cart is empty</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Add a service before checking out.
            </Text>
            <Button title="Browse Services" onPress={() => router.replace('/search')} size="md" variant="primary" />
          </View>
        )}

        {displayItems.length > 0 && (
          <>
            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.metaRow}>
                <View style={[styles.metaIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Calendar size={18} color={colors.primary} />
                </View>
                <View style={styles.metaTextWrap}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Scheduled Date & Time</Text>
                  <Text style={[styles.metaValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                    {scheduledDate && timeSlot ? `${scheduledDate} • ${timeSlot}` : 'To be scheduled'}
                  </Text>
                </View>
              </View>
              <View style={[styles.metaDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.metaRow}>
                <View style={[styles.metaIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <MapPin size={18} color={colors.primary} />
                </View>
                <View style={styles.metaTextWrap}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Service Address</Text>
                  <Text style={[styles.metaValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]} numberOfLines={1}>
                    {addressDisplay}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Review Summary</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              {['Services', 'Category', 'Workers', 'Date & Time', 'Working Hours'].map((label, i) => (
                <View key={label} style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{label}</Text>
                  <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
                    {reviewValues[i]}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.detailsToggle, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setReviewOpen(!reviewOpen)}
            >
              <Text style={[styles.detailsToggleText, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                {targetServiceName} Details
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: reviewOpen ? '180deg' : '0deg' }] }} />
            </Pressable>

            {reviewOpen && (
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                {displayItems.map((item, index) => (
                  <View key={item.service.id || index} style={styles.sumRow}>
                    <Text style={[styles.sumLabel, { color: colors.textPrimary, fontFamily: fonts.regular }]} numberOfLines={1}>
                      {item.service.name}
                    </Text>
                    <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
                      {formatKoboToNaira(item.subtotalKobo)}
                    </Text>
                  </View>
                ))}
                {activeDiscount > 0 && (
                  <View style={styles.sumRow}>
                    <Text style={[styles.sumLabel, { color: colors.primary, fontFamily: fonts.bold }]}>Promo</Text>
                    <Text style={[styles.sumValue, { color: colors.primary, fontFamily: fonts.bold }]}>
                      - {formatKoboToNaira(activeDiscount)}
                    </Text>
                  </View>
                )}
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>VAT (7.5%)</Text>
                  <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                    {formatKoboToNaira(financialBreakdown.vatKobo)}
                  </Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Platform & Escrow Fee</Text>
                  <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                    {formatKoboToNaira(50000)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.sumRow}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Total</Text>
                  <Text style={[styles.totalAmount, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                    {formatKoboToNaira(finalTotalKobo)}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.bachsRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={[styles.bachsIcon, { backgroundColor: colors.primaryLight }]}>
                <Zap size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bachsTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Pay with Bachs</Text>
                <Text style={[styles.bachsSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                  Debit card, bank transfer, or mobile money — secured by Bachs
                </Text>
              </View>
            </View>

            {!!error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error, fontFamily: fonts.semiBold }]}>{error}</Text>
              </View>
            )}

            <View style={[styles.escrowBanner, { backgroundColor: colors.badgeGreenBg, borderColor: colors.success }]}>
              <ShieldCheck size={24} color={colors.success} />
              <View style={styles.escrowContent}>
                <Text style={[styles.escrowTitle, { color: colors.badgeGreenText, fontFamily: fonts.bold }]}>KENDIBO 100% Escrow Protection</Text>
                <Text style={[styles.escrowText, { color: colors.textPrimary, fontFamily: fonts.regular }]}>
                  Funds held securely. Technicians paid only after you verify completion.
                </Text>
              </View>
            </View>

            <View style={styles.actionSection}>
              <Button
                title={`Pay ${formatKoboToNaira(finalTotalKobo)}`}
                onPress={handlePay}
                loading={isProcessing}
                disabled={isProcessing || displayItems.length === 0}
                size="lg"
                variant="primary"
              />
              <View style={styles.securityNote}>
                <Lock size={12} color={colors.textMuted} />
                <Text style={[styles.securityText, { color: colors.textMuted, fontFamily: fonts.regular }]}>256-Bit Bank-Grade SSL Encryption</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyCard: { padding: spacing.lg, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  metaCard: { padding: spacing.md, marginBottom: spacing.md, borderRadius: 20, borderWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  metaTextWrap: { flex: 1 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 13 },
  metaDivider: { height: 1, marginVertical: spacing.sm },
  sectionHeader: { marginTop: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 16 },
  summaryCard: { padding: spacing.md, marginBottom: spacing.sm, borderRadius: 20, borderWidth: 1, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  sumLabel: { fontSize: 13 },
  sumValue: { fontSize: 13, maxWidth: 180, textAlign: 'right' },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  detailsToggleText: { fontSize: 14 },
  summaryDivider: { height: 1, marginVertical: spacing.xs },
  totalLabel: { fontSize: 14 },
  totalAmount: { fontSize: 17 },
  bachsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  bachsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bachsTitle: { fontSize: 15 },
  bachsSub: { fontSize: 12, marginTop: 2 },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 12, textAlign: 'center' },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  escrowContent: { flex: 1 },
  escrowTitle: { fontSize: 14, marginBottom: 2 },
  escrowText: { fontSize: 12, lineHeight: 18 },
  actionSection: { marginTop: spacing.xs },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm },
  securityText: { fontSize: 12 },
});
