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
  MapPin,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Star,
} from '@/components/ui/icons';
import { useAppTheme } from '../_layout';
import { spacing, radii, shadows, fonts } from '../../constants/theme';
import { serviceImageSource } from '../../constants/images';
import { useBookings } from '../../services/queryClient';
import { Booking, JobStatus } from '../../types';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { formatKoboToNaira } from '../../utils/currency';
import { formatDateWAT, formatTimeWAT } from '../../utils/date';

type TabKey = 'upcoming' | 'completed' | 'cancelled';

export default function BookingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data: allBookings = [],
    isLoading,
  } = useBookings();

  const groupBookings = (list: Booking[]) => {
    if (activeTab === 'upcoming') {
      return list.filter((b) =>
        ['CONFIRMED', 'MATCHING', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'REQUESTED', 'PAYMENT_PENDING'].includes(b.status)
      );
    }
    if (activeTab === 'completed') {
      return list.filter((b) => ['COMPLETED', 'CUSTOMER_CONFIRMATION', 'SETTLEMENT', 'WARRANTY_ACTIVE', 'CLOSED'].includes(b.status));
    }
    return list.filter((b) => b.status === 'CANCELLED');
  };

  const bookings = useMemo(() => groupBookings(allBookings), [allBookings, activeTab]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.service?.name.toLowerCase().includes(q) ||
        b.provider?.name.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const getStatusBadgeConfig = (status: JobStatus): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'CONFIRMED':
        return { label: 'Upcoming', variant: 'info' };
      case 'MATCHING':
        return { label: 'Upcoming', variant: 'warning' };
      case 'PROVIDER_ASSIGNED':
      case 'PROVIDER_ACCEPTED':
        return { label: 'Upcoming', variant: 'info' };
      case 'EN_ROUTE':
        return { label: 'Upcoming', variant: 'warning' };
      case 'ARRIVED':
        return { label: 'Upcoming', variant: 'warning' };
      case 'IN_PROGRESS':
        return { label: 'Upcoming', variant: 'warning' };
      case 'COMPLETED':
      case 'CUSTOMER_CONFIRMATION':
      case 'SETTLEMENT':
        return { label: 'Completed', variant: 'success' };
      case 'WARRANTY_ACTIVE':
        return { label: 'Completed', variant: 'success' };
      case 'CANCELLED':
        return { label: 'Cancelled', variant: 'error' };
      default:
        return { label: status.replace('_', ' '), variant: 'neutral' };
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderBookingCard = (booking: Booking) => {
    const badgeConfig = getStatusBadgeConfig(booking.status);
    const isExpanded = expandedId === booking.id;
    const scheduledDateStr = formatDateWAT(booking.scheduledAt);
    const scheduledTimeStr = booking.arrivalWindow?.slotLabel || formatTimeWAT(booking.scheduledAt);
    const addressStr = booking.address
      ? `${booking.address.street}, ${booking.address.estate || booking.address.landmark || ''}`
      : 'New Avenue Park, New York';

    return (
      <View
        key={booking.id}
        style={[
          styles.cardContainer,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.cardTop}>
          <Pressable
            onPress={() => router.push(`/tracking/${booking.id}`)}
            style={styles.cardTopLeft}
          >
            <Image
              source={serviceImageSource(booking.service?.imageUrl)}
              style={styles.serviceThumb}
            />
          </Pressable>
          <View style={styles.cardTopMid}>
            <Text style={[styles.serviceTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {booking.service?.name || 'Service'}
            </Text>
            <Text style={[styles.providerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {booking.provider?.name || 'Provider'}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label={badgeConfig.label} variant={badgeConfig.variant} size="sm" />
              <Text style={[styles.priceInline, { color: colors.textSecondary }]}>
                {formatKoboToNaira(booking.totalKobo)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push(`/chat/${booking.id}`)}
            style={[styles.chatCircle, { backgroundColor: colors.primaryLight }]}
            accessibilityRole="button"
            accessibilityLabel="Message technician"
          >
            <MessageCircle size={20} color={colors.primary} fill={colors.primary} />
          </Pressable>
        </View>

        {isExpanded && (
          <View style={styles.expandedWrap}>
            <View style={[styles.expandedDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date & Time</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {scheduledDateStr} | {scheduledTimeStr}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {addressStr}
              </Text>
            </View>

            <View style={[styles.mapPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <View style={styles.mapGrid} />
              <View style={[styles.mapPin, { backgroundColor: colors.primary }]}>
                <MapPin size={20} color="#FFFFFF" />
              </View>
            </View>

            {activeTab === 'upcoming' && (
              <View style={styles.expandedActions}>
                <Pressable
                  style={[styles.outlineBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push(`/booking/cancel/${booking.id}`)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                    Cancel Booking
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filledBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/tracking/${booking.id}`)}
                >
                  <Text style={styles.filledBtnText}>View E-Receipt</Text>
                </Pressable>
              </View>
            )}

            {activeTab === 'completed' && (
              <View style={styles.expandedActions}>
                <Pressable
                  style={[styles.outlineBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push(`/review/${booking.id}`)}
                >
                  <Star size={14} color={colors.primary} />
                  <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                    Rate & Review
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filledBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/tracking/${booking.id}`)}
                >
                  <Text style={styles.filledBtnText}>View E-Receipt</Text>
                </Pressable>
              </View>
            )}

            {activeTab === 'cancelled' && (
              <View style={styles.expandedActions}>
                <Pressable
                  style={[styles.outlineBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push(`/tracking/${booking.id}`)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                    View Details
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filledBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/search')}
                >
                  <Text style={styles.filledBtnText}>Re-book</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={[styles.expandDivider, { backgroundColor: colors.borderSubtle }]} />
        <Pressable
          onPress={() => toggleExpand(booking.id)}
          style={styles.expandBtn}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Collapse booking' : 'Expand booking'}
        >
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textPrimary} />
          ) : (
            <ChevronDown size={20} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>
    );
  };

  const getEmptyStateDetails = () => {
    switch (activeTab) {
      case 'upcoming':
        return {
          title: 'No Upcoming Bookings',
          description:
            'You do not have any active service requests right now. Explore our verified home service specialists.',
          actionTitle: 'Book a Service',
        };
      case 'completed':
        return {
          title: 'No Completed Jobs Yet',
          description:
            'When your maintenance, cleaning, or repairs are finished, details and warranty receipts appear here.',
          actionTitle: 'Explore Services',
        };
      case 'cancelled':
        return {
          title: 'No Cancelled Bookings',
          description: 'You have not cancelled any bookings. All your records are clear.',
          actionTitle: 'Go Home',
        };
    }
  };

  const emptyConfig = getEmptyStateDetails();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>My Bookings</Text>
          <View style={styles.titleIcons}>
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Search bookings"
              hitSlop={8}
            >
              <Search size={22} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Filter bookings"
              hitSlop={8}
            >
              <SlidersHorizontal size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle }]}>
          {(['upcoming', 'completed', 'cancelled'] as TabKey[]).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setExpandedId(null);
                }}
                style={styles.tabButton}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isActive ? colors.primary : colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
                {isActive && (
                  <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.inputFill }]}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by ID or service..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton width="100%" height={140} borderRadius={radii.xl} style={styles.skeleton} />
            <LoadingSkeleton width="100%" height={140} borderRadius={radii.xl} style={styles.skeleton} />
            <LoadingSkeleton width="100%" height={140} borderRadius={radii.xl} />
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map(renderBookingCard)
        ) : (
          <EmptyState
            title={emptyConfig.title}
            description={emptyConfig.description}
            actionTitle={emptyConfig.actionTitle}
            onActionPress={() => router.push('/search')}
            style={styles.emptyContainer}
          />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: spacing.sm,
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  cardContainer: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTopLeft: {
    marginRight: spacing.md,
  },
  serviceThumb: {
    width: 84,
    height: 84,
    borderRadius: radii.lg,
  },
  cardTopMid: {
    flex: 1,
    gap: 4,
  },
  serviceTitle: {
    fontSize: 17,
    fontFamily: fonts.display,
  },
  providerName: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  priceInline: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  chatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  expandedWrap: {
    marginTop: spacing.sm,
  },
  expandedDivider: {
    height: 1,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
    textAlign: 'right',
  },
  mapPlaceholder: {
    height: 150,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.25,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  mapPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1.5,
    gap: 6,
  },
  outlineBtnText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  filledBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.full,
  },
  filledBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  expandDivider: {
    height: 1,
    marginTop: spacing.md,
  },
  expandBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    marginTop: spacing.xl,
  },
});
