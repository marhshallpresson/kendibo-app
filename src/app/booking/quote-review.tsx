import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Platform, Alert, Pressable, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck, Lock, UserCheck, AlertTriangle, ChevronDown, Calendar, Clock, MapPin } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../_layout';
import { spacing, fonts, shadows } from '../../constants/theme';
import { formatKoboToNaira, calculateVatKobo } from '../../utils/currency';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { resolveImage } from '../../constants/images';

interface QuoteItemData {
  id: string;
  name: string;
  category: 'Labour' | 'Parts' | 'Consumable' | 'Credit';
  amountKobo: number;
}

export default function QuoteReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; equipment?: string }>();
  const { colors } = useAppTheme();
  const { addItem, clearCart } = useCartStore();
  const { currentAddress } = useLocationStore();

  const [quoteItems] = useState<QuoteItemData[]>([
    { id: 'q1', name: 'Precision Diagnostic & System Flushing Labour', category: 'Labour', amountKobo: 800000 },
    { id: 'q2', name: 'Dual Run Capacitor (45+5µF 450V CBB65)', category: 'Parts', amountKobo: 1450000 },
    { id: 'q3', name: 'R410A Eco Refrigerant Refill (1.2 kg)', category: 'Consumable', amountKobo: 1200000 },
    { id: 'q4', name: 'Inspection Callout Fee Credit', category: 'Credit', amountKobo: -300000 },
  ]);

  const [changeOrderStatus, setChangeOrderStatus] = useState<'PENDING' | 'APPROVED' | 'DECLINED'>('PENDING');
  const [detailsOpen, setDetailsOpen] = useState(true);

  const changeOrderData = {
    title: 'Brass Flare Nut & Copper Re-flaring',
    reason: 'Technician discovered cracked brass nut on suction line causing micro-leakage. Replacement prevents future refrigerant loss.',
    additionalCostKobo: 450000,
  };

  const baseSubtotalKobo = quoteItems.reduce((sum, item) => sum + item.amountKobo, 0);
  const changeOrderKobo = changeOrderStatus === 'APPROVED' ? changeOrderData.additionalCostKobo : 0;
  const currentSubtotalKobo = baseSubtotalKobo + changeOrderKobo;
  const vatKobo = calculateVatKobo(currentSubtotalKobo);
  const totalKobo = currentSubtotalKobo + vatKobo;

  const handleApproveChangeOrder = () => {
    setChangeOrderStatus('APPROVED');
    Alert.alert('Change Order Approved', '₦4,500 has been added to the itemized quote with warranty coverage.');
  };

  const handleDeclineChangeOrder = () => {
    setChangeOrderStatus('DECLINED');
    Alert.alert('Change Order Declined', 'The technician will proceed only with the previously approved scope.');
  };

  const handleAcceptAndLockQuote = () => {
    clearCart();
    addItem(
      {
        id: 'svc_quote_approved',
        categoryId: 'cat_repair',
        name: `Approved Diagnostic Repair: ${params.equipment || 'AC Inverter System'}`,
        description: 'Itemized diagnostic quote locked and approved by customer.',
        priceKobo: currentSubtotalKobo,
        durationMinutes: 120,
        rating: 4.9,
        reviewCount: 42,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
        isQuoteBased: true,
        addOns: [],
      },
      []
    );
    router.push({
      pathname: '/payment/checkout',
      params: { isQuotePayment: 'true', totalKobo: totalKobo.toString() },
    });
  };

  const handleRejectQuote = () => {
    Alert.alert(
      'Reject Quote',
      'Are you sure you want to decline this quote? The initial ₦3,000 diagnostic fee will settle the callout.',
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Reject Quote', style: 'destructive', onPress: () => router.push('/') },
      ]
    );
  };

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
        {/* Summary.png: address snapshot */}
        <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <MapPin size={18} color={colors.primary} />
          <View style={styles.addressMeta}>
            <Text style={[styles.addressTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Home</Text>
            <Text style={[styles.addressSub, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={2}>
              {currentAddress ? `${currentAddress.street}, ${currentAddress.landmark}` : 'Plot 14, Ewet Housing Estate, Uyo'}
            </Text>
          </View>
          <View style={[styles.slotChip, { backgroundColor: colors.primaryLight }]}>
            <Calendar size={14} color={colors.primary} />
            <Text style={[styles.slotChipText, { color: colors.primary, fontFamily: fonts.semiBold }]}>Tomorrow | 10:00 AM</Text>
          </View>
        </View>

        {/* Summary.png: Selected Services lavender card */}
        <View style={[styles.selectedCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.selectedTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Selected Services</Text>
          <View style={styles.selectedRow}>
            <Image source={resolveImage('electrician')} style={styles.selectedThumb} />
            <View style={styles.selectedMeta}>
              <Text style={[styles.selectedService, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={2}>
                {params.equipment || 'AC Inverter System'}
              </Text>
              <Text style={[styles.selectedPrice, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                {formatKoboToNaira(currentSubtotalKobo)}
              </Text>
            </View>
          </View>
          <Text style={[styles.selectedMetaLine, { color: colors.textSecondary, fontFamily: fonts.regular }]}>• 120 mins</Text>
          <Text style={[styles.selectedMetaLine, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            • {params.category || 'Air Conditioning & Refrigeration'}
          </Text>
          <Text style={[styles.selectedMetaLine, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            • 6-step process. Includes 30-day warranty
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Services</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
              {params.equipment || 'AC Repair'}
            </Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Category</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{params.category || 'Repair'}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Workers</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Emeka Okafor</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Date & Time</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Tomorrow | 10:00 AM</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Working Hours</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>2 hours</Text>
          </View>
          <View style={styles.snapshotTimeRow}>
            <Clock size={14} color={colors.primary} />
            <Text style={[styles.snapshotTimeText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Approx. 120 mins on site</Text>
          </View>
        </View>

        <Pressable
          style={[styles.detailsToggle, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => setDetailsOpen(!detailsOpen)}
        >
          <Text style={[styles.detailsToggleText, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
            Repair Quote Details
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: detailsOpen ? '180deg' : '0deg' }] }} />
        </Pressable>

        {detailsOpen && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {quoteItems.map((item) => (
              <View key={item.id} style={styles.sumRow}>
                <View style={styles.itemMeta}>
                  <Text style={[styles.itemName, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{item.name}</Text>
                  <Text style={[styles.itemCat, { color: colors.textMuted, fontFamily: fonts.regular }]}>{item.category}</Text>
                </View>
                <Text style={[styles.itemAmt, { color: item.amountKobo < 0 ? colors.success : colors.textPrimary, fontFamily: fonts.bold }]}>
                  {item.amountKobo < 0 ? '-' : ''}{formatKoboToNaira(Math.abs(item.amountKobo))}
                </Text>
              </View>
            ))}
            {changeOrderStatus === 'APPROVED' && (
              <View style={styles.sumRow}>
                <Text style={[styles.itemName, { color: colors.primary, fontFamily: fonts.semiBold }]}>+ {changeOrderData.title}</Text>
                <Text style={[styles.itemAmt, { color: colors.primary, fontFamily: fonts.bold }]}>
                  {formatKoboToNaira(changeOrderData.additionalCostKobo)}
                </Text>
              </View>
            )}
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.primary, fontFamily: fonts.bold }]}>Promo</Text>
              <Text style={[styles.sumValue, { color: colors.primary, fontFamily: fonts.bold }]}>- {formatKoboToNaira(300000)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>VAT (7.5%)</Text>
              <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{formatKoboToNaira(vatKobo)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={[styles.totalLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary, fontFamily: fonts.extraBold }]}>{formatKoboToNaira(totalKobo)}</Text>
            </View>
          </View>
        )}

        <View style={[styles.techCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.techHeader}>
            <View style={[styles.techAvatar, { backgroundColor: colors.primaryLight }]}>
              <UserCheck size={20} color={colors.primary} />
            </View>
            <View style={styles.techInfo}>
              <Text style={[styles.techName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Emeka Okafor • Verified Pro</Text>
              <Text style={[styles.techSpecialty, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                AC & Cooling Specialist • 7 Yrs Exp
              </Text>
            </View>
          </View>
          <Text style={[styles.diagnosisText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            &ldquo;Capacitor blown (0µF on multimeter). Hairline fracture on flare nut causing slow gas leak.&rdquo;
          </Text>
        </View>

        <View style={[styles.changeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.changeHeader}>
            <AlertTriangle size={18} color={STAR} />
            <Text style={[styles.changeTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              Change Order • {changeOrderStatus}
            </Text>
          </View>
          <Text style={[styles.changeDesc, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{changeOrderData.reason}</Text>
          <Text style={[styles.changeCost, { color: colors.primary, fontFamily: fonts.extraBold }]}>
            +{formatKoboToNaira(changeOrderData.additionalCostKobo)}
          </Text>
          {changeOrderStatus === 'PENDING' ? (
            <View style={styles.changeBtnRow}>
              <Button title="Decline" variant="outline" size="sm" onPress={handleDeclineChangeOrder} style={styles.coBtn} />
              <Button title="Approve & Add" variant="primary" size="sm" onPress={handleApproveChangeOrder} style={styles.coBtn} />
            </View>
          ) : (
            <Text style={[styles.coResolved, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Decision recorded: {changeOrderStatus} by customer.
            </Text>
          )}
        </View>

        <View style={[styles.lockBanner, { backgroundColor: colors.primaryLight }]}>
          <Lock size={16} color={colors.primary} />
          <Text style={[styles.lockText, { color: colors.primaryDark, fontFamily: fonts.semiBold }]}>
            Immutable Price Lock — no hidden fees once approved.
          </Text>
        </View>
        <View style={[styles.warrantyBox, { backgroundColor: colors.badgeGreenBg }]}>
          <ShieldCheck size={18} color={colors.success} />
          <Text style={[styles.warrantyText, { color: colors.success, fontFamily: fonts.bold }]}>
            30-Day KENDIBO Service Warranty included
          </Text>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Button title="Reject" variant="outline" onPress={handleRejectQuote} style={styles.rejectBtn} />
        <Button title="Accept & Lock Quote" variant="primary" onPress={handleAcceptAndLockQuote} style={styles.acceptBtn} />
      </View>
    </SafeAreaView>
  );
}

const STAR = '#FFB800';

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
  selectedCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md },
  selectedTitle: { fontSize: 18, marginBottom: spacing.sm },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  selectedThumb: { width: 64, height: 64, borderRadius: 16 },
  selectedMeta: { flex: 1 },
  selectedService: { fontSize: 16 },
  selectedPrice: { fontSize: 20, marginTop: 2 },
  selectedMetaLine: { fontSize: 13, marginTop: 4 },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  sumLabel: { fontSize: 13 },
  sumValue: { fontSize: 13, maxWidth: 180, textAlign: 'right' },
  snapshotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  snapshotTimeText: { fontSize: 12 },
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
  itemMeta: { flex: 1, paddingRight: spacing.sm },
  itemName: { fontSize: 13 },
  itemCat: { fontSize: 11, marginTop: 2 },
  itemAmt: { fontSize: 13 },
  divider: { height: 1, marginVertical: spacing.xs },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 17 },
  techCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  techHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  techAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  techInfo: { flex: 1 },
  techName: { fontSize: 13 },
  techSpecialty: { fontSize: 11, marginTop: 2 },
  diagnosisText: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  changeCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  changeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  changeTitle: { fontSize: 13, flex: 1 },
  changeDesc: { fontSize: 12, lineHeight: 17, marginBottom: spacing.xs },
  changeCost: { fontSize: 15, marginBottom: spacing.sm },
  changeBtnRow: { flexDirection: 'row', gap: spacing.sm },
  coBtn: { flex: 1 },
  coResolved: { fontSize: 12, fontStyle: 'italic' },
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

