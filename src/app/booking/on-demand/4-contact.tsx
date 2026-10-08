import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../../services/api/client';
import { useAuthStore } from '../../../stores/authStore';

interface ServiceRequestResponse {
  id: string;
  status: string;
}

const URGENCY_LABELS: Record<string, string> = {
  emergency: 'Emergency (ASAP)',
  today: 'Today',
  this_week: 'This week',
};

export default function ContactScreen() {
  const router = useRouter();
  const store = useOnDemandStore();
  const setRequestId = useOnDemandStore((s) => s.setRequestId);
  const user = useAuthStore((s) => s.user);

  const createRequest = useMutation({
    mutationFn: async () => {
      return apiFetch<ServiceRequestResponse>('/v1/service-requests', {
        method: 'POST',
        body: {
          title: store.categoryName || 'Home service request',
          details: store.description,
          urgency: store.urgency,
          addressId: store.addressId ?? undefined,
          scheduledDate: store.scheduledDate ?? undefined,
          timeWindow: store.timeWindow ?? undefined,
          contactName: user?.name ?? undefined,
          contactPhone: user?.phone ?? undefined,
          contactEmail: user?.email ?? undefined,
          notes: store.photoUrls.length > 0 ? `Photos: ${store.photoUrls.join(', ')}` : undefined,
        },
      });
    },
    onSuccess: (data) => {
      setRequestId(data.id);
      router.push({ pathname: '/booking/on-demand/5-confirmation', params: { requestId: data.id } });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof TypeError
            ? 'You appear to be offline. Check your connection and try again.'
            : 'Could not submit your request. Please try again.';
      Alert.alert('Request not sent', message);
    },
  });

  const handleSubmit = async () => {
    const { requireOnline } = require('../../../services/txnGuard');
    if (!(await requireOnline('Service request'))) return;
    createRequest.mutate();
  };

  const rows: { label: string; value: string }[] = [
    { label: 'Category', value: store.categoryName || '—' },
    { label: 'Urgency', value: URGENCY_LABELS[store.urgency] ?? store.urgency },
    { label: 'When', value: store.timeWindow ? `${store.scheduledDate} · ${store.timeWindow}` : store.urgency === 'emergency' ? 'As soon as possible' : '—' },
    { label: 'Name', value: user?.name || '—' },
    { label: 'Phone', value: user?.phone || '—' },
    { label: 'Email', value: user?.email || '—' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Review & submit</Text>

      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={row.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value} numberOfLines={2}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Job description</Text>
        </View>
        <Text style={styles.details}>{store.description || '—'}</Text>
        {store.photoUrls.length > 0 && (
          <Text style={styles.photoCount}>{store.photoUrls.length} photo{store.photoUrls.length > 1 ? 's' : ''} attached</Text>
        )}
      </View>

      <Text style={styles.note}>
        Nearby pros will receive your request. Once one accepts, you&apos;ll get a confirmation and can track everything from your bookings.
      </Text>

      <View style={{ flex: 1 }} />

      <Button
        title={createRequest.isPending ? 'Submitting…' : 'Submit Request'}
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
    paddingHorizontal: 16, marginBottom: 16
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, alignItems: 'center', gap: 16 },
  divider: { height: 1, backgroundColor: theme.light.colors.border },
  label: { fontSize: 15, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted },
  value: { fontSize: 15, fontFamily: 'Inter-Medium', color: theme.light.colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  details: {
    fontSize: 15, fontFamily: 'Inter-Regular', color: theme.light.colors.textPrimary,
    lineHeight: 22, paddingBottom: 14
  },
  photoCount: { fontSize: 13, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, paddingBottom: 14 },
  note: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, marginBottom: 16, lineHeight: 20 },
  button: { marginTop: 40 }
});
