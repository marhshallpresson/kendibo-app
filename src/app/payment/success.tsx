import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, FileText, MapPin, ShieldCheck, Home } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../_layout';
import { spacing, fonts, shadows } from '../../constants/theme';
import { formatKoboToNaira } from '../../utils/currency';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    bookingNumber?: string;
    paymentRef?: string;
    amountKobo?: string;
    method?: string;
    serviceName?: string;
  }>();
  const { colors } = useAppTheme();

  const bookingId = params.bookingId || 'job_kb_8821';
  const bookingNumber = params.bookingNumber || 'KB-8821';
  const amountKobo = params.amountKobo ? parseInt(params.amountKobo, 10) : 2700000;
  const serviceName = params.serviceName || 'Home Deep Cleaning Service';

  const handleViewReceipt = () => {
    router.push({
      pathname: '/receipt/[id]',
      params: {
        id: bookingId,
        bookingNumber,
        paymentRef: params.paymentRef || '',
        amountKobo: amountKobo.toString(),
        method: params.method || '',
        serviceName,
      },
    });
  };

  const handleTrackBooking = () => {
    router.replace({ pathname: '/tracking/[id]', params: { id: bookingId } });
  };

  const handleBackToHome = () => {
    router.replace('/(tabs)');
  };

  const handleMessageWorkers = () => {
    router.push({ pathname: '/tracking/[id]', params: { id: bookingId } });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={handleBackToHome}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mockup 63: primary success medallion with check */}
        <View style={[styles.successCircle, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <View style={styles.checkBadge}>
            <Check size={40} color={colors.primary} strokeWidth={3} />
          </View>
          {[
            { top: 8, left: 18, s: 12 },
            { top: 22, right: 14, s: 10 },
            { bottom: 26, left: 8, s: 8 },
            { bottom: 12, right: 24, s: 6 },
          ].map((d: any, i: number) => (
            <View
              key={i}
              style={[
                styles.sparkle,
                { backgroundColor: colors.primaryLight, width: d.s, height: d.s, top: d.top, left: d.left, right: d.right, bottom: d.bottom },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.title, { color: colors.primary, fontFamily: fonts.extraBold }]}>Booking Successful!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          You have successfully made payment and booked the services.
        </Text>

        <View style={[styles.amountContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.amountLabel, { color: colors.textMuted, fontFamily: fonts.semiBold }]}>Amount Paid</Text>
          <Text style={[styles.amountValue, { color: colors.primary, fontFamily: fonts.extraBold }]}>
            {formatKoboToNaira(amountKobo)}
          </Text>
          <Text style={[styles.bookingRef, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Booking #{bookingNumber} • {serviceName}
          </Text>
        </View>

        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.primary, fontFamily: fonts.bold }]}>What Happens Next?</Text>
            <Text style={[styles.infoText, { color: colors.textPrimary, fontFamily: fonts.regular }]}>
              We are assigning a top-rated, background-checked professional. Track ETA on the live map.
            </Text>
          </View>
        </View>

        <View style={styles.ctaContainer}>
          <Button title="View E-Receipt" onPress={handleViewReceipt} variant="primary" size="lg" icon={<FileText size={18} color="#FFFFFF" />} />
          <View style={styles.btnSpacing} />
          <Button
            title="Message Workers"
            onPress={handleMessageWorkers}
            variant="outline"
            size="lg"
            icon={<MapPin size={18} color={colors.primary} />}
          />
          <Pressable onPress={handleTrackBooking} style={styles.trackLink} accessibilityRole="button">
            <Text style={[styles.trackLinkText, { color: colors.primary, fontFamily: fonts.bold }]}>Track Booking Status</Text>
          </Pressable>
          <Pressable onPress={handleBackToHome} style={styles.homeBtn} accessibilityRole="button">
            <Home size={16} color={colors.textSecondary} />
            <Text style={[styles.homeBtnText, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>Return to Home</Text>
          </Pressable>
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
  scrollContent: { padding: spacing.xl, alignItems: 'center', paddingBottom: spacing.xxl },
  successCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: { position: 'absolute', borderRadius: 999, opacity: 0.9 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 300, marginBottom: spacing.lg, lineHeight: 20 },
  amountContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
  },
  amountLabel: { fontSize: 11, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 30, marginBottom: spacing.xs },
  bookingRef: { fontSize: 12, textAlign: 'center' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    width: '100%',
    marginBottom: spacing.xl,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, marginBottom: 2 },
  infoText: { fontSize: 12, lineHeight: 18 },
  ctaContainer: { width: '100%', alignItems: 'center' },
  btnSpacing: { height: spacing.sm },
  trackLink: { marginTop: spacing.md, padding: spacing.sm },
  trackLinkText: { fontSize: 14 },
  homeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, padding: spacing.sm },
  homeBtnText: { fontSize: 14 },
});
