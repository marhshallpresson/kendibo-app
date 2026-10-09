import React, { useEffect, useState } from 'react';
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
import { apiFetch, ApiError } from '../../services/api/client';

const newPaymentRef = () => `PAY-KBD-${Date.now().toString(36)}`;

/**
 * POST /v1/bookings contract (backend main.ts):
 *   body   = { serviceId, addressId, scheduledAt, urgency?, customerNotes?, addOnIds? }
 *   price  = server-side pricing engine (quote-mode services throw QUOTE_REQUIRED)
 *   id     = booking.booking.address_id is a UUID column, so only a PERSISTED
 *            address may be sent — placeholders such as 'gps' (GeofenceGuard)
 *            or 'picked' (map pin) are not UUIDs and make Postgres reject the
 *            insert → 400 BOOKING_ERROR.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Backend's own placeholder when a customer has no email (see wallet topup). */
const NO_EMAIL_FALLBACK = 'user@kendibo.com';

const ADDRESS_REQUIRED =
  'Select a service address before paying — your GPS/map pin is not a saved address yet.';

function receiptEmail(email?: string): string {
  const value = (email ?? '').trim();
  return EMAIL_RE.test(value) ? value : NO_EMAIL_FALLBACK;
}

/**
 * Build a real ISO timestamp from the schedule step. The old code always sent
 * `new Date().toISOString()` (booking "now" regardless of what the user chose)
 * and could send an empty string, which Postgres rejects.
 */
function resolveScheduledAt(date?: string, timeSlot?: string): string {
  const nextSlot = (): string => {
    const halfHour = 30 * 60 * 1000;
    return new Date(Math.ceil((Date.now() + 15 * 60 * 1000) / halfHour) * halfHour).toISOString();
  };
  const trimmed = (date ?? '').trim();
  if (!trimmed) return nextSlot();
  let when = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(when.getTime())) when = new Date(trimmed);
  if (Number.isNaN(when.getTime())) return nextSlot();

  const m = (timeSlot ?? '').match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m) {
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const ampm = (m[3] ?? '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    when.setHours(hour, minute, 0, 0);
  } else {
    when.setHours(10, 0, 0, 0);
  }
  // Never book into the past (cart screens ship a hardcoded default date).
  if (when.getTime() < Date.now() - 60 * 60 * 1000) return nextSlot();
  return when.toISOString();
}

