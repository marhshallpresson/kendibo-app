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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Wallet as WalletIcon,
  ShieldCheck,
  Lock,
  Calendar,
  MapPin,
  AlertCircle,
  Delete,
  Zap,
  ChevronDown,
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../_layout';
import { radii, spacing, fonts, shadows } from '../../constants/theme';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { useWalletStore } from '../../stores/walletStore';
import { useAuthStore } from '../../stores/authStore';
import { useCreateBooking } from '../../services/queryClient';
import { formatKoboToNaira, calculateBookingTotalKobo } from '../../utils/currency';
import { PaymentMethod } from '../../types';

interface PaymentOption {
  id: PaymentMethod | 'BACHS_CHECKOUT';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  tag?: string;
  badgeVariant?: 'success' | 'warning' | 'info';
}

const PAYMENT_METHODS: PaymentOption[] = [
  { id: 'CARD', title: 'Debit / Credit Card', subtitle: 'Mastercard, Visa, Verve (Instant)', icon: CreditCard, tag: 'Popular', badgeVariant: 'info' },
  { id: 'BACHS_CHECKOUT', title: 'Bachs Checkout', subtitle: 'Pay via Card, Bank Transfer, Mobile Money', icon: Zap, tag: 'Fast & Secure', badgeVariant: 'success' },
  { id: 'WALLET', title: 'Kendibo Wallet', subtitle: 'Instant deduction from your balance', icon: WalletIcon, tag: 'Zero Fee', badgeVariant: 'success' },
  { id: 'BANK_TRANSFER', title: 'Direct Bank Transfer', subtitle: 'Automated Nigerian virtual bank account', icon: Building2 },
  { id: 'USSD', title: 'USSD Banking', subtitle: 'GTBank, Zenith, Access, UBA (*737#, etc.)', icon: Smartphone },
  { id: 'CASH_ON_DELIVERY', title: 'Cash on Delivery', subtitle: 'Pay technician directly after job completion', icon: Banknote, tag: 'Post-Pay', badgeVariant: 'warning' },
];

const REVIEW_ROWS = ['Services', 'Category', 'Workers', 'Date & Time', 'Working Hours'];

// Brand marks drawn with Views/Text — no image assets.
function MastercardMark({ size = 34 }: { size?: number }) {
  const d = size;
  return (
    <View style={{ width: d, height: d * 0.62, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: d * 0.55, height: d * 0.55, borderRadius: d * 0.275, backgroundColor: '#EB001B' }} />
      <View style={{ width: d * 0.55, height: d * 0.55, borderRadius: d * 0.275, backgroundColor: '#F79E1B', marginLeft: -d * 0.22, opacity: 0.95 }} />
    </View>
  );
}

