import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { MapPin, Clock, AlertTriangle } from 'lucide-react-native';
import { useAddresses } from '../../../services/queryClient';

export default function UrgencyAddressScreen() {
  const router = useRouter();
  const setUrgencyAndAddress = useOnDemandStore((s) => s.setUrgencyAndAddress);
  
  const [urgency, setUrgency] = useState<'standard' | 'asap'>('standard');
  const [addressId, setAddressId] = useState<string | null>(null);

  const { data: addresses } = useAddresses();

  const handleNext = () => {
    if (!addressId) return;
    setUrgencyAndAddress(urgency, addressId);
    if (urgency === 'asap') {
      // Skip scheduling for ASAP
      router.push('/booking/on-demand/4-contact');
    } else {
      router.push('/booking/on-demand/3-date-time');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>How urgently do you need this?</Text>
      
      <View style={styles.urgencyOptions}>
        <TouchableOpacity 
          style={[styles.card, urgency === 'standard' && styles.cardActive]}
          onPress={() => setUrgency('standard')}
        >
          <Clock size={24} color={urgency === 'standard' ? theme.light.colors.primary : theme.light.colors.textMuted} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, urgency === 'standard' && styles.textActive]}>Schedule for later</Text>
            <Text style={styles.cardDesc}>Pick a specific date and time</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, urgency === 'asap' && styles.cardActive]}
          onPress={() => setUrgency('asap')}
        >
          <AlertTriangle size={24} color={urgency === 'asap' ? theme.light.colors.error : theme.light.colors.textMuted} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, urgency === 'asap' && { color: theme.light.colors.error }]}>Emergency (ASAP)</Text>
            <Text style={styles.cardDesc}>We'll find the nearest available pro immediately</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Where do you need the service?</Text>
      <View style={styles.addressList}>
        {(addresses ?? []).map((addr) => (
          <TouchableOpacity 
            key={addr.id} 
            style={[styles.addressCard, addressId === addr.id && styles.cardActive]}
            onPress={() => setAddressId(addr.id)}
          >
            <MapPin size={20} color={addressId === addr.id ? theme.light.colors.primary : theme.light.colors.textMuted} />
            <View style={styles.cardContent}>
              <Text style={styles.addressTitle}>{addr.label || 'Home'}</Text>
              <Text style={styles.addressDesc}>{addr.street}, {addr.city}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

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
  cardActive: { borderColor: theme.light.colors.primary, backgroundColor: `${theme.light.colors.primary}08` },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted },
  textActive: { color: theme.light.colors.primary },
  addressList: { gap: 12, marginBottom: 40 },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: theme.light.colors.border, borderRadius: 12,
    backgroundColor: theme.light.colors.surface, gap: 16
  },
  addressTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary },
  addressDesc: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, marginTop: 2 },
  button: { marginTop: 24 }
});


