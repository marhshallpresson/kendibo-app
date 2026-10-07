import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../../services/api/client';

interface MeResponse {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface BookingCreateResponse {
  id: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const store = useOnDemandStore();
  const confirmContact = useOnDemandStore((s) => s.confirmContact);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/v1/me'),
  });

  const createRequest = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiFetch<BookingCreateResponse>('/v1/bookings', { method: 'POST', body: payload });
      return res;
    },
    onSuccess: (data) => {
      confirmContact();
      router.push({ pathname: '/booking/on-demand/5-confirmation', params: { bookingId: data.id } });
    }
  });

  const handleSubmit = () => {
    createRequest.mutate({
      serviceId: store.serviceId,
      addressId: store.addressId,
      scheduledAt: store.urgency === 'asap' ? new Date().toISOString() : store.scheduledAt,
      urgency: store.urgency,
      customerNotes: store.serviceNotes
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Confirm Contact Details</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>Kendibo User</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || '+234 800 000 0000'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || 'user@example.com'}</Text>
        </View>
      </View>

      <Text style={styles.note}>
        Providers will use these details to contact you once they accept your request.
      </Text>

      <View style={{ flex: 1 }} />

      <Button 
        title={createRequest.isPending ? "Submitting..." : "Submit Request"} 
        onPress={handleSubmit} 
        disabled={createRequest.isPending}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  content: { padding: 24, flexGrow: 1, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: theme.light.colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: theme.light.colors.border,
    paddingHorizontal: 16
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, alignItems: 'center' },
  divider: { height: 1, backgroundColor: theme.light.colors.border },
  label: { fontSize: 15, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted },
  value: { fontSize: 15, fontFamily: 'Inter-Medium', color: theme.light.colors.textPrimary },
  note: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, marginTop: 16, lineHeight: 20 },
  button: { marginTop: 40 }
});


