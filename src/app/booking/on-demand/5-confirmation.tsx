import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, Search, Loader2 } from 'lucide-react-native';
import { useOnDemandStore } from '../../../stores/onDemandStore';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const resetStore = useOnDemandStore((s) => s.reset);
  
  const [status, setStatus] = useState<'searching' | 'found'>('searching');

  useEffect(() => {
    // In a real app, you would connect to a websocket here to listen for provider acceptance.
    // We simulate finding a provider after 3 seconds for UI demonstration.
    const timer = setTimeout(() => {
      setStatus('found');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = () => {
    resetStore();
    router.dismissAll();
    router.replace('/(tabs)/bookings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'searching' ? (
          <>
            <View style={styles.iconContainer}>
              <Search size={48} color={theme.light.colors.primary} />
            </View>
            <Text style={styles.title}>Finding a Professional</Text>
            <Text style={styles.desc}>
              Your request has been broadcasted. We are matching you with the best available pros nearby.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 8 }}>
              <Loader2 size={20} color={theme.light.colors.textMuted} />
              <Text style={{ color: theme.light.colors.textMuted }}>Searching...</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.light.colors.success}20` }]}>
              <CheckCircle2 size={48} color={theme.light.colors.success} />
            </View>
            <Text style={styles.title}>Request Submitted!</Text>
            <Text style={styles.desc}>
              A professional has been assigned and will contact you shortly. Track their status in your bookings.
            </Text>
            <Button 
              title="View Booking" 
              onPress={handleFinish} 
              style={styles.button}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: `${theme.light.colors.primary}20`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24
  },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', color: theme.light.colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 16, fontFamily: 'Inter-Regular', color: theme.light.colors.textMuted, textAlign: 'center', lineHeight: 24 },
  button: { marginTop: 40, width: '100%' }
});

