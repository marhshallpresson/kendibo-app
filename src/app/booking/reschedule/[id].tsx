import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Info, CalendarCheck, X } from 'lucide-react-native';
import { useBooking, useRescheduleBooking } from '../../../services/queryClient';
import { Booking } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useAppTheme } from '../../_layout';
import { spacing, fonts, radii, shadows } from '../../../constants/theme';
import { formatDateWAT, formatTimeWAT } from '../../../utils/date';

interface DateOption {
  dateString: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
}

const TIME_SLOTS = [
  { id: 'morning_early', label: 'Early Morning (08:00 AM - 10:00 AM)', start: '08:00', end: '10:00' },
  { id: 'morning_mid', label: 'Morning (10:00 AM - 12:00 PM)', start: '10:00', end: '12:00' },
  { id: 'afternoon_early', label: 'Early Afternoon (12:00 PM - 02:00 PM)', start: '12:00', end: '14:00' },
  { id: 'afternoon_mid', label: 'Afternoon (02:00 PM - 04:00 PM)', start: '14:00', end: '16:00' },
  { id: 'evening', label: 'Late Afternoon (04:00 PM - 06:00 PM)', start: '16:00', end: '18:00' },
];

export default function RescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const rescheduleBooking = useRescheduleBooking();

  const bookingId = typeof id === 'string' ? id : '';
  const { data: liveBooking } = useBooking(bookingId);
  const booking = liveBooking ?? {
    id: bookingId,
    bookingNumber: '',
    status: 'REQUESTED',
    scheduledAt: new Date().toISOString(),
  } as unknown as Booking;

  const upcomingDays: DateOption[] = React.useMemo(() => {
    const list: DateOption[] = [];
    const base = new Date();
    base.setDate(base.getDate() + 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayNumber = d.getDate().toString();
      const monthName = d.toLocaleDateString('en-GB', { month: 'short' });
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      list.push({ dateString: `${yyyy}-${mm}-${dd}`, dayName, dayNumber, monthName });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(upcomingDays[0]?.dateString || '');
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[1].id);
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const rescheduleMutation = {
    mutate: () => {
      const slotObj = TIME_SLOTS.find((s) => s.id === selectedSlot) || TIME_SLOTS[0];
      rescheduleBooking.mutate(
        { bookingId: booking.id, date: selectedDate, slot: slotObj.label },
        { onSuccess: () => setShowSuccessModal(true) },
      );
    },
    get isPending() {
      return rescheduleBooking.isPending;
    },
  };

  const chosenSlotObj = TIME_SLOTS.find((s) => s.id === selectedSlot) || TIME_SLOTS[0];
  const chosenDateObj = upcomingDays.find((d) => d.dateString === selectedDate) || upcomingDays[0];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Reschedule</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service snapshot (misc: Bookings - Detail Page) */}
        <View style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {booking.service?.imageUrl ? (
            <Image source={{ uri: booking.service.imageUrl }} style={styles.serviceThumb} />
          ) : (
            <View style={[styles.serviceThumb, { backgroundColor: colors.primaryLight }]} />
          )}
          <View style={styles.serviceMeta}>
            <Text style={[styles.serviceName, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
              {booking.service?.name || 'Home Service'}
            </Text>
            <Text style={[styles.serviceBullet, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              • {booking.service?.durationMinutes || 60} mins
            </Text>
            <Text style={[styles.serviceBullet, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
              • Order #{booking.bookingNumber}
            </Text>
          </View>
        </View>

        <View style={[styles.policyBanner, { backgroundColor: colors.primaryLight }]}>
          <Info size={18} color={colors.primary} style={styles.policyIcon} />
          <View style={styles.policyContent}>
            <Text style={[styles.policyTitle, { color: colors.primaryDark, fontFamily: fonts.bold }]}>Free Rescheduling Policy</Text>
            <Text style={[styles.policyText, { color: colors.primaryDark, fontFamily: fonts.regular }]}>
              Free reschedule at least 2 hours before the technician leaves the dispatch depot.
            </Text>
          </View>
        </View>

        {/* Misc "Select date and time" sheet language */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Select date and time</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
          Your service will take approx. {booking.service?.durationMinutes || 60} mins
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {upcomingDays.slice(0, 3).map((day) => {
            const isSelected = selectedDate === day.dateString;
            return (
              <Pressable
                key={day.dateString}
                onPress={() => setSelectedDate(day.dateString)}
                style={[
                  styles.dateCell,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.dayNameText, { color: colors.textMuted, fontFamily: fonts.semiBold }]}>{day.dayName}</Text>
                <Text style={[styles.dayNumberText, { color: colors.textPrimary, fontFamily: fonts.extraBold }]}>{day.dayNumber}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.timePillRow}>
          {TIME_SLOTS.slice(0, 3).map((slot) => {
            const isSelected = selectedSlot === slot.id;
            return (
              <Pressable
                key={slot.id}
                onPress={() => setSelectedSlot(slot.id)}
                style={[
                  styles.timePill,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.timePillText, { color: isSelected ? colors.primary : colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  {slot.start} {slot.start < '12:00' ? 'AM' : 'PM'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>All arrival windows</Text>
        <View style={styles.slotsList}>
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            return (
              <Pressable
                key={slot.id}
                onPress={() => setSelectedSlot(slot.id)}
                style={[
                  styles.slotOption,
                  isSelected
                    ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                    : { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.slotOptionLeft}>
                  <Clock size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.slotOptionLabel, { color: isSelected ? colors.primaryDark : colors.textPrimary, fontFamily: isSelected ? fonts.bold : fonts.regular }]}>
                    {slot.label}
                  </Text>
                </View>
                <View style={[styles.radioCircle, isSelected && { borderColor: colors.primary }]}>
                  {isSelected && <View style={[styles.radioInnerCircle, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Note for Technician (Optional)</Text>
        <TextInput
          placeholder="E.g., Please buzz flat 4B or arrive after 11:30 AM..."
          placeholderTextColor={colors.textMuted}
          value={rescheduleReason}
          onChangeText={setRescheduleReason}
          multiline
          numberOfLines={3}
          style={[styles.reasonInput, { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary, fontFamily: fonts.regular }]}
        />

        <View style={styles.actionButtonArea}>
          <Button
            title="Proceed to checkout"
            variant="primary"
            size="lg"
            loading={rescheduleMutation.isPending}
            onPress={() => rescheduleMutation.mutate()}
          />
        </View>
        <View style={styles.currentSlotRow}>
          <Calendar size={14} color={colors.textMuted} />
          <Text style={[styles.currentSlotText, { color: colors.textMuted, fontFamily: fonts.regular }]}>
            Currently: {formatDateWAT(booking.scheduledAt)} • {booking.arrivalWindow?.slotLabel || formatTimeWAT(booking.scheduledAt)}
          </Text>
        </View>
      </ScrollView>

      {/* Misc "Booking Rescheduled" success sheet */}
      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace(`/tracking/${booking.id}`);
        }}
        type="center"
      >
        <View style={styles.modalBody}>
          <Pressable
            style={styles.modalClose}
            onPress={() => {
              setShowSuccessModal(false);
              router.replace(`/tracking/${booking.id}`);
            }}
            accessibilityLabel="Close"
          >
            <X size={18} color={colors.textMuted} />
          </Pressable>
          <View style={[styles.successIconWrapper, { backgroundColor: colors.primary }]}>
            <CalendarCheck size={44} color="#FFFFFF" />
          </View>
          <Text style={[styles.modalTitle, { color: colors.primary, fontFamily: fonts.extraBold }]}>Booking Rescheduled!</Text>
          <Text style={[styles.modalMessage, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Your service for #{booking.bookingNumber} has been updated to {chosenDateObj?.dayNumber} {chosenDateObj?.monthName} at {chosenSlotObj.start}.
          </Text>
          <View style={[styles.newSlotCard, { backgroundColor: colors.surfaceCard }]}>
            <View style={styles.newSlotRow}>
              <Calendar size={18} color={colors.primary} />
              <Text style={[styles.newSlotDate, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
                {chosenDateObj?.dayName}, {chosenDateObj?.dayNumber} {chosenDateObj?.monthName}
              </Text>
            </View>
            <View style={styles.newSlotRow}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.newSlotTime, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{chosenSlotObj.label}</Text>
            </View>
          </View>
          <Button
            title="View Booking"
            variant="primary"
            size="md"
            onPress={() => {
              setShowSuccessModal(false);
              router.replace(`/tracking/${booking.id}`);
            }}
            style={styles.modalCloseButton}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  serviceCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  serviceThumb: { width: 84, height: 84, borderRadius: 16 },
  serviceMeta: { flex: 1, justifyContent: 'center' },
  serviceName: { fontSize: 16 },
  serviceBullet: { fontSize: 13, marginTop: 3 },
  policyBanner: { flexDirection: 'row', padding: spacing.md, borderRadius: 20, marginBottom: spacing.md },
  policyIcon: { marginRight: spacing.sm, marginTop: 2 },
  policyContent: { flex: 1 },
  policyTitle: { fontSize: 13, marginBottom: 2 },
  policyText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 17, marginTop: spacing.sm },
  sectionSub: { fontSize: 13, marginTop: 4, marginBottom: spacing.sm },
  dateRow: { gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  dateCell: { width: 104, height: 84, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayNameText: { fontSize: 14, textTransform: 'uppercase' },
  dayNumberText: { fontSize: 22, marginTop: 2 },
  timePillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  timePill: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  timePillText: { fontSize: 13 },
  slotsList: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  slotOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  slotOptionLabel: { fontSize: 13, flex: 1 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C4C9D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerCircle: { width: 10, height: 10, borderRadius: 5 },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButtonArea: { marginTop: spacing.sm },
  currentSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  currentSlotText: { fontSize: 12 },
  modalBody: { alignItems: 'center', padding: spacing.md },
  modalClose: { alignSelf: 'flex-end', padding: 4 },
  successIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  modalTitle: { fontSize: 20, textAlign: 'center', marginBottom: spacing.xs },
  modalMessage: { fontSize: 14, textAlign: 'center', marginBottom: spacing.md },
  newSlotCard: { width: '100%', borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, gap: 8 },
  newSlotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newSlotDate: { fontSize: 14 },
  newSlotTime: { fontSize: 13 },
  modalCloseButton: { width: '100%' },
});
