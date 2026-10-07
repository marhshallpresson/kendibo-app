import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Wallet, Bell, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { jobApi } from '@/services/api/jobs';
import { useAuthStore } from '@/stores';

export default function ProviderDashboardScreen() {
  const user = useAuthStore(state => state.user);
  // Using a mocked providerId if not stored in user object for the pilot
  const providerId = user?.id || 'mock-provider-id';
  
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['provider-jobs', providerId],
    queryFn: () => jobApi.getOffers(providerId),
    refetchInterval: 5000,
  });
  
  const activeJobs = offers.filter(o => o.status === 'accepted');
  const pendingJobs = offers.filter(o => o.status === 'offered');
  const activeJob = activeJobs[0];

  const { colors } = useAppTheme();
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good morning,</Text>
          <Text style={[styles.name, { color: colors.textPrimary }]}>Courtney Henry</Text>
        </View>
        <Pressable style={styles.iconBtn}>
          <Bell size={24} color={colors.textPrimary} />
          <View style={[styles.badge, { backgroundColor: colors.error }]} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statValue}>₦ 25,000</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Jobs</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{pendingJobs.length}</Text>
          </View>
        </View>

        {/* Up Next / Active Job */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Up Next</Text>
        {activeJob ? (
          <Pressable 
            style={[styles.jobCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/(provider)/job/${activeJob.jobId}`)}
          >
            <View style={styles.jobHeader}>
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>Active Job</Text>
              </View>
              <Text style={[styles.jobTime, { color: colors.textSecondary }]}>Now</Text>
            </View>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>Service ${activeJob.jobId.slice(0, 8)}</Text>
            <View style={styles.jobFooter}>
              <Text style={[styles.jobPrice, { color: colors.primary }]}>Tap to view</Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        ) : (
          <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>No active jobs. Waiting for dispatch...</Text>
        )}
        {/* Setup Prompt (if KYC not complete, but here we assume it is, so just a quick link) */}
        <Pressable 
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(provider)/storefront')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
            <CheckCircle2 size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Complete Storefront</Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>Add photos to get more bookings.</Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  greeting: { fontFamily: fonts.medium, fontSize: 14 },
  name: { fontFamily: fonts.bold, fontSize: 20 },
  iconBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: { padding: spacing.lg, gap: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  statLabel: { color: '#fff', fontFamily: fonts.medium, fontSize: 13 },
  statValue: { color: '#fff', fontFamily: fonts.bold, fontSize: 22 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: -10 },
  jobCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.full },
  statusText: { fontFamily: fonts.semiBold, fontSize: 12 },
  jobTime: { fontFamily: fonts.medium, fontSize: 13 },
  jobTitle: { fontFamily: fonts.semiBold, fontSize: 16, marginBottom: 4 },
  jobAddress: { fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.md },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: spacing.md },
  jobPrice: { fontFamily: fonts.bold, fontSize: 16 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    gap: spacing.md,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: fonts.semiBold, fontSize: 15, marginBottom: 2 },
  actionDesc: { fontFamily: fonts.regular, fontSize: 13 },
  logoutBtn: { padding: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  logoutText: { fontFamily: fonts.semiBold, fontSize: 16 },
});