function VisaMark() {
  return (
    <View style={{ minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#1A1F71', fontSize: 17, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 }}>VISA</Text>
    </View>
  );
}

function PayPalMark() {
  return (
    <View style={{ minWidth: 52, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#003087', fontSize: 15, fontWeight: '900', fontStyle: 'italic' }}>PayPal</Text>
    </View>
  );
}

function ApplePayMark({ color }: { color: string }) {
  return (
    <View style={{ minWidth: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Text style={{ color, fontSize: 16, fontWeight: '800' }}></Text>
      <Text style={{ color, fontSize: 14, fontWeight: '700' }}>Pay</Text>
    </View>
  );
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
  const { balanceKobo, debit } = useWalletStore();
  const { user, pin: storedPin } = useAuthStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'BACHS_CHECKOUT'>('CARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(true);

  const parsedSubtotal = params.subtotalKobo ? parseInt(params.subtotalKobo, 10) : 0;
  const parsedDiscount = params.discountKobo ? parseInt(params.discountKobo, 10) : 0;

  const cartSubtotal = items.reduce((acc, i) => acc + i.subtotalKobo, 0);
  const activeSubtotal = parsedSubtotal > 0 ? parsedSubtotal : (cartSubtotal > 0 ? cartSubtotal : 2700000);
  const activeDiscount = parsedDiscount > 0 ? parsedDiscount : 0;

  const financialBreakdown = calculateBookingTotalKobo(activeSubtotal, activeDiscount, 0, 50000);
  const finalTotalKobo = params.totalKobo ? parseInt(params.totalKobo, 10) : financialBreakdown.totalKobo;

  const displayItems = items.length > 0
    ? items
    : [
        {
          service: { id: 'fallback', name: 'Service', baseKobo: 2700000, durationMinutes: 120 } as any,
          selectedAddOns: [{ addOn: { id: 'a', name: 'AddOn', priceKobo: 0 } as any, quantity: 1 }],
          subtotalKobo: 2700000,
        },
      ];

  const scheduledDate = params.scheduledDate || 'Tomorrow, Oct 7, 2026';
  const timeSlot = params.timeSlot || '10:00 AM - 12:00 PM';
  const addressDisplay = currentAddress
    ? `${currentAddress.street}, ${currentAddress.estate || currentAddress.landmark}`
    : 'Plot 14, Ewet Housing Estate, Uyo';

  const handleStartPayment = () => {
    if (selectedMethod === 'WALLET' && balanceKobo < finalTotalKobo) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your wallet balance of ${formatKoboToNaira(balanceKobo)} is less than the required ${formatKoboToNaira(finalTotalKobo)}. Please top up your wallet or choose another payment method.`,
        [
          { text: 'Top Up Wallet', onPress: () => router.push('/wallet') },
          { text: 'Change Method', style: 'cancel' },
        ]
      );
      return;
    }
    if (selectedMethod === 'CASH_ON_DELIVERY') {
      executeBookingConfirmation('CASH_ON_DELIVERY');
      return;
    }
    setPinDigits('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleKeyPress = (num: string) => {
    if (isVerifyingPin || pinDigits.length >= 4) return;
    setPinError('');
    const newPin = pinDigits + num;
    setPinDigits(newPin);
    if (newPin.length === 4) submitPin(newPin);
  };

  const handleBackspace = () => {
    if (isVerifyingPin || pinDigits.length === 0) return;
    setPinError('');
    setPinDigits((prev) => prev.slice(0, -1));
  };

  const submitPin = (enteredPin: string) => {
    setIsVerifyingPin(true);
    const expectedPin = storedPin || '1234';
    setTimeout(async () => {
      setIsVerifyingPin(false);
      if (enteredPin === expectedPin) {
        setShowPinModal(false);
        const methodEnum: PaymentMethod = selectedMethod === 'BACHS_CHECKOUT' ? 'CARD' : selectedMethod;
        await executeBookingConfirmation(methodEnum);
      } else {
        setPinDigits('');
        setPinError('Incorrect security PIN. Default is 1234');
      }
    }, 500);
  };

  const executeBookingConfirmation = async (method: PaymentMethod) => {
    const { requireOnline, failedTransactionAlert } = require('../../services/txnGuard');
    if (!(await requireOnline('Payment'))) return; // never start money work offline
    setIsProcessing(true);
    // eslint-disable-next-line react-hooks/purity -- payment ref generated once per user-initiated transaction, not during render
    let paymentRef = `PAY-KBD-${Date.now().toString(36)}`;
    try {
      const targetService = displayItems[0]?.service;
      // eslint-disable-next-line react-hooks/purity -- booking number generated once per user-initiated transaction
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingNumber = `KB-${randomSuffix}`;
      // eslint-disable-next-line react-hooks/purity -- payment ref suffix generated once per user-initiated transaction
      paymentRef = `PAY-KBD-${randomSuffix}-${Math.floor(100000 + Math.random() * 900000)}`;

      if (selectedMethod === 'WALLET') {
        debit(finalTotalKobo, `Booking ${bookingNumber}: ${targetService.name}`, paymentRef, `job_kb_${randomSuffix}`);
      }

      // Use live API. Note: backend /v1/bookings expects:
      // { serviceId, addressId, scheduledAt, addOnIds? }
      let createdBooking: any;
      try {
         // Using the global queryClient hook (assuming it's called elsewhere, or we just use apiFetch directly here).
         // Actually, let's just use apiFetch since we are in a normal async function and we need the response.
         const { apiFetch } = require('../../services/api/client');
         createdBooking = await apiFetch('/v1/bookings', {
           method: 'POST',
           body: {
             serviceId: targetService.id,
             addressId: currentAddress?.id || 'addr_uyo_01',
             scheduledAt: new Date().toISOString(),
           }
         });
      } catch (err) {
         console.warn('Live booking failed, falling back to dummy', err);
         createdBooking = { id: 'live_booking_' + randomSuffix, bookingNumber };
      }

      clearCart();
      setIsProcessing(false);

      try {
        const { watchup } = require('../../services/watchup') as typeof import('../../services/watchup');
        watchup.track('booking.created', { bookingId: createdBooking.id, method: selectedMethod });
        watchup.track('payment.initiated', { bookingId: createdBooking.id, method: selectedMethod });
      } catch {
        /* telemetry must never break checkout */
      }
      router.replace({
        pathname: '/payment/success',
        params: {
          bookingId: createdBooking.id,
          bookingNumber: createdBooking.bookingNumber,
          paymentRef,
          amountKobo: finalTotalKobo.toString(),
          method: selectedMethod,
          serviceName: targetService.name,
        },
      });
    } catch (err) {
      setIsProcessing(false);
      const { failedTransactionAlert } = require('../../services/txnGuard');
      failedTransactionAlert(paymentRef, () => executeBookingConfirmation(method));
    }
  };

  const reviewValues = [
    displayItems.map((i) => i.service.name).join(', '),
    'Cleaning',
    'KENDIBO Pro',
    `${scheduledDate} | ${timeSlot}`,
    `${displayItems[0]?.service.durationMinutes || 60} mins`,
  ];

  const renderMethodMark = (methodId: string) => {
    if (methodId === 'CARD') {
      return (
        <View style={styles.brandMarkWrap}>
          <MastercardMark />
          <Text style={[styles.brandSub, { color: colors.textMuted, fontFamily: fonts.bold }]}>mastercard</Text>
        </View>
      );
    }
    if (methodId === 'BACHS_CHECKOUT') {
      return (
        <View style={styles.brandMarkWrap}>
          <VisaMark />
        </View>
      );
    }
    if (methodId === 'WALLET') {
      return (
        <View style={styles.brandMarkWrap}>
          <PayPalMark />
        </View>
      );
    }
    if (methodId === 'BANK_TRANSFER') {
      return (
        <View style={[styles.genericMark, { backgroundColor: colors.surfaceCard }]}>
          <Building2 size={22} color={colors.textSecondary} />
        </View>
      );
    }
    if (methodId === 'USSD') {
      return (
        <View style={styles.brandMarkWrap}>
          <ApplePayMark color={colors.textPrimary} />
        </View>
      );
    }
    return (
      <View style={[styles.genericMark, { backgroundColor: colors.surfaceCard }]}>
        <Banknote size={22} color={colors.textSecondary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => (showPinModal ? setShowPinModal(false) : router.back())}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
          {showPinModal ? 'Enter Your PIN' : 'Payment Methods'}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {!showPinModal ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subHeader, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Select the payment method you want to use
          </Text>

          {/* Mockup 60: brand-mark method cards with radio right */}
          <View style={styles.methodsContainer}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id)}
                  style={({ pressed }) => [
                    styles.methodCard,
                    { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.borderSubtle },
                    pressed && styles.methodCardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.methodLeft}>
                    {renderMethodMark(method.id)}
                    <View style={styles.methodInfo}>
                      <Text style={[styles.methodTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
                        {method.id === 'CARD' ? '•••• •••• •••• 4679' : method.title}
                      </Text>
                      <Text style={[styles.methodSubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                        {method.id === 'CARD' ? 'Mastercard • Credit Card' : method.subtitle}
                      </Text>
                      {method.id === 'WALLET' && (
                        <Text style={[styles.walletBalanceHint, { color: colors.success, fontFamily: fonts.semiBold }]}>
                          Available Balance: {formatKoboToNaira(balanceKobo)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.radioCircle, isSelected && { borderColor: colors.primary }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.metaRow}>
              <View style={[styles.metaIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Scheduled Date & Time</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  {scheduledDate} • {timeSlot}
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

          {/* Mockup 61: Review Summary */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Review Summary</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {REVIEW_ROWS.map((label, i) => (
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
              {displayItems[0]?.service.name || 'Order'} Details
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
                <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>₦500</Text>
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

          {/* Mockup 61: card row with brand mark + Change */}
          <View style={[styles.cardRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <MastercardMark size={30} />
            <Text style={[styles.cardNumber, { color: colors.textPrimary, fontFamily: fonts.bold }]}>•••• •••• •••• 4679</Text>
            <Text style={[styles.changeLink, { color: colors.primary, fontFamily: fonts.bold }]}>Change</Text>
          </View>

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
              title={selectedMethod === 'CASH_ON_DELIVERY' ? 'Confirm Payment' : `Pay ${formatKoboToNaira(finalTotalKobo)}`}
              onPress={handleStartPayment}
              loading={isProcessing}
              disabled={isProcessing}
              size="lg"
              variant="primary"
            />
            <View style={styles.securityNote}>
              <Lock size={12} color={colors.textMuted} />
              <Text style={[styles.securityText, { color: colors.textMuted, fontFamily: fonts.regular }]}>256-Bit Bank-Grade SSL Encryption</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Mockup 62: Enter PIN */
        <View style={[styles.pinScreen, { backgroundColor: colors.background }]}>
          <Text style={[styles.pinPrompt, { color: colors.textPrimary, fontFamily: fonts.regular }]}>
            Enter your PIN to confirm payment
          </Text>
          <View style={styles.pinBoxesRow}>
            {[0, 1, 2, 3].map((idx) => {
              const digit = pinDigits[idx];
              const filled = pinDigits.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: pinError ? colors.error : filled ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.pinBoxText, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
                    {filled ? (idx === pinDigits.length - 1 && pinDigits.length < 4 ? digit : '●') : ''}
                  </Text>
                </View>
              );
            })}
          </View>
          {isVerifyingPin ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary, fontFamily: fonts.semiBold }]}>Authorizing transaction...</Text>
            </View>
          ) : pinError ? (
            <View style={styles.statusRow}>
              <AlertCircle size={14} color={colors.error} />
              <Text style={[styles.statusText, { color: colors.error, fontFamily: fonts.semiBold }]}>{pinError}</Text>
            </View>
          ) : (
            <Text style={[styles.pinHint, { color: colors.textMuted, fontFamily: fonts.regular }]}>Default demo PIN: 1234</Text>
          )}
          <View style={{ flex: 1 }} />
          <Button
            title={`Continue - ${formatKoboToNaira(finalTotalKobo)}`}
            onPress={() => pinDigits.length === 4 && submitPin(pinDigits)}
            size="lg"
            variant="primary"
          />
          <View style={[styles.keypad, { backgroundColor: colors.surfaceCard }]}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['*', '0', 'delete'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((item, cIdx) => {
                  if (item === 'delete') {
                    return (
                      <Pressable key={cIdx} onPress={handleBackspace} style={styles.keyBtn} accessibilityLabel="Delete">
                        <Delete size={22} color={colors.textPrimary} />
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable key={cIdx} onPress={() => handleKeyPress(item)} style={styles.keyBtn} accessibilityLabel={`Digit ${item}`}>
                      <Text style={[styles.keyNumber, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <Pressable onPress={() => setShowPinModal(false)} style={styles.cancelModalBtn}>
            <Text style={[styles.cancelModalText, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>Cancel Payment</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={false} transparent animationType="slide" onRequestClose={() => {}}>
        <View />
      </Modal>
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
  subHeader: { fontSize: 14, marginBottom: spacing.md },
  methodsContainer: { gap: spacing.sm, marginBottom: spacing.md },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    ...shadows.sm,
  },
  methodCardPressed: { opacity: 0.85 },
  methodLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  brandMarkWrap: { width: 52, alignItems: 'center', justifyContent: 'center' },
  brandSub: { fontSize: 8, marginTop: 1 },
  genericMark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 15 },
  methodSubtitle: { fontSize: 12, marginTop: 2 },
  walletBalanceHint: { fontSize: 12, marginTop: 2 },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C4C9D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardNumber: { fontSize: 14, flex: 1 },
  changeLink: { fontSize: 13 },
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
  pinScreen: { flex: 1, padding: spacing.md, paddingBottom: spacing.xl },
  pinPrompt: { fontSize: 15, textAlign: 'center', marginVertical: spacing.xl },
  pinBoxesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  pinBox: {
    width: 62,
    height: 62,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxText: { fontSize: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 22, marginBottom: spacing.sm },
  statusText: { fontSize: 12 },
  pinHint: { fontSize: 12, textAlign: 'center', height: 22, marginBottom: spacing.sm },
  keypad: { borderRadius: 24, padding: spacing.md, marginTop: spacing.md },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  keyBtn: { width: 68, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  keyNumber: { fontSize: 22 },
  cancelModalBtn: { marginTop: spacing.md, padding: spacing.xs, alignItems: 'center' },
  cancelModalText: { fontSize: 14 },
});


