import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  RotateCcw,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react-native';
import { Header, Button, Card, Badge, EmptyState } from '../../components/ui';
import { useWalletStore, WalletTransaction } from '../../stores/walletStore';
import { formatKoboToNaira, nairaToKobo } from '../../utils/currency';
import { radii, spacing, typography, shadows, ColorTokens } from '../../constants/theme';
import { useAppTheme } from '../_layout';

type FilterTab = 'all' | 'credits' | 'debits' | 'refunds';

const TOP_UP_PRESETS = [
  { label: '₦5,000', kobo: 500000 },
  { label: '₦10,000', kobo: 1000000 },
  { label: '₦20,000', kobo: 2000000 },
  { label: '₦50,000', kobo: 5000000 },
];

export default function WalletScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const {
    balanceKobo,
    isBalanceHidden,
    transactions,
    refundCredits,
    toggleBalanceVisibility,
    topUp,
    refresh,
  } = useWalletStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedTopUpPreset, setSelectedTopUpPreset] = useState<number>(1000000); // ₦10,000 default
  const [customAmountText, setCustomAmountText] = useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const topUpMethod = 'bachs';

  // Withdrawal modal removed - no backend payout endpoint

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'credits') return tx.type === 'credit';
    if (activeFilter === 'debits') return tx.type === 'debit';
    if (activeFilter === 'refunds') return tx.category === 'refund';
    return true;
  });

  const handleExecuteTopUp = async () => {
    let finalKobo = selectedTopUpPreset;
    if (customAmountText.trim()) {
      const parsedNaira = parseFloat(customAmountText.replace(/[^0-9.]/g, ''));
      if (isNaN(parsedNaira) || parsedNaira < 500) {
        Alert.alert('Invalid Amount', 'Minimum top-up amount is ₦500.');
        return;
      }
      finalKobo = nairaToKobo(parsedNaira);
    }

    const { requireOnline } = require('../../services/txnGuard');
    if (!(await requireOnline('Wallet top-up'))) return; // button already disabled while processing
    setIsProcessingTopUp(true);
    const result = await topUp(finalKobo, 'Bachs Checkout');
    setIsProcessingTopUp(false);
    setShowTopUpModal(false);
    setCustomAmountText('');

    if (result.success) {
      Alert.alert(
        'Top-Up Successful!',
        `Your wallet has been credited with ${formatKoboToNaira(finalKobo)}.\nReference: ${result.reference}`
      );
    }
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Kendibo Wallet"
        subtitle="Manage balance, top-ups & refunds"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Hero Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceTitleRow}>
              <View style={styles.walletIconCircle}>
                <WalletIcon size={20} color={colors.textInverse} />
              </View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>

            <Pressable
              onPress={toggleBalanceVisibility}
              style={styles.eyeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Toggle balance visibility"
            >
              {isBalanceHidden ? (
                <EyeOff size={20} color={colors.textInverse} />
              ) : (
                <Eye size={20} color={colors.textInverse} />
              )}
            </Pressable>
          </View>

          {/* Balance Amount */}
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>
              {isBalanceHidden ? '₦ •••••••' : formatKoboToNaira(balanceKobo)}
            </Text>
            <Badge label="NGN" variant="neutral" size="sm" style={styles.currencyBadge} />
          </View>

          <Text style={styles.escrowSubtext}>
            Protected by Kendibo Escrow & Central Bank of Nigeria compliant partner banks
          </Text>

          {/* Hero Action Buttons */}
          <View style={styles.balanceActionsRow}>
            <Pressable
              onPress={() => setShowTopUpModal(true)}
              style={({ pressed }) => [
                styles.heroActionBtn,
                pressed && styles.heroActionBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={styles.heroActionIconCircle}>
                <Plus size={18} color={colors.primary} />
              </View>
              <Text style={styles.heroActionText}>Add Money</Text>
            </Pressable>



            <Pressable
              onPress={() => {
                Alert.alert(
                  'Auto-Refund Policy',
                  'When any booking is cancelled before technician dispatch, 100% of your funds are immediately credited back to your Kendibo Wallet with zero deduction fees.'
                );
              }}
              style={({ pressed }) => [
                styles.heroActionBtn,
                pressed && styles.heroActionBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={styles.heroActionIconCircle}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <Text style={styles.heroActionText}>Refund Rules</Text>
            </Pressable>
          </View>
        </View>

        {/* Refund Credits Highlight Section */}
        {refundCredits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <RotateCcw size={18} color={colors.success} />
                <Text style={styles.sectionTitle}>Refund Credits</Text>
              </View>
              <Badge
                label={`${refundCredits.length} Active`}
                variant="success"
                size="sm"
              />
            </View>

            {refundCredits.map((refund) => (
              <Card key={refund.id} style={styles.refundCard}>
                <View style={styles.refundCardHeader}>
                  <View style={styles.refundServiceInfo}>
                    <Text style={styles.refundServiceName}>{refund.serviceName}</Text>
                    <Text style={styles.refundBookingRef}>Booking #{refund.bookingNumber}</Text>
                  </View>
                  <Text style={styles.refundAmount}>
                    +{formatKoboToNaira(refund.amountKobo)}
                  </Text>
                </View>

                <Text style={styles.refundReason}>{refund.reason}</Text>

                <View style={styles.refundFooter}>
                  <View style={styles.refundStatusBadge}>
                    <CheckCircle2 size={12} color={colors.badgeGreenText} />
                    <Text style={styles.refundStatusText}>Credited to Wallet</Text>
                  </View>
                  <Text style={styles.refundDate}>{refund.date}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Transactions Section & Filter Tabs */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.transactionCountText}>
              {filteredTransactions.length} records
            </Text>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['all', 'credits', 'debits', 'refunds'] as FilterTab[]).map((tab) => {
              const isSelected = activeFilter === tab;
              const labels: Record<FilterTab, string> = {
                all: 'All',
                credits: 'Credits (+)',
                debits: 'Debits (-)',
                refunds: 'Refunds',
              };

              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveFilter(tab)}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillSelected,
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextSelected,
                    ]}
                  >
                    {labels[tab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <EmptyState
              title="No Transactions Found"
              description="There are no ledger entries matching the selected filter."
              icon={<WalletIcon size={40} color={colors.primary} />}
            />
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <Card key={tx.id} style={styles.txCard}>
                    <View style={styles.txRow}>
                      <View
                        style={[
                          styles.txIconWrap,
                          isCredit ? styles.txIconCredit : styles.txIconDebit,
                        ]}
                      >
                        {isCredit ? (
                          <ArrowDownLeft
                            size={18}
                            color={colors.success}
                          />
                        ) : (
                          <ArrowUpRight
                            size={18}
                            color={colors.error}
                          />
                        )}
                      </View>

                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>{tx.title}</Text>
                        <Text style={styles.txDesc} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text style={styles.txRef}>{tx.reference}</Text>
                      </View>

                      <View style={styles.txAmountWrap}>
                        <Text
                          style={[
                            styles.txAmount,
                            isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                          ]}
                        >
                          {isCredit ? '+' : '-'} {formatKoboToNaira(tx.amountKobo)}
                        </Text>
                        <Badge
                          label={tx.status}
                          variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}
                          size="sm"
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconWrap}>
                <Plus size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Fund Kendibo Wallet</Text>
                <Text style={styles.modalSubtitle}>Select or enter top-up amount</Text>
              </View>
            </View>

            {/* Presets Grid */}
            <Text style={styles.inputGroupLabel}>Quick Amounts</Text>
            <View style={styles.presetsGrid}>
              {TOP_UP_PRESETS.map((preset) => {
                const isSelected = selectedTopUpPreset === preset.kobo && !customAmountText;
                return (
                  <Pressable
                    key={preset.kobo}
                    onPress={() => {
                      setSelectedTopUpPreset(preset.kobo);
                      setCustomAmountText('');
                    }}
                    style={[
                      styles.presetBtn,
                      isSelected && styles.presetBtnSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        isSelected && styles.presetBtnTextSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Amount Field */}
            <Text style={styles.inputGroupLabel}>Or Custom Amount (NGN)</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g. 15,000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={customAmountText}
              onChangeText={(val) => {
                setCustomAmountText(val);
                setSelectedTopUpPreset(0);
              }}
            />



            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                onPress={() => setShowTopUpModal(false)}
                variant="outline"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title={isProcessingTopUp ? 'Funding...' : 'Proceed to Fund'}
                onPress={handleExecuteTopUp}
                loading={isProcessingTopUp}
                disabled={isProcessingTopUp}
                variant="primary"
                size="md"
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  balanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 4,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  balanceValue: {
    ...typography.h1,
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 34,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  escrowSubtext: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: spacing.lg,
  },
  balanceActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  heroActionBtnPressed: {
    opacity: 0.7,
  },
  heroActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...shadows.sm,
  },
  heroActionText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transactionCountText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  refundCard: {
    padding: spacing.md,
    backgroundColor: colors.badgeGreenBg,
    borderColor: colors.success,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  refundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  refundServiceInfo: {
    flex: 1,
  },
  refundServiceName: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  refundBookingRef: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  refundAmount: {
    ...typography.subtitle1,
    fontWeight: '800',
    color: colors.success,
  },
  refundReason: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
    marginVertical: 4,
  },
  refundFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  refundStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refundStatusText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.badgeGreenText,
    fontWeight: '600',
  },
  refundDate: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: colors.textInverse,
  },
  transactionsList: {
    gap: spacing.sm,
  },
  txCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: colors.badgeGreenBg,
  },
  txIconDebit: {
    backgroundColor: colors.badgeRedBg,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  txRef: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    ...typography.body2,
    fontWeight: '700',
  },
  txAmountCredit: {
    color: colors.success,
  },
  txAmountDebit: {
    color: colors.textPrimary,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.modalSheet,
    borderTopRightRadius: radii.modalSheet,
    padding: spacing.xl,
    ...shadows.modal,
  },
  modalGrabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inputGroupLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetBtn: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  presetBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  presetBtnTextSelected: {
    color: colors.primary,
  },
  customInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  methodChoiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  methodChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    justifyContent: 'center',
  },
  methodChoiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodChoiceText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodChoiceTextSelected: {
    color: colors.primary,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bankAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  accountNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  accountHolder: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  withdrawSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  withdrawSummaryLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  withdrawSummaryValue: {
    ...typography.subtitle1,
    fontWeight: '800',
    color: colors.primary,
  },
});
