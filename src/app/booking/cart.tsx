import React, { useState } from 'react';
import { resolveImage } from '../../constants/images';
import { useWatchupScreen } from '../../hooks/useWatchupScreen';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, Platform, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Tag,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Home,
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppTheme } from '../_layout';
import { spacing, fonts, shadows } from '../../constants/theme';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { formatKoboToNaira, calculateVatKobo } from '../../utils/currency';

/** Cart used to ship a hardcoded past date ('2026-10-07'); default to tomorrow. */
const tomorrowISO = (): string => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const tomorrowLabel = (): string =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function BookingCartScreen() {
  useWatchupScreen('BookingCart');

  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    scheduledDate?: string;
    timeSlot?: string;
    frequency?: string;
    instructions?: string;
  }>();
  const { colors } = useAppTheme();

  const { items, addItem, removeItem, promoCode, discount, removePromo } = useCartStore();
  const { currentAddress } = useLocationStore();

  const [promoInput, setPromoInput] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');

  // Cart starts empty — items are added from live service detail screens.
  // No mock auto-seed.

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a coupon code.');
      return;
    }
    // Promo codes are validated and priced server-side only. No promo contract
    // is wired yet, so this never fabricates a discount locally.
    setPromoError('Promo codes cannot be verified right now.');
  };

  const handleRemovePromo = () => {
    removePromo();
    setPromoError('');
  };

  const handleUpdateAddOnQty = (serviceId: string, addOnId: string, delta: number) => {
    const item = items.find((i) => i.service.id === serviceId);
    if (!item) return;
    const updatedAddOns = item.selectedAddOns
      .map((ao) => {
        if (ao.addOn.id === addOnId) {
          const newQty = Math.max(0, ao.quantity + delta);
          return { ...ao, quantity: newQty };
        }
        return ao;
      })
      .filter((ao) => ao.quantity > 0);
    addItem(item.service, updatedAddOns);
  };

  const subtotalKobo = items.reduce((acc, i) => acc + i.subtotalKobo, 0);
  const platformFeeKobo = items.length > 0 ? 50000 : 0;
  const activeDiscountKobo = Math.min(discount, subtotalKobo);
  const taxableBaseKobo = Math.max(0, subtotalKobo - activeDiscountKobo);
  const vatKobo = calculateVatKobo(taxableBaseKobo);
  const totalPayableKobo = Math.max(0, taxableBaseKobo + vatKobo + platformFeeKobo);

  const handleProceedToPayment = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add at least one service before proceeding.');
      return;
    }
    // FIX: forward frequency/instructions received from schedule so nothing is dropped.
    router.push({
      pathname: '/payment/checkout',
      params: {
        totalKobo: totalPayableKobo.toString(),
        subtotalKobo: subtotalKobo.toString(),
        vatKobo: vatKobo.toString(),
        discountKobo: activeDiscountKobo.toString(),
        scheduledDate: searchParams.scheduledDate || tomorrowISO(),
        timeSlot: searchParams.timeSlot || '10:00 AM - 12:00 PM',
        frequency: searchParams.frequency || 'ONCE',
        instructions: searchParams.instructions || '',
      },
    });
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.headerBar}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Summary</Text>
          <View style={{ width: 42 }} />
        </View>
        <EmptyState
          title="Your Cart is Empty"
          description="Browse our trusted home services catalog and schedule an expert technician."
          buttonTitle="Explore Services"
          onButtonPress={() => router.push('/search')}
        />
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Summary</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary.png: address card */}
        <View style={[styles.homeCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Home size={18} color={colors.textPrimary} />
          <View style={styles.homeMeta}>
            <Text style={[styles.homeTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Home</Text>
            <Text style={[styles.homeSub, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={2}>
              {currentAddress ? `${currentAddress.street}, ${currentAddress.estate || currentAddress.city || currentAddress.state || ''}`.replace(/, $/, '') : 'Add a service address to continue'}
            </Text>
          </View>
        </View>

        {/* Summary.png: Selected Services lavender card */}
        <View style={[styles.selectedCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.selectedTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Selected Services</Text>
          {items.map((cartItem) => (
            <View key={cartItem.service.id} style={styles.selectedRow}>
              <Image source={resolveImage(cartItem.service.imageUrl)} style={styles.selectedThumb} />
              <View style={styles.selectedMeta}>
                <Text style={[styles.selectedName, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
                  {cartItem.service.name}
                </Text>
                <Text style={[styles.selectedPrice, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                  {formatKoboToNaira(cartItem.service.priceKobo)}
                </Text>
              </View>
              <Pressable onPress={() => removeItem(cartItem.service.id)} hitSlop={8} style={styles.removeBtn}>
                <Trash2 size={16} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <Text style={[styles.selectedMetaLine, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            • Approx. {items[0].service.durationMinutes} mins
          </Text>
          <View style={styles.snapshotRow}>
            <Calendar size={14} color={colors.primary} />
            <Text style={[styles.snapshotText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {searchParams.scheduledDate || tomorrowLabel()}
              {searchParams.frequency ? ` • ${searchParams.frequency}` : ''}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Clock size={14} color={colors.primary} />
            <Text style={[styles.snapshotText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {searchParams.timeSlot || '10:00 AM - 12:00 PM (WAT)'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <MapPin size={14} color={colors.primary} />
            <Text style={[styles.snapshotText, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
              {currentAddress ? `${currentAddress.street}, ${currentAddress.estate || currentAddress.city || currentAddress.state || ''}`.replace(/, $/, '') : 'Add a service address to continue'}
            </Text>
          </View>
          {!!searchParams.instructions && (
            <Text style={[styles.instructionsLine, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={2}>
              • Note: {searchParams.instructions}
            </Text>
          )}
        </View>

        {items.map((cartItem) => (
          <View key={cartItem.service.id} style={[styles.addonCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.addonCardTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Add-ons • {cartItem.service.name}</Text>
            {cartItem.selectedAddOns.length > 0 ? (
              cartItem.selectedAddOns.map((ao) => (
                <View key={ao.addOn.id} style={styles.addOnRow}>
                  <View style={styles.addOnMeta}>
                    <Text style={[styles.addOnName, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{ao.addOn.name}</Text>
                    <Text style={[styles.addOnUnitPrice, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                      {formatKoboToNaira(ao.addOn.priceKobo)} each
                    </Text>
                  </View>
                  <View style={[styles.qtyControl, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                    <Pressable onPress={() => handleUpdateAddOnQty(cartItem.service.id, ao.addOn.id, -1)} style={styles.qtyBtn}>
                      <Minus size={14} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={[styles.qtyValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{ao.quantity}</Text>
                    <Pressable onPress={() => handleUpdateAddOnQty(cartItem.service.id, ao.addOn.id, 1)} style={styles.qtyBtn}>
                      <Plus size={14} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.noAddonText, { color: colors.textMuted, fontFamily: fonts.regular }]}>No add-ons selected</Text>
            )}
            <View style={[styles.itemFooter, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.itemTotalLabel, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>Service Subtotal</Text>
              <Text style={[styles.itemTotalVal, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                {formatKoboToNaira(cartItem.subtotalKobo)}
              </Text>
            </View>
          </View>
        ))}

        {/* Mockup 56/57: Promo Code */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Promo Code</Text>
        {promoCode ? (
          <View style={[styles.activePromoCard, { backgroundColor: colors.badgeGreenBg, borderColor: colors.success }]}>
            <View style={styles.activePromoLeft}>
              <CheckCircle2 size={18} color={colors.success} />
              <View>
                <Text style={[styles.activePromoCode, { color: colors.success, fontFamily: fonts.bold }]}>Code: {promoCode}</Text>
                <Text style={[styles.activePromoSavings, { color: colors.textPrimary, fontFamily: fonts.regular }]}>
                  Discount of {formatKoboToNaira(activeDiscountKobo)} applied
                </Text>
              </View>
            </View>
            <Pressable onPress={handleRemovePromo} hitSlop={8}>
              <Text style={[styles.removePromoText, { color: colors.error, fontFamily: fonts.bold }]}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.promoInputRow}>
            <View style={styles.promoInputWrap}>
              <Input
                value={promoInput}
                onChangeText={setPromoInput}
                placeholder="Enter Promo Code"
                autoCapitalize="characters"
                error={promoError}
                leftIcon={<Tag size={18} color={colors.textSecondary} />}
              />
            </View>
            <Pressable
              style={[styles.promoAddBtn, { backgroundColor: colors.primaryLight }]}
              onPress={handleApplyPromo}
              accessibilityRole="button"
              accessibilityLabel="Apply promo"
            >
              <Plus size={18} color={colors.primary} />
            </Pressable>
          </View>
        )}

        {/* Summary.png: Payment Summary */}
        <View style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.paymentTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Payment Summary</Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Item Total</Text>
            <Text style={[styles.breakdownVal, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{formatKoboToNaira(subtotalKobo)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Item Discount</Text>
            <Text style={[styles.breakdownVal, { color: colors.success, fontFamily: fonts.semiBold }]}>
              -{formatKoboToNaira(activeDiscountKobo)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Service Fee</Text>
            <Text style={[styles.breakdownVal, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{formatKoboToNaira(platformFeeKobo)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>VAT (7.5%)</Text>
            <Text style={[styles.breakdownVal, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{formatKoboToNaira(vatKobo)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.breakdownRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Grand Total</Text>
            <Text style={[styles.totalVal, { color: colors.primary, fontFamily: fonts.extraBold }]}>{formatKoboToNaira(totalPayableKobo)}</Text>
          </View>
          {activeDiscountKobo > 0 && (
            <View style={[styles.savingsBanner, { backgroundColor: colors.badgeGreenBg }]}>
              <Text style={[styles.savingsText, { color: colors.success, fontFamily: fonts.semiBold }]}>
                Hurray! You saved {formatKoboToNaira(activeDiscountKobo)} on final bill
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.policyBox, { backgroundColor: colors.surfaceCard }]}>
          <ShieldCheck size={18} color={colors.primary} />
          <Text style={[styles.policyText, { color: colors.primaryDark, fontFamily: fonts.regular }]}>
            Free cancellation up to 2 hours before arrival. Escrow protection until you confirm satisfaction.
          </Text>
        </View>
        <View style={{ height: 130 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Button title={`Schedule for later`} variant="outline" onPress={handleProceedToPayment} style={styles.halfBtn} />
        <Button title="Request Now" variant="primary" onPress={handleProceedToPayment} style={styles.halfBtn} />
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
  homeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  homeMeta: { flex: 1 },
  homeTitle: { fontSize: 14 },
  homeSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  selectedCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md, gap: 4 },
  selectedTitle: { fontSize: 18, marginBottom: spacing.sm },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  selectedThumb: { width: 52, height: 52, borderRadius: 16 },
  selectedMeta: { flex: 1 },
  selectedName: { fontSize: 15 },
  selectedPrice: { fontSize: 16, marginTop: 2 },
  removeBtn: { padding: 6 },
  selectedMetaLine: { fontSize: 13, marginTop: 4 },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  snapshotText: { fontSize: 12 },
  instructionsLine: { fontSize: 12, marginTop: 4 },
  addonCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  addonCardTitle: { fontSize: 14, marginBottom: spacing.xs },
  addOnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  addOnMeta: { flex: 1 },
  addOnName: { fontSize: 13 },
  addOnUnitPrice: { fontSize: 10 },
  noAddonText: { fontSize: 12, marginVertical: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  qtyBtn: { padding: 8 },
  qtyValue: { fontSize: 13, paddingHorizontal: 8 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1 },
  itemTotalLabel: { fontSize: 13 },
  itemTotalVal: { fontSize: 15 },
  sectionTitle: { fontSize: 16, marginTop: spacing.sm, marginBottom: spacing.xs },
  promoInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  promoInputWrap: { flex: 1 },
  promoAddBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  activePromoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  activePromoLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  activePromoCode: { fontSize: 14 },
  activePromoSavings: { fontSize: 12 },
  removePromoText: { fontSize: 12 },
  paymentCard: { borderRadius: 20, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  paymentTitle: { fontSize: 17, marginBottom: spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 13 },
  breakdownVal: { fontSize: 13 },
  divider: { height: 1, marginVertical: spacing.sm },
  totalLabel: { fontSize: 15 },
  totalVal: { fontSize: 18 },
  savingsBanner: { borderRadius: 12, padding: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  savingsText: { fontSize: 12 },
  policyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: 20, marginBottom: spacing.md },
  policyText: { fontSize: 12, flex: 1, lineHeight: 16 },
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
  halfBtn: { flex: 1 },
});


