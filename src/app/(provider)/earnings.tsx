import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDownLeft } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { jobApi } from '@/services/api/jobs';
import { useProviderId } from '@/hooks/useProviderId';
import { formatKoboToNaira } from '@/utils/currency';

export default function ProviderEarningsScreen() {
  const { colors } = useAppTheme();
  const providerId = useProviderId();

  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['provider-earnings', providerId],
    enabled: !!providerId,
    queryFn: () => jobApi.getEarnings(providerId!),
    refetchInterval: 15000,
  });

  const totalKobo = earnings.reduce((acc, e) => acc + Number(e.amountKobo) + Number(e.tipKobo ?? 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Earnings & Wallet" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Total Earnings</Text>
          <Text style={styles.balanceAmount}>{formatKoboToNaira(totalKobo)}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>

        {isLoading ? (
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular }}>Loading…</Text>
        ) : earnings.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.regular }}>
            No earnings yet. Emissions appear after completed jobs.
          </Text>
        ) : (
          <View style={styles.transactionList}>
            {earnings.map((tx) => (
              <View key={tx.id} style={[styles.txItem, { backgroundColor: colors.surface }]}>
                <View style={[styles.txIcon, { backgroundColor: colors.success + '20' }]}>
                  <ArrowDownLeft size={20} color={colors.success} />
                </View>

                <View style={styles.txDetails}>
                  <Text style={[styles.txTitle, { color: colors.textPrimary }]}>Job Payment</Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmount, { color: colors.success }]}>
                    + {formatKoboToNaira(Number(tx.amountKobo) + Number(tx.tipKobo ?? 0))}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  balanceCard: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontFamily: fonts.bold, fontSize: 32 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: -10 },
  transactionList: { gap: spacing.md },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txDetails: { flex: 1 },
  txTitle: { fontFamily: fonts.semiBold, fontSize: 15, marginBottom: 2 },
  txDate: { fontFamily: fonts.regular, fontSize: 12 },
  txAmount: { fontFamily: fonts.bold, fontSize: 15 },
});
