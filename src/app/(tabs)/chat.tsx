import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { useBookings } from '../../services/queryClient';

export interface ChatThreadItem {
  id: string;
  technicianName: string;
  technicianRole: string;
  avatarUrl: string;
  isOnline: boolean;
  isVerified: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  lastSender: 'provider' | 'customer';
  bookingNumber: string;
}

export interface CallLogItem {
  id: string;
  technicianName: string;
  technicianRole: string;
  avatarUrl: string;
  type: 'incoming' | 'outgoing' | 'missed';
  time: string;
  duration?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  // Live threads derived from REAL bookings — no fake threads.
  const { data: bookings = [] } = useBookings();
  const threads: ChatThreadItem[] = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        technicianName: b.provider?.name || 'Assigned technician',
        technicianRole: b.service?.name || 'Home service',
        avatarUrl: b.provider?.avatarUrl || '',
        isOnline: false,
        isVerified: Boolean(b.provider?.isVerified ?? true),
        lastMessage: `Order #${b.bookingNumber} • ${String(b.status).replace('_', ' ')}`,
        lastMessageTime: (b.scheduledAt || '').slice(0, 10),
        unreadCount: 0,
        lastSender: 'provider' as const,
        bookingNumber: b.bookingNumber,
      })),
    [bookings],
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase().trim();
    return threads.filter(
      (t) =>
        t.technicianName.toLowerCase().includes(q) ||
        t.technicianRole.toLowerCase().includes(q) ||
        t.bookingNumber.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
    );
  }, [searchQuery, threads]);

  // Backend has no call-history endpoint — calls tab shows an EmptyState.
  const filteredCalls: CallLogItem[] = useMemo(() => [], []);

  const renderCallMeta = (type: CallLogItem['type']) => {
    switch (type) {
      case 'incoming':
        return { Icon: PhoneIncoming, color: colors.primary, label: 'Incoming' };
      case 'outgoing':
        return { Icon: PhoneOutgoing, color: colors.success, label: 'Outgoing' };
      case 'missed':
        return { Icon: PhoneMissed, color: colors.error, label: 'Missed' };
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Inbox</Text>
          <View style={styles.titleIcons}>
            <Search size={22} color={colors.textPrimary} />
            <SlidersHorizontal size={20} color={colors.textPrimary} />
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle }]}>
          <Pressable onPress={() => setActiveTab('chats')} style={styles.tabButton}>
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'chats' ? colors.primary : colors.textMuted },
              ]}
            >
              Chats
            </Text>
            {activeTab === 'chats' && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>

          <Pressable onPress={() => setActiveTab('calls')} style={styles.tabButton}>
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'calls' ? colors.primary : colors.textMuted },
              ]}
            >
              Calls
            </Text>
            {activeTab === 'calls' && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.inputFill }]}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search technician or order..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'chats' ? (
          filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => router.push(`/chat/${thread.id}`)}
                style={styles.threadRow}
              >
                {thread.avatarUrl ? (
                  <Image source={{ uri: thread.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {thread.technicianName.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.threadMid}>
                  <Text style={[styles.threadName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {thread.technicianName}
                  </Text>
                  <Text
                    style={[styles.threadSnippet, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {thread.lastMessage}
                  </Text>
                </View>
                <View style={styles.threadRight}>
                  {thread.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.unreadText}>{thread.unreadCount}</Text>
                    </View>
                  )}
                  <Text style={[styles.threadTime, { color: colors.textMuted }]}>
                    {thread.lastMessageTime}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <EmptyState
              title="No conversations yet"
              description="Your bookings will appear here once you create one. Messages unlock after a technician is dispatched."
              actionTitle="View bookings"
              onActionPress={() => router.push('/bookings')}
            />
          )
        ) : filteredCalls.length > 0 ? (
          filteredCalls.map((call) => {
            const meta = renderCallMeta(call.type);
            const MetaIcon = meta.Icon;
            return (
              <View key={call.id} style={styles.callRow}>
                <Image source={{ uri: call.avatarUrl }} style={styles.avatar} />
                <View style={styles.threadMid}>
                  <Text style={[styles.threadName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {call.technicianName}
                  </Text>
                  <View style={styles.callMetaRow}>
                    <MetaIcon size={13} color={meta.color} />
                    <Text style={[styles.callMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {meta.label} | {call.time}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push(`/chat/call/${call.id}`)}
                  style={[styles.callBtn, { borderColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Call technician"
                >
                  <Phone size={18} color={colors.primary} />
                </Pressable>
              </View>
            );
          })
        ) : (
          <EmptyState
            title="No Call History"
            description="You do not have any incoming or outgoing technician calls recorded."
            actionTitle="View Bookings"
            onActionPress={() => router.push('/bookings')}
          />
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      <Pressable
        onPress={() => router.push('/bookings')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="New conversation"
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerArea: {
    paddingTop: 54,
    paddingHorizontal: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
  },
  titleIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: spacing.md,
  },
  threadMid: {
    flex: 1,
    justifyContent: 'center',
  },
  threadName: {
    fontSize: 16,
    fontFamily: fonts.display,
    marginBottom: 2,
  },
  threadSnippet: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  threadRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  threadTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  callMetaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    flex: 1,
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
