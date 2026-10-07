import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header, Button } from '../../components/ui';

const TRANSACTIONS = [
  { id: '1', type: 'Payout', amount: '-25000', date: 'Today, 09:00 AM', status: 'Completed' },
  { id: '2', type: 'Job Payment', amount: '+15000', date: 'Yesterday, 04:30 PM', title: 'Deep Cleaning' },
  { id: '3', type: 'Job Payment', amount: '+10000', date: 'Oct 5, 02:15 PM', title: 'Plumbing Fix' },
];

export default function ProviderEarningsScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Earnings & Wallet"  />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₦ 45,500</Text>
          
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.footerLabel}>Pending Clearance</Text>
              <Text style={styles.footerValue}>₦ 12,000</Text>
            </View>
            <Button 
              title="Withdraw" 
              variant="outline" 
              size="sm" 
              style={{ borderColor: '#fff' }} 
              textStyle={{ color: '#fff' }}
              onPress={() => alert('Withdrawal requested')}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>

        <View style={styles.transactionList}>
          {TRANSACTIONS.map((tx) => {
            const isCredit = tx.amount.startsWith('+');
            return (
              <View key={tx.id} style={[styles.txItem, { backgroundColor: colors.surface }]}>
                <View style={[styles.txIcon, { backgroundColor: isCredit ? colors.success + '20' : colors.error + '20' }]}>
                  {isCredit ? (
                    <ArrowDownLeft size={20} color={colors.success} />
                  ) : (
                    <ArrowUpRight size={20} color={colors.error} />
                  )}
                </View>
                
                <View style={styles.txDetails}>
                  <Text style={[styles.txTitle, { color: colors.textPrimary }]}>
                    {tx.type === 'Job Payment' ? tx.title : tx.type}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.textPrimary }]}>
                    {tx.amount.replace('-', '- ')}
                  </Text>
                  {tx.status && (
                    <Text style={[styles.txStatus, { color: colors.textSecondary }]}>{tx.status}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

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
  balanceAmount: { color: '#fff', fontFamily: fonts.bold, fontSize: 32, marginBottom: spacing.xl },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: spacing.md,
  },
  footerLabel: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 12 },
  footerValue: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
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
  txStatus: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
});

