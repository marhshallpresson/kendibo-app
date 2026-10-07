import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Download, Share2, CheckCircle2, ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAppTheme } from '../_layout';
import { spacing, fonts, shadows } from '../../constants/theme';
import { useBooking } from '../../services/queryClient';
import { Booking } from '../../types';
import { formatKoboToNaira } from '../../utils/currency';
import { formatDateWAT } from '../../utils/date';
import { useLocationStore } from '../../stores/locationStore';

export default function EReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    bookingNumber?: string;
    paymentRef?: string;
    amountKobo?: string;
    method?: string;
    serviceName?: string;
  }>();
  const { colors } = useAppTheme();

  const bookingId = params.id || 'job_kb_8821';
  const { currentAddress } = useLocationStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const { data: booking } = useBooking(bookingId);

  const bookingNumber = booking?.bookingNumber || params.bookingNumber || `KB-${bookingId.replace('job_kb_', '')}`;
  const transactionRef = params.paymentRef || `PAY-KBD-${bookingNumber.replace('KB-', '')}-99281`;
  const paymentMethod =
    params.method || (booking?.paymentMethod ? booking.paymentMethod.replace('_', ' ') : 'Credit Card');

  const serviceTitle = booking?.service?.name || params.serviceName || 'Home Deep Cleaning Service';
  const servicePriceKobo = booking?.priceKobo || 2700000;
  const vatKobo = booking?.vatKobo || Math.round(servicePriceKobo * 0.075);
  const discountKobo = booking?.discountKobo || 0;
  const platformFeeKobo = 50000;
  const totalPaidKobo = params.amountKobo
    ? parseInt(params.amountKobo, 10)
    : booking?.totalKobo || servicePriceKobo + vatKobo + platformFeeKobo - discountKobo;

  const formattedDate = booking?.scheduledAt ? formatDateWAT(booking.scheduledAt) : 'Dec 23, 2024';
  const timeSlot = booking?.arrivalWindow?.slotLabel || '10:00 AM';
  const paidAt = 'Dec 14, 2024 | 10:01 AM';

  const handleShare = async () => {
    try {
      const shareMessage = `KENDIBO Official E-Receipt\nBooking Ref: ${bookingNumber}\nTransaction: ${transactionRef}\nService: ${serviceTitle}\nAmount: ${formatKoboToNaira(totalPaidKobo)}\nDate: ${formattedDate}\nStatus: Paid (Escrow Verified)`;
      await Share.share({ message: shareMessage, title: `KENDIBO E-Receipt #${bookingNumber}` });
    } catch (error) {
      Alert.alert('Share Receipt', 'Unable to share receipt at this time.');
    }
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      Alert.alert('Receipt Downloaded', `Official tax receipt Kendibo_${bookingNumber}.pdf has been saved to your downloads.`);
    }, 800);
  };

  const handleCopyTransactionId = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleViewBookingDetails = () => {
    router.push({ pathname: '/tracking/[id]', params: { id: booking?.id || bookingId } });
  };

  const summaryRows: Array<[string, string]> = [
    ['Services', serviceTitle],
    ['Category', 'Cleaning'],
    ['Workers', booking?.provider?.name || 'KENDIBO Pro'],
    ['Date & Time', `${formattedDate} | ${timeSlot}`],
    ['Working Hours', `${booking?.service?.durationMinutes ? Math.ceil(booking.service.durationMinutes / 60) : 2} hours`],
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>E-Receipt</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={handleShare}
          hitSlop={8}
          accessibilityLabel="Share Receipt"
        >
          <Share2 size={19} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mockup 64 code block — QR of booking ref/txn id (replaces barcode strip) */}
        <View style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.qrFrame}>
            <QRCode
              value={transactionRef}
              size={164}
              color={colors.textPrimary}
              backgroundColor="transparent"
            />
          </View>
          <Text style={[styles.qrRef, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
            {transactionRef}
          </Text>
          <Text style={[styles.qrSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Booking #{bookingNumber}{currentAddress ? ` • ${currentAddress.city || 'Uyo'}` : ''}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {summaryRows.map(([label, value]) => (
            <View key={label} style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{label}</Text>
              <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.detailsToggle, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => setDetailsOpen(!detailsOpen)}
        >
          <Text style={[styles.detailsToggleText, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
            {serviceTitle} Details
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: detailsOpen ? '180deg' : '0deg' }] }} />
        </Pressable>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Amount</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {formatKoboToNaira(servicePriceKobo)}
            </Text>
          </View>
          {discountKobo > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.primary, fontFamily: fonts.bold }]}>Promo</Text>
              <Text style={[styles.sumValue, { color: colors.primary, fontFamily: fonts.bold }]}>
                - {formatKoboToNaira(discountKobo)}
              </Text>
            </View>
          )}
          {detailsOpen && (
            <>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>VAT (7.5%)</Text>
                <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  {formatKoboToNaira(vatKobo)}
                </Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Service Fee</Text>
                <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  {formatKoboToNaira(platformFeeKobo)}
                </Text>
              </View>
            </>
          )}
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Payment Methods</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{paymentMethod}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Date</Text>
            <Text style={[styles.sumValue, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{paidAt}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Transaction ID</Text>
            <Pressable onPress={handleCopyTransactionId} style={styles.txnRow} accessibilityRole="button">
              <Text style={[styles.txnText, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
                {transactionRef}
              </Text>
              <CheckCircle2 size={14} color={copiedId ? colors.success : colors.primary} />
            </Pressable>
          </View>
          <View style={styles.sumRow}>
            <Text style={[styles.sumLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Status</Text>
            <Badge label="Paid" variant="success" size="sm" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.sumRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Total Paid</Text>
            <Text style={[styles.totalValue, { color: colors.primary, fontFamily: fonts.extraBold }]}>
              {formatKoboToNaira(totalPaidKobo)}
            </Text>
          </View>
        </View>

        <View style={[styles.warrantyRow, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={16} color={colors.primary} />
          <Text style={[styles.warrantyText, { color: colors.primaryDark, fontFamily: fonts.semiBold }]}>
            Backed by Kendibo 14-Day Service Warranty • TIN-24891002-001
          </Text>
        </View>

        <View style={styles.actionSection}>
          <View style={styles.buttonRow}>
            <Button
              title="Share Receipt"
              onPress={handleShare}
              variant="outline"
              size="md"
              style={styles.halfBtn}
              icon={<Share2 size={16} color={colors.primary} />}
            />
            <Button
              title={isDownloading ? 'Saving...' : 'Download PDF'}
              onPress={handleDownloadPdf}
              disabled={isDownloading}
              variant="primary"
              size="md"
              style={styles.halfBtn}
              icon={isDownloading ? undefined : <Download size={16} color="#FFFFFF" />}
            />
          </View>
          {isDownloading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />}
          <Button
            title="Track Booking Details"
            onPress={handleViewBookingDetails}
            variant="outline"
            size="lg"
            style={styles.trackBtn}
            icon={<ChevronRight size={18} color={colors.primary} />}
          />
        </View>
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
  qrCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  qrFrame: { padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  qrRef: { fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  qrSub: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: 9 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  sumLabel: { fontSize: 13 },
  sumValue: { fontSize: 13, maxWidth: 190, textAlign: 'right' },
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
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'flex-end' },
  txnText: { fontSize: 12, maxWidth: 150 },
  divider: { height: 1, marginVertical: spacing.xs },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 17 },
  warrantyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  warrantyText: { fontSize: 11, flex: 1 },
  actionSection: { gap: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  halfBtn: { flex: 1 },
  trackBtn: { marginTop: spacing.xs },
});


