import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore, OnDemandUrgency } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { MapPin, Clock, AlertTriangle, CalendarDays, Plus } from 'lucide-react-native';
import { useAddresses } from '../../../services/queryClient';

const URGENCY_OPTIONS: { id: OnDemandUrgency; title: string; desc: string }[] = [
  { id: 'this_week', title: 'This week', desc: 'Flexible — anytime in the next few days' },
  { id: 'today', title: 'Today', desc: 'Need it done before the day ends' },
  { id: 'emergency', title: 'Emergency (ASAP)', desc: 'Find the nearest available pro immediately' },
];

export default function UrgencyAddressScreen() {
  const router = useRouter();
  const urgency = useOnDemandStore((s) => s.urgency);
  const setUrgency = useOnDemandStore((s) => s.setUrgency);
  const setAddress = useOnDemandStore((s) => s.setAddress);
  const storeAddressId = useOnDemandStore((s) => s.addressId);

  const [addressId, setAddressId] = useState<string | null>(storeAddressId);

  const { data: addresses = [] } = useAddresses();

  const handleNext = () => {
    if (!addressId) return;
    setAddress(addressId);
    if (urgency === 'emergency') {
      router.push('/booking/on-demand/4-contact');
    } else {
      router.push('/booking/on-demand/3-date-time');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>How urgently do you need this?</Text>

      <View style={styles.urgencyOptions}>
        {URGENCY_OPTIONS.map((opt) => {
          const active = urgency === opt.id;
          const Icon = opt.id === 'emergency' ? AlertTriangle : opt.id === 'today' ? Clock : CalendarDays;
          const activeColor = opt.id === 'emergency' ? theme.light.colors.error : theme.light.colors.primary;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.card, active && { borderColor: activeColor, backgroundColor: `${activeColor}08` }]}
              onPress={() => setUrgency(opt.id)}
            >
              <Icon size={24} color={active ? activeColor : theme.light.colors.textMuted} />
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, active && { color: activeColor }]}>{opt.title}</Text>
                <Text style={styles.cardDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Where do you need the service?</Text>
      {addresses.length === 0 ? (
        <TouchableOpacity style={styles.card} onPress={() => router.push('/booking/add-location')}>
          <Plus size={22} color={theme.light.colors.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.light.colors.primary }]}>Add a service address</Text>
            <Text style={styles.cardDesc}>You need an address before a pro can come</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.addressList}>
          {addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[styles.card, addressId === addr.id && { borderColor: theme.light.colors.primary, backgroundColor: `${theme.light.colors.primary}08` }]}
              onPress={() => setAddressId(addr.id)}
            >
              <MapPin size={20} color={addressId === addr.id ? theme.light.colors.primary : theme.light.colors.textMuted} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{addr.label || 'Home'}</Text>
                <Text style={styles.cardDesc}>{addr.street}{addr.city ? `, ${addr.city}` : ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.card} onPress={() => router.push('/booking/add-location')}>
            <Plus size={20} color={theme.light.colors.primary} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.light.colors.primary }]}>Add another address</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Button
        title="Next"
        onPress={handleNext}
        disabled={!addressId}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 16 },
  urgencyOptions: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: theme.light.colors.border, borderRadius: 12,
    backgroundColor: theme.light.colors.surface, gap: 16
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted },
  addressList: { gap: 12, marginBottom: 40 },
  button: { marginTop: 24 }
});
