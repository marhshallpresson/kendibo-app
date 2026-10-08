import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';

const TIMES = [
  '08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00'
];

function nextDays(count: number): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    out.push({ id: iso, label: `${i === 1 ? 'Tomorrow' : weekday}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
  }
  return out;
}

export default function DateTimeScreen() {
  const router = useRouter();
  const setWindow = useOnDemandStore((s) => s.setWindow);

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const dates = React.useMemo(() => nextDays(5), []);

  const handleNext = () => {
    if (!date || !time) return;
    setWindow(date, time);
    router.push('/booking/on-demand/4-contact');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Select a date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
        {dates.map((d) => (
          <TouchableOpacity 
            key={d.id} 
            style={[styles.dateCard, date === d.id && styles.activeCard]}
            onPress={() => setDate(d.id)}
          >
            <Text style={[styles.dateText, date === d.id && styles.activeText]}>{d.label.split(',')[0]}</Text>
            <Text style={[styles.dateSub, date === d.id && styles.activeText]}>{d.label.split(',')[1]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Select a time</Text>
      <View style={styles.timeList}>
        {TIMES.map((t) => (
          <TouchableOpacity 
            key={t} 
            style={[styles.timeCard, time === t && styles.activeCard]}
            onPress={() => setTime(t)}
          >
            <Text style={[styles.timeText, time === t && styles.activeText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button 
        title="Next" 
        onPress={handleNext} 
        disabled={!date || !time}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 16 },
  dateList: { gap: 12, paddingBottom: 8 },
  dateCard: {
    padding: 16, borderWidth: 1, borderColor: theme.light.colors.border, borderRadius: 12,
    backgroundColor: theme.light.colors.surface, minWidth: 100, alignItems: 'center'
  },
  activeCard: { borderColor: theme.light.colors.primary, backgroundColor: `${theme.light.colors.primary}10` },
  dateText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary },
  dateSub: { fontSize: 13, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, marginTop: 4 },
  activeText: { color: theme.light.colors.primary },
  timeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  timeCard: {
    paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.light.colors.border,
    borderRadius: 8, backgroundColor: theme.light.colors.surface
  },
  timeText: { fontSize: 15, fontFamily: 'Inter-Medium', color: theme.light.colors.textPrimary },
  button: { marginTop: 40 }
});

