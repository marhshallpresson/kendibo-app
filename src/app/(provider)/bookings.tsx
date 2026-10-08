import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { jobApi, ProviderBooking } from '@/services/api/jobs';
import { useAuthStore } from '@/stores';
import { formatKoboToNaira } from '@/utils/currency';

const TABS = ['Upcoming', 'Active', 'Completed'] as const;
type Tab = (typeof TABS)[number];

const ACTIVE_STATUSES = ['CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS'];
const COMPLETED_STATUSES = ['COMPLETED'];

function bucketOf(status: string): Tab {
  const s = status.toUpperCase();
  if (COMPLETED_STATUSES.includes(s)) return 'Completed';
  if (ACTIVE_STATUSES.includes(s)) return 'Active';
  return 'Upcoming';
}

export default function ProviderBookingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['provider-bookings', user?.id],
    queryFn: () => jobApi.getBookings(user!.id),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const filteredJobs = bookings.filter((b) => bucketOf(b.status) === activeTab);

  const renderJob = ({ item }: { item: ProviderBooking }) => (
    <Pressable
      style={[styles.jobCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/(provider)/job/${item.id}` as never)}
    >
      <View style={styles.jobHeader}>
        <Text style={[styles.jobTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.serviceId}
        </Text>
        {!!item.totalKobo && (
          <Text style={[styles.jobPrice, { color: colors.primary }]}>
            {formatKoboToNaira(Number(item.totalKobo))}
          </Text>
        )}
      </View>
      <Text style={[styles.jobTime, { color: colors.textSecondary }]}>
        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : item.status}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="My Jobs" />

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
                activeTab === tab && { fontFamily: fonts.semiBold },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.medium }}>
              No {activeTab.toLowerCase()} jobs found.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  jobCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  jobTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    flex: 1,
    paddingRight: 8,
  },
  jobPrice: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  jobTime: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});
