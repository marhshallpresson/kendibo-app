import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header } from '../../components/ui';

const TABS = ['Upcoming', 'Active', 'Completed'];

const DUMMY_JOBS = [
  { id: '1', title: 'Deep Cleaning - 3 Bedroom', time: '10:00 AM Today', status: 'Active', price: '15000' },
  { id: '2', title: 'Plumbing - Leak Fix', time: '02:00 PM Tomorrow', status: 'Upcoming', price: '8000' },
  { id: '3', title: 'AC Repair', time: 'Yesterday', status: 'Completed', price: '20000' },
];

export default function ProviderBookingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Active');

  const filteredJobs = DUMMY_JOBS.filter(j => j.status === activeTab);

  const renderJob = ({ item }: { item: any }) => (
    <Pressable 
      style={[styles.jobCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/(provider)/job/${item.id}` as any)}
    >
      <View style={styles.jobHeader}>
        <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.jobPrice, { color: colors.primary }]}>₦ {item.price}</Text>
      </View>
      <Text style={[styles.jobTime, { color: colors.textSecondary }]}>{item.time}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="My Jobs"  />

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
                activeTab === tab && { fontFamily: fonts.semiBold }
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={item => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
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
  }
});


