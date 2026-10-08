import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ChevronRight, Minus, Plus, Info, ChevronLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../_layout';
import { radii, spacing, fonts, shadows } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { useCartStore } from '../../stores/cartStore';
import { formatDateWAT } from '../../utils/date';
import { useService, useServices } from '../../services/queryClient';

interface TimeSlotOption {
  id: string;
  period: 'Morning' | 'Afternoon' | 'Evening';
  time: string;
  available: boolean;
  tag?: string;
}

const TIME_SLOTS: TimeSlotOption[] = [
  { id: 'm1', period: 'Morning', time: '08:00 AM - 10:00 AM', available: true },
  { id: 'm2', period: 'Morning', time: '10:00 AM - 12:00 PM', available: true, tag: 'Popular' },
  { id: 'a1', period: 'Afternoon', time: '12:00 PM - 02:00 PM', available: true },
  { id: 'a2', period: 'Afternoon', time: '02:00 PM - 04:00 PM', available: true },
  { id: 'a3', period: 'Afternoon', time: '04:00 PM - 06:00 PM', available: true },
  { id: 'e1', period: 'Evening', time: '06:00 PM - 08:00 PM', available: true },
];

const FREQUENCIES = [
  { id: 'ONCE', label: 'One-off', discount: 0, desc: 'Standard single visit' },
  { id: 'WEEKLY', label: 'Weekly', discount: 10, desc: 'Save 10% each visit' },
  { id: 'BIWEEKLY', label: 'Bi-weekly', discount: 5, desc: 'Save 5% every 2 weeks' },
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookingScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const { colors } = useAppTheme();
  const { currentAddress } = useLocationStore();
  const { items: cartItems, addItem } = useCartStore();
  const { data: liveService } = useService(params.serviceId || '');
  const { data: liveServices = [] } = useServices();

  React.useEffect(() => {
    if (cartItems.length === 0) {
      const targetService =
        liveService ?? liveServices.find((s) => s.id === params.serviceId) ?? liveServices[0];
      if (targetService) addItem(targetService, []);
    }
  }, [params.serviceId, cartItems.length, addItem, liveService, liveServices]);

  const today = useMemo(() => new Date(), []);
  const [visibleYear, setVisibleYear] = useState(today.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(today));
  const [selectedSlotId, setSelectedSlotId] = useState<string>('m2');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ONCE');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<number>(2);

  const selectedSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId);

  // Real current-month grid (Mon-Sun), selectable -> ISO date
  const monthCells = useMemo(() => {
    const first = new Date(visibleYear, visibleMonth, 1);
    // Convert Sun=0..Sat=6 to Mon=0..Sun=6 offset
    const leadBlanks = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < leadBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: toISODate(new Date(visibleYear, visibleMonth, d)), day: d });
    }
    return cells;
  }, [visibleYear, visibleMonth]);

  const monthTitle = useMemo(() => {
    return new Date(visibleYear, visibleMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [visibleYear, visibleMonth]);

  const shiftMonth = (delta: number) => {
    const base = new Date(visibleYear, visibleMonth + delta, 1);
    setVisibleYear(base.getFullYear());
    setVisibleMonth(base.getMonth());
  };

  const handleContinue = () => {
    router.push({
      pathname: '/booking/cart',
      params: {
        scheduledDate: selectedDate,
        timeSlot: selectedSlot?.time || '10:00 AM - 12:00 PM',
        frequency: selectedFrequency,
        instructions: specialInstructions,
      },
    });
  };

  const startTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Booking Details</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => router.push('/booking/address')}
        >
          <MapPin size={20} color={colors.primary} />
          <View style={styles.addressMeta}>
            <Text style={[styles.addressLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
              {currentAddress
                ? `${currentAddress.houseNumber ? currentAddress.houseNumber + ', ' : ''}${currentAddress.street}`
                : 'Add a service address'}
            </Text>
            <Text style={[styles.addressSub, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
              {formatDateWAT(selectedDate)} • {selectedSlot?.time || '10:00 AM - 12:00 PM'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Select Date</Text>
        {/* Mockup 56: lavender month-grid card */}
        <View style={[styles.calendarCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.calendarHeader}>
            <Text style={[styles.calendarMonth, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {monthTitle}
            </Text>
            <View style={styles.calendarNavRow}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
                <ChevronLeft size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={8} accessibilityLabel="Next month">
                <ChevronRight size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekLabel, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.monthGrid}>
            {monthCells.map((cell, idx) => {
              if (!cell) return <View key={`blank-${idx}`} style={styles.dayCell} />;
              const isSelected = selectedDate === cell.iso;
              return (
                <Pressable
                  key={cell.iso}
                  onPress={() => setSelectedDate(cell.iso)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 999 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary, fontFamily: isSelected ? fonts.extraBold : fonts.regular },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.hoursCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View>
            <Text style={[styles.hoursTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Working Hours</Text>
            <Text style={[styles.hoursSub, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Cost increase after 2 hrs of work.
            </Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => setWorkingHours(Math.max(1, workingHours - 1))}
            >
              <Minus size={16} color={colors.primary} />
            </Pressable>
            <Text style={[styles.stepCount, { color: colors.textPrimary, fontFamily: fonts.extraBold }]}>{workingHours}</Text>
            <Pressable
              style={[styles.stepBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => setWorkingHours(Math.min(8, workingHours + 1))}
            >
              <Plus size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Choose Start Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
          {startTimes.map((t) => {
            const isSelected = selectedSlot?.time.startsWith(t.split(' ')[0]);
            return (
              <Pressable
                key={t}
                onPress={() => {
                  const match = TIME_SLOTS.find((s) => s.time.startsWith(t.split(' ')[0]));
                  if (match) setSelectedSlotId(match.id);
                }}
                style={[
                  styles.timePill,
                  isSelected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.timePillText, { color: isSelected ? '#FFFFFF' : colors.primary, fontFamily: fonts.bold }]}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.slotList}>
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <Pressable
                key={slot.id}
                onPress={() => setSelectedSlotId(slot.id)}
                style={[
                  styles.slotCard,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.slotTime, { color: isSelected ? colors.primary : colors.textPrimary, fontFamily: fonts.bold }]}>
                  {slot.time}
                </Text>
                <Text style={[styles.slotPeriod, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                  {slot.period}{slot.tag ? ` • ${slot.tag}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Service Frequency</Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((freq) => {
            const isSelected = selectedFrequency === freq.id;
            return (
              <Pressable
                key={freq.id}
                onPress={() => setSelectedFrequency(freq.id)}
                style={[
                  styles.freqCard,
                  isSelected
                    ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.freqLabel, { color: isSelected ? colors.primary : colors.textPrimary, fontFamily: fonts.bold }]}>
                  {freq.label}
                </Text>
                <Text style={[styles.freqDesc, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{freq.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Special Instructions</Text>
        <Input
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Gate code, parking, pets, areas to prioritise..."
          multiline
          numberOfLines={3}
        />

        <View style={[styles.noticeBox, { backgroundColor: colors.surfaceCard }]}>
          <Info size={16} color={colors.textSecondary} />
          <Text style={[styles.noticeText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Free rescheduling or cancellation up to 2 hours prior to scheduled window.
          </Text>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Button title={`Continue • ${formatDateWAT(selectedDate)}`} onPress={handleContinue} size="lg" variant="primary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addressMeta: { flex: 1 },
  addressLabel: { fontSize: 14 },
  addressSub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 17, marginTop: spacing.md, marginBottom: spacing.sm },
  calendarCard: { borderRadius: 20, padding: spacing.md, marginBottom: spacing.sm },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  calendarMonth: { fontSize: 16 },
  calendarNavRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14 },
  hoursCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  hoursTitle: { fontSize: 15 },
  hoursSub: { fontSize: 12, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontSize: 18, minWidth: 20, textAlign: 'center' },
  timeRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  timePill: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radii.full, borderWidth: 1.5 },
  timePillText: { fontSize: 13 },
  slotList: { gap: spacing.sm, marginTop: spacing.sm },
  slotCard: { padding: spacing.md, borderRadius: 20, borderWidth: 1.5 },
  slotTime: { fontSize: 14 },
  slotPeriod: { fontSize: 12, marginTop: 2 },
  freqRow: { flexDirection: 'row', gap: spacing.sm },
  freqCard: { flex: 1, padding: spacing.sm, borderRadius: 20, borderWidth: 1.5 },
  freqLabel: { fontSize: 13 },
  freqDesc: { fontSize: 10, marginTop: 2, lineHeight: 13 },
  noticeBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: 20, marginTop: spacing.md },
  noticeText: { fontSize: 12, flex: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    ...shadows.lg,
  },
});