/** Turn backend/network failures into something the user can act on. */
function describeFailure(err: unknown): string {
  if (err instanceof ApiError) {
    const hint = `${err.code ?? ''} ${err.message}`.toLowerCase();
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.code === 'AMOUNT_MISMATCH' || hint.includes('amount_mismatch')) {
      return 'The price changed before payment went through. Go back and refresh the order.';
    }
    if (hint.includes('quote_required')) {
      return 'This service is priced after inspection — request a quote instead of paying upfront.';
    }
    if (hint.includes('service_not_found')) {
      return 'This service is no longer available. Go back and pick another one.';
    }
    if (hint.includes('uuid') || hint.includes('address_id')) {
      return ADDRESS_REQUIRED;
    }
    if (err.code === 'BOOKING_ERROR') {
      const message = err.message.trim();
      if (message && message.length < 160 && !message.startsWith('{')) {
        return `We could not create this booking: ${message}`;
      }
      return 'We could not create this booking. Check the service address, service and schedule, then try again.';
    }
    if (err.status === 400) {
      return 'The booking was rejected. Check the service address, service and schedule, then try again.';
    }
    if (err.status >= 500) return 'KENDIBO is having trouble right now. Please try again in a moment.';
    return err.message;
  }
  // Network failures carry an accurate "can't reach the KENDIBO API (host)"
  // message from apiFetch — never a telemetry host.
  if (err instanceof TypeError) return err.message;
  return 'Payment could not be started. Please try again.';
}

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
  /**
   * Server-priced breakdown from POST /v1/pricing/quote. The backend charges
   * EXACTLY this number (it rejects any other amountKobo with AMOUNT_MISMATCH),
   * so the visible total, the Pay button and the payment call all read from it.
   * `null` means we have not verified a price yet -> paying is disabled.
   */
  const [serverQuote, setServerQuote] = useState<{
    serviceId: string;
    addOnKey: string;
    totalKobo: number;
    vatKobo: number;
    platformFeeKobo: number;
  } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const parsedSubtotal = params.subtotalKobo ? parseInt(params.subtotalKobo, 10) : 0;
  const parsedDiscount = params.discountKobo ? parseInt(params.discountKobo, 10) : 0;

  const cartSubtotal = items.reduce((acc, i) => acc + i.subtotalKobo, 0);
  const activeSubtotal = parsedSubtotal > 0 ? parsedSubtotal : cartSubtotal;
  const activeDiscount = parsedDiscount > 0 ? parsedDiscount : 0;

  const financialBreakdown = calculateBookingTotalKobo(activeSubtotal, activeDiscount, 0, 50000);

  const displayItems = items;

  const scheduledDate = params.scheduledDate || '';
  const timeSlot = params.timeSlot || '';
  const addressDisplay = currentAddress
    ? `${currentAddress.houseNumber ? currentAddress.houseNumber + ', ' : ''}${currentAddress.street}${currentAddress.city ? `, ${currentAddress.city}` : ''}`
    : 'No service address selected';

  const targetServiceId = params.serviceId || displayItems[0]?.service.id || '';
  const targetServiceName = displayItems[0]?.service.name || 'Service';
  const targetItem = displayItems.find((i) => i.service.id === targetServiceId);
  const targetAddOnIds = (targetItem?.selectedAddOns ?? [])
    .map((a) => a.addOn.id)
    .filter((id) => Boolean(id));

  // Ask the pricing engine what this booking will cost. bookingService.create
  // prices with exactly {serviceId, addOnIds}, so this total IS the amount the
  // payments endpoint will accept.
  useEffect(() => {
    let cancelled = false;
    if (!targetServiceId) return () => { cancelled = true; };
    apiFetch<{
      totalKobo?: string;
      vatKobo?: string;
      platformFeeKobo?: string;
    }>('/v1/pricing/quote', {
      method: 'POST',
      auth: false,
      body: { serviceId: targetServiceId, addOnIds: targetAddOnIds },
    })
      .then((b) => {
        if (cancelled) return;
        const total = Number(b?.totalKobo);
        if (!b || !Number.isFinite(total) || total <= 0) {
          setServerQuote(null);
          setQuoteError('We could not verify the price for this service.');
          return;
        }
        setQuoteError(null);
        setServerQuote({
          serviceId: targetServiceId,
          addOnKey: targetAddOnIds.join('|'),
          totalKobo: total,
          vatKobo: Number(b?.vatKobo ?? 0),
          platformFeeKobo: Number(b?.platformFeeKobo ?? 0),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setServerQuote(null);
        setQuoteError('We could not verify the price. Check your connection and try again.');
      });
    return () => { cancelled = true; };
    // addOnIds is a fresh array each render; key the effect on its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetServiceId, targetAddOnIds.join('|')]);

  // Ignore a quote that belongs to a different service/add-on combination
  // (state may be stale for one render while the new fetch is in flight).
  const verifiedQuote =
    serverQuote &&
    serverQuote.serviceId === targetServiceId &&
    serverQuote.addOnKey === targetAddOnIds.join('|')
      ? serverQuote
      : null;

  // The ONLY number we are allowed to charge: the server's price for this
  // exact service + add-on combination. Client math is display-only fallback.
  const finalTotalKobo = verifiedQuote
    ? verifiedQuote.totalKobo
    : params.totalKobo
      ? parseInt(params.totalKobo, 10)
      : financialBreakdown.totalKobo;
  const hasVerifiedPrice =
    verifiedQuote !== null && Number.isFinite(finalTotalKobo) && finalTotalKobo > 0;

  // One idempotency key per checkout attempt: retrying after a failure
  // re-uses the SAME booking (backend is UNIQUE(user_id, idempotency_key)),
  // so a retry can never create duplicate bookings.
  const [bookingIdemKey] = useState(
    () => `kbd_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`,
  );

  const handlePay = async () => {
    // addressId is a UUID column — a GPS/map-pin placeholder ('gps'/'picked')
    // or a missing address makes the insert fail with a silent 400.
    if (!currentAddress?.id || !UUID_RE.test(currentAddress.id)) {
      setError(ADDRESS_REQUIRED);
      Alert.alert('Address Required', `${ADDRESS_REQUIRED}\n\nChoose a saved address or add one to continue.`, [
        { text: 'Select Address', onPress: () => router.push('/booking/address') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    if (!targetServiceId) {
      Alert.alert('No Service', 'Return to the service page and try again.');
      return;
    }
    if (targetItem?.service.isQuoteBased) {
      const quoteMessage =
        'This service is priced after inspection — request a quote instead of paying upfront.';
      setError(quoteMessage);
      Alert.alert('Quote required', quoteMessage);
      return;
    }
    if (!hasVerifiedPrice) {
      Alert.alert(
        'Price unavailable',
        quoteError ?? 'The order total could not be verified. Check your connection and try again.',
      );
      return;
    }

    const { requireOnline, failedTransactionAlert } = require('../../services/txnGuard');
    if (!(await requireOnline('Payment'))) return;

    setIsProcessing(true);
    setError(null);
    const paymentRef = newPaymentRef();
    // Hoisted so a failure AFTER the booking exists can say so honestly and
    // retry the payment alone (the booking idempotency key is reused).
    let booking: { id: string; bookingNumber?: string; priceKobo?: string } | null = null;
    try {
      // 1. Create the real booking (server prices it via the pricing engine).
      booking = await apiFetch<{ id: string; bookingNumber?: string; priceKobo?: string }>('/v1/bookings', {
        method: 'POST',
        idempotencyKey: bookingIdemKey,
        body: {
          serviceId: targetServiceId,
          addressId: currentAddress.id,
          scheduledAt: resolveScheduledAt(scheduledDate, timeSlot),
          ...(targetAddOnIds.length > 0 ? { addOnIds: targetAddOnIds } : {}),
          ...(params.instructions?.trim() ? { customerNotes: params.instructions.trim() } : {}),
        },
      });

      // 2. Initiate a real Bachs checkout session against that booking.
      //    amountKobo MUST be the server's price snapshot — the backend
      //    rejects any other value with AMOUNT_MISMATCH.
      const chargedKobo = Number(booking.priceKobo ?? finalTotalKobo);
      const session = await apiFetch<{ checkoutUrl?: string; reference?: string; checkoutId?: string }>(
        `/v1/bookings/${booking.id}/payments`,
        {
          method: 'POST',
          idempotencyKey: bookingIdemKey,
          body: {
            amountKobo: String(chargedKobo),
            // Backend zod requires a valid email; phone-only accounts fall
            // back to the same placeholder the wallet topup endpoint uses.
            email: receiptEmail(user?.email),
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
          amountKobo: String(chargedKobo),
          method: 'BACHS_CHECKOUT',
          serviceName: targetServiceName,
        },
      });
    } catch (err) {
      setIsProcessing(false);
      const message = describeFailure(err);
      setError(message);
      if (booking) {
        // The booking DID land — never claim nothing happened. Offer a retry
        // that reuses the same booking (idempotency key) instead of creating
        // a second one.
        Alert.alert(
          'Booking saved — payment not started',
          `${message}\n\nYour booking ${booking.bookingNumber ? `(${booking.bookingNumber}) ` : ''}exists, and nothing was charged.`,
          [
            { text: 'Retry payment', onPress: () => handlePay() },
            { text: 'View bookings', onPress: () => router.replace('/(tabs)/bookings') },
          ],
        );
      } else if (err instanceof ApiError && err.status === 400) {
        // Contract/validation failure — retrying unchanged cannot succeed, so
        // explain instead of offering a "nothing was charged" retry loop.
        Alert.alert('Payment not started', `${message}\n\nNothing was charged.`, [{ text: 'OK' }]);
      } else {
        failedTransactionAlert(paymentRef, () => handlePay());
      }
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
                    {formatKoboToNaira(verifiedQuote ? verifiedQuote.vatKobo : financialBreakdown.vatKobo)}
                  </Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Platform Fee</Text>
                  <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                    {verifiedQuote ? formatKoboToNaira(verifiedQuote.platformFeeKobo) : '…'}
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

            {!!(error ?? quoteError) && (
              <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error, fontFamily: fonts.semiBold }]}>
                  {error ?? quoteError}
                </Text>
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
                title={hasVerifiedPrice ? `Pay ${formatKoboToNaira(finalTotalKobo)}` : 'Verifying price…'}
                onPress={handlePay}
                loading={isProcessing}
                disabled={isProcessing || displayItems.length === 0 || !hasVerifiedPrice}
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
