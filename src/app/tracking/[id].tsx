import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Navigation,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Star,
  Shield,
  Car,
  RotateCcw,
} from 'lucide-react-native';
import { useBooking } from '../../services/queryClient';
import { Booking, JobStatus } from '../../types';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Header } from '../../components/ui/Header';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { lightColors as colors, spacing, typography, radii } from '../../constants/theme';
import { avatarSource } from '../../constants/images';
import { formatKoboToNaira } from '../../utils/currency';
import { formatDateWAT, formatTimeWAT, formatDateTimeWAT } from '../../utils/date';

interface LifecycleMilestone {
  key: string;
  title: string;
  subtitle: string;
  statuses: JobStatus[];
}

const LIFECYCLE_MILESTONES: LifecycleMilestone[] = [
  {
    key: 'requested_confirmed',
    title: 'Booking Confirmed',
    subtitle: 'Payment verified and service order logged',
    statuses: ['REQUESTED', 'PAYMENT_PENDING', 'CONFIRMED'],
  },
  {
    key: 'matching_assigned',
    title: 'Provider Assigned',
    subtitle: 'Verified specialist accepted your job',
    statuses: ['MATCHING', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED'],
  },
  {
    key: 'en_route',
    title: 'Technician En Route',
    subtitle: 'Specialist is travelling with tools and gear',
    statuses: ['EN_ROUTE'],
  },
  {
    key: 'arrived',
    title: 'Technician Arrived',
    subtitle: 'Security check-in at estate gate/premises',
    statuses: ['ARRIVED', 'CHECK_IN'],
  },
  {
    key: 'in_progress',
    title: 'Service In Progress',
    subtitle: 'Diagnosis, maintenance & checklist underway',
    statuses: ['INSPECTION', 'IN_PROGRESS', 'AWAITING_APPROVAL'],
  },
  {
    key: 'completed',
    title: 'Completed & 14-Day Warranty',
    subtitle: 'Quality sign-off and warranty protection active',
    statuses: ['COMPLETED', 'CUSTOMER_CONFIRMATION', 'SETTLEMENT', 'WARRANTY_ACTIVE', 'CLOSED'],
  },
];

export default function TrackingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: booking,
    isLoading,
    refetch,
    isRefetching,
  } = useBooking(typeof id === 'string' ? id : '');

  if (isLoading || !booking) {
    return (
      <View style={styles.screen}>
        <Header title="Tracking Job" onBack={() => router.back()} />
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton width="100%" height={120} borderRadius={radii.lg} style={styles.skeleton} />
          <LoadingSkeleton width="100%" height={180} borderRadius={radii.lg} style={styles.skeleton} />
          <LoadingSkeleton width="100%" height={240} borderRadius={radii.lg} />
        </View>
      </View>
    );
  }

  const getStatusBadgeConfig = (status: JobStatus): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'CONFIRMED':
        return { label: 'Confirmed', variant: 'info' };
      case 'EN_ROUTE':
        return { label: 'En Route', variant: 'warning' };
      case 'ARRIVED':
        return { label: 'Arrived', variant: 'warning' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', variant: 'warning' };
      case 'COMPLETED':
      case 'WARRANTY_ACTIVE':
        return { label: 'Completed', variant: 'success' };
      case 'CANCELLED':
        return { label: 'Cancelled', variant: 'error' };
      default:
        return { label: status.replace('_', ' '), variant: 'neutral' };
    }
  };

  const badgeConfig = getStatusBadgeConfig(booking.status);

  // Determine stage progression
  const currentStatusIndex = (() => {
    for (let i = LIFECYCLE_MILESTONES.length - 1; i >= 0; i--) {
      if (LIFECYCLE_MILESTONES[i].statuses.includes(booking.status)) {
        return i;
      }
    }
    return 0;
  })();

  const isCompleted = ['COMPLETED', 'CUSTOMER_CONFIRMATION', 'SETTLEMENT', 'WARRANTY_ACTIVE', 'CLOSED'].includes(booking.status);
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <View style={styles.screen}>
      <Header
        title={`Track #${booking.bookingNumber}`}
        subtitle={booking.service?.name || 'Home Service'}
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={() => router.push(`/chat/${booking.id}`)}
            style={styles.headerChatButton}
          >
            <MessageSquare size={20} color={colors.primary} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Status Highlight Banner */}
        <Card variant="flat" padding="md" style={styles.statusHighlightCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Current Lifecycle Status</Text>
              <Text style={styles.statusHeading}>{badgeConfig.label}</Text>
            </View>
            <Badge label={badgeConfig.label} variant={badgeConfig.variant} size="md" />
          </View>
          <Text style={styles.statusDesc}>
            {booking.timeline.length > 0
              ? booking.timeline[booking.timeline.length - 1].description || 'Service lifecycle is active.'
              : 'Service lifecycle is active.'}
          </Text>
        </Card>

        {/* Live GPS Map Teaser Card (Active jobs) */}
        {!isCancelled && (
          <Card
            variant="elevated"
            padding="md"
            style={styles.mapTeaserCard}
            onPress={() => router.push(`/tracking/map/${booking.id}`)}
          >
            <View style={styles.mapTeaserHeader}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.mapTeaserTitle}>Live GPS Provider Tracking</Text>
            </View>
            <Text style={styles.mapTeaserEta}>
              {isCompleted ? 'Job successfully fulfilled on location' : 'Estimated arrival: ~14 mins (2.1 km away)'}
            </Text>
            <Button
              title="Open Interactive Map"
              size="sm"
              variant="primary"
              icon={<Navigation size={15} color="#FFFFFF" />}
              onPress={() => router.push(`/tracking/map/${booking.id}`)}
              style={styles.openMapButton}
            />
          </Card>
        )}

        {/* Assigned Technician Profile Card */}
        {booking.provider ? (
          <Card variant="elevated" padding="md" style={styles.providerCard}>
            <View style={styles.providerHeaderRow}>
              <Image source={avatarSource(booking.provider.avatarUrl)} style={styles.providerAvatar} />
              <View style={styles.providerMeta}>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName}>{booking.provider.name}</Text>
                  <Badge label="Verified Pro" variant="success" size="sm" />
                </View>
                <View style={styles.providerRatingRow}>
                  <Star size={13} color="#FF9800" fill="#FF9800" />
                  <Text style={styles.providerRatingText}>
                    {booking.provider.rating.toFixed(1)} ({booking.provider.reviewCount} jobs)
                  </Text>
                </View>
                <View style={styles.vehicleRow}>
                  <Car size={13} color={colors.textSecondary} />
                  <Text style={styles.vehicleText}>Service Van • LSR-482-AB</Text>
                </View>
              </View>
            </View>

            <View style={styles.providerContactBar}>
              <Button
                title="Call Pro"
                variant="outline"
                size="sm"
                fullWidth={false}
                icon={<Phone size={15} color={colors.primary} />}
                style={styles.contactBtn}
                onPress={() => router.push(`/chat/call/${booking.id}`)}
              />
              <Button
                title="Message"
                variant="primary"
                size="sm"
                fullWidth={false}
                icon={<MessageSquare size={15} color="#FFFFFF" />}
                style={styles.contactBtn}
                onPress={() => router.push(`/chat/${booking.id}`)}
              />
            </View>
          </Card>
        ) : (
          <Card variant="flat" padding="md" style={styles.providerCard}>
            <Text style={styles.matchingText}>
              Matching verified technician in your neighborhood...
            </Text>
          </Card>
        )}

        {/* 19-Stage Lifecycle Timeline */}
        <Card variant="elevated" padding="md" style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Service Lifecycle Timeline</Text>
          <View style={styles.timelineList}>
            {LIFECYCLE_MILESTONES.map((milestone, idx) => {
              const isPast = idx < currentStatusIndex || isCompleted;
              const isCurrent = idx === currentStatusIndex && !isCompleted && !isCancelled;
              const isLast = idx === LIFECYCLE_MILESTONES.length - 1;

              return (
                <View key={milestone.key} style={styles.timelineStep}>
                  <View style={styles.timelineLeftColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        isPast && styles.timelineDotPast,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isPast ? (
                        <CheckCircle2 size={16} color="#FFFFFF" />
                      ) : isCurrent ? (
                        <View style={styles.currentInnerCircle} />
                      ) : (
                        <Circle size={10} color={colors.textMuted} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineConnector,
                          isPast && styles.timelineConnectorActive,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineRightColumn}>
                    <Text
                      style={[
                        styles.milestoneTitle,
                        (isPast || isCurrent) && styles.milestoneTitleActive,
                      ]}
                    >
                      {milestone.title}
                    </Text>
                    <Text style={styles.milestoneSubtitle}>{milestone.subtitle}</Text>
                    {isCurrent && (
                      <Badge
                        label="Active Step"
                        variant="warning"
                        size="sm"
                        style={styles.activeStepBadge}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Service & Property Details */}
        <Card variant="elevated" padding="md" style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.summaryRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {formatDateWAT(booking.scheduledAt)} •{' '}
              {booking.arrivalWindow?.slotLabel || formatTimeWAT(booking.scheduledAt)}
            </Text>
          </View>

          {booking.address && (
            <View style={styles.summaryRow}>
              <MapPin size={16} color={colors.textSecondary} />
              <View style={styles.addressBlock}>
                <Text style={styles.summaryText}>
                  {booking.address.houseNumber} {booking.address.street}
                </Text>
                <Text style={styles.addressSub}>
                  {booking.address.estate ? `${booking.address.estate}, ` : ''}
                  Landmark: {booking.address.landmark}
                </Text>
                {booking.address.gateInstructions && (
                  <Text style={styles.gateInstructions}>
                    Gate Code: {booking.address.gateInstructions}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.pricingRow}>
            <Text style={styles.priceLabel}>Base Service & Add-ons</Text>
            <Text style={styles.priceValue}>{formatKoboToNaira(booking.priceKobo)}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.priceLabel}>Statutory VAT (7.5%)</Text>
            <Text style={styles.priceValue}>{formatKoboToNaira(booking.vatKobo)}</Text>
          </View>
          <View style={[styles.pricingRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatKoboToNaira(booking.totalKobo)}</Text>
          </View>
        </Card>

        {/* Contextual Action Bar */}
        <View style={styles.bottomActionsArea}>
          {isCompleted ? (
            <Button
              title="Leave Review & Rating"
              variant="primary"
              size="lg"
              icon={<Star size={18} color="#FFFFFF" />}
              onPress={() => router.push(`/review/${booking.id}`)}
              style={styles.fullWidthAction}
            />
          ) : !isCancelled ? (
            <View style={styles.activeActionsRow}>
              <Button
                title="Reschedule"
                variant="outline"
                size="md"
                style={styles.halfAction}
                onPress={() => router.push(`/booking/reschedule/${booking.id}`)}
              />
              <Button
                title="Cancel Booking"
                variant="danger"
                size="md"
                style={styles.halfAction}
                onPress={() => router.push(`/booking/cancel/${booking.id}`)}
              />
            </View>
          ) : (
            <Button
              title="Re-book this Service"
              variant="primary"
              size="lg"
              icon={<RotateCcw size={18} color="#FFFFFF" />}
              onPress={() => router.push('/')}
              style={styles.fullWidthAction}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  skeletonContainer: {
    padding: spacing.md,
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  statusHighlightCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusHeading: {
    ...typography.title,
    color: colors.textPrimary,
  },
  statusDesc: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mapTeaserCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  mapTeaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gpsPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.xs + 2,
  },
  mapTeaserTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  mapTeaserEta: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  openMapButton: {
    alignSelf: 'flex-start',
  },
  providerCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  providerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceCard,
    marginRight: spacing.md,
  },
  providerMeta: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  providerName: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  providerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  providerRatingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  providerContactBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  contactBtn: {
    flex: 1,
  },
  matchingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timelineCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelineList: {
    paddingLeft: spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotPast: {
    backgroundColor: colors.success,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  currentInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineConnectorActive: {
    backgroundColor: colors.success,
  },
  timelineRightColumn: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  milestoneTitle: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  milestoneTitleActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  milestoneSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  activeStepBadge: {
    marginTop: 6,
  },
  summaryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  addressBlock: {
    flex: 1,
  },
  addressSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gateInstructions: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm + 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  totalRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  totalLabel: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.title,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomActionsArea: {
    marginTop: spacing.sm,
  },
  fullWidthAction: {
    width: '100%',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfAction: {
    flex: 1,
  },
});
