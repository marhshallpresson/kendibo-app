import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BellRing, Tag, MessageCircle, Info, CheckCheck } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotificationStore, timeAgo, NotificationKind } from '../../stores/notificationStore';
import { goBack } from '../../utils/navigation';

function KindIcon({ kind }: { kind: NotificationKind }) {
  const bg = { booking: '#E7EFFF', promo: '#FFF3DC', chat: '#E3F5EC', system: '#EFE7FF' }[kind];
  const fg = { booking: '#0463ee', promo: '#B7791F', chat: '#12A56B', system: '#6D3DF5' }[kind];
  const Icon = { booking: BellRing, promo: Tag, chat: MessageCircle, system: Info }[kind];
  return (
    <View style={[styles.kindIcon, { backgroundColor: bg }]}>
      <Icon size={20} color={fg} />
    </View>
  );
}

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const items = useNotificationStore((s) => s.items);
  const ensureSeeded = useNotificationStore((s) => s.ensureSeeded);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => goBack('/(tabs)')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <Pressable onPress={markAllRead} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mark all read">
          <CheckCheck size={22} color={colors.primary} />
        </Pressable>
      </View>
      {items.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="Booking updates, promos and messages will land here."
          icon={<BellRing size={48} color={colors.primary} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                markRead(n.id);
                if (n.route) router.push(n.route as never);
              }}
              style={[
                styles.row,
                {
                  backgroundColor: n.read ? colors.surface : colors.surfaceCard,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <KindIcon kind={n.kind} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {n.body}
                </Text>
                <Text style={[styles.rowTime, { color: colors.textMuted }]}>{timeAgo(n.createdAt)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: { fontSize: 20, fontFamily: fonts.display, flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  kindIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowTitle: { fontSize: 14, fontFamily: fonts.semiBold, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { fontSize: 13, fontFamily: fonts.regular, marginTop: 2, lineHeight: 18 },
  rowTime: { fontSize: 11, fontFamily: fonts.regular, marginTop: 4 },
});
