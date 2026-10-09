import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MessageCircle,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, shadows, fonts } from '../../constants/theme';
import { serviceImageSource } from '../../constants/images';
import { useBookings } from '../../services/queryClient';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Booking, JobStatus } from '../../types';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function CalendarScreen() {
  const { colors } = useAppTheme();

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(9);
  const [selectedDayNumber, setSelectedDayNumber] = useState(6);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const { data: bookings = [], isLoading: isBookingsLoading } = useBookings(
    statusFilter === 'all' ? undefined : statusFilter,
  );

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  }, [currentYear, currentMonthIndex]);

  // Monday-first leading blanks so the grid lines up Mo..Su like the mockup.
  const leadingBlanks = useMemo(() => {
    const jsDay = new Date(currentYear, currentMonthIndex, 1).getDay();
    return (jsDay + 6) % 7;
  }, [currentYear, currentMonthIndex]);

  const appointmentDays = useMemo(() => new Set([6, 8, 12, 15, 20]), []);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
    setSelectedDayNumber(1);
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
    setSelectedDayNumber(1);
  };

  const getStatusBadge = (status: JobStatus): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'COMPLETED':
      case 'WARRANTY_ACTIVE':
      case 'SETTLEMENT':
      case 'CUSTOMER_CONFIRMATION':
        return { label: 'Completed', variant: 'success' };
      case 'CANCELLED':
        return { label: 'Cancelled', variant: 'error' };
      default:
        return { label: 'Upcoming', variant: 'info' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          My Calendar
        </Text>
        <MoreHorizontal size={22} color={colors.textPrimary} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Month grid card */}
        <View style={[styles.monthCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.monthHeaderRow}>
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {monthNames[currentMonthIndex]} {currentYear}
            </Text>
            <View style={styles.monthArrows}>
              <Pressable
                onPress={handlePrevMonth}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                hitSlop={8}
                style={styles.arrowBtn}
              >
                <ChevronLeft size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={handleNextMonth}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                hitSlop={8}
                style={styles.arrowBtn}
              >
                <ChevronRight size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={[styles.weekdayText, { color: colors.textPrimary }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <View key={`blank-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = day === selectedDayNumber;
              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedDayNumber(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day} ${monthNames[currentMonthIndex]}`}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {day}
                  </Text>
                  {!isSelected && appointmentDays.has(day) && (
                    <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Filter pills (preserve existing status filtering) */}
        <View style={styles.filterRow}>
          {(
            [
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'all', label: 'All' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.filterPill,
                  isActive
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter(tab.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 4. Service Booking list */}
        <View style={styles.bookingSection}>
          <View style={styles.bookingSectionHeader}>
            <Text style={[styles.bookingSectionTitle, { color: colors.textPrimary }]}>
              Service Booking ({bookings.length})
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/bookings')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>

          {isBookingsLoading ? (
            <View style={styles.loadingWrap}>
              <LoadingSkeleton width="100%" height={120} borderRadius={16} />
              <View style={{ height: 12 }} />
              <LoadingSkeleton width="100%" height={120} borderRadius={16} />
            </View>
          ) : bookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {bookings.map((booking: Booking) => {
                const badge = getStatusBadge(booking.status);
                // Real ids only — never guess: reschedule uses the booking id,
                // details uses the booking's own serviceId/service object.
                const rescheduleTarget = `/booking/reschedule/${booking.id}`;
                const detailsTarget = booking.serviceId
                  ? `/service/${booking.serviceId}`
                  : booking.service?.id
                    ? `/service/${booking.service.id}`
                    : `/tracking/${booking.id}`;
                return (
                  <View
                    key={booking.id}
                    style={[
                      styles.bookingCardWrap,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Pressable
                      style={styles.bookingCardMain}
                      onPress={() => router.push(`/tracking/${booking.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel="Open booking tracking"
                    >
                      <Image
                        source={serviceImageSource(booking.service?.imageUrl)}
                        style={styles.bookingThumb}
                      />
                      <View style={styles.bookingMid}>
                        <Text
                          style={[styles.bookingTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {booking.service?.name || 'Service'}
                        </Text>
                        <Text
                          style={[styles.bookingProvider, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {booking.provider?.name || 'Provider'}
                        </Text>
                        <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                          <Badge label={badge.label} variant={badge.variant} size="sm" />
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
                    </Pressable>
                    <View style={styles.bookingCardActions}>
                      <Pressable
                        onPress={() => router.push(rescheduleTarget)}
                        accessibilityRole="button"
                        accessibilityLabel="Reschedule booking"
                        hitSlop={8}
                      >
                        <Text style={[styles.cardActionText, { color: colors.primary }]}>
                          Reschedule
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => router.push(detailsTarget)}
                        accessibilityRole="button"
                        accessibilityLabel="View service details"
                        hitSlop={8}
                      >
                        <Text style={[styles.cardActionText, { color: colors.primary }]}>
                          Details
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceCard }]}>
                <CalendarIcon size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                You have no service booking
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                You don&apos;t have a service booking on this date
              </Text>
              <View style={styles.emptyButtonWrap}>
                <Button
                  title="Book a Service"
                  onPress={() => router.push('/search')}
                  variant="primary"
                />
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  monthCard: {
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: fonts.display,
  },
  monthArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arrowBtn: {
    padding: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  dayText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  bookingSection: {
    gap: spacing.md,
  },
  bookingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingSectionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  loadingWrap: {
    marginTop: spacing.sm,
  },
  bookingsList: {
    gap: spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  bookingCardWrap: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  bookingCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  cardActionText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  bookingThumb: {
    width: 84,
    height: 84,
    borderRadius: radii.lg,
    marginRight: spacing.md,
  },
  bookingMid: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
  },
  bookingProvider: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  chatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButtonWrap: {
    width: 200,
  },
});
