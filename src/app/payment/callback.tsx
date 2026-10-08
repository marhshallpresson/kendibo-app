import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../_layout';
import { api } from '../../services/api';

/**
 * Bachs hosted-checkout return target (`kendibo://payment/callback`).
 * The redirect is NOT payment truth — the backend webhook
 * (collection.succeeded -> server-side verify -> ledger) is. This screen
 * polls the verified record, then routes to success / shows failure state
 * (PRD App J: what happened, what happens next, what to do).
 */
export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout_id?: string; reference?: string }>();
  const { colors } = useAppTheme();
  const [state, setState] = useState<'verifying' | 'failed'>('verifying');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ref = params.checkout_id ?? params.reference;
    if (!ref) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time missing-ref fallback to failure state
      setState('failed');
      return;
    }
    const poll = async () => {
      for (let i = 0; i < 10; i++) {
        try {
          const rec = await api<{ status: string; reference: string; amountKobo?: string }>(
            `/v1/payments/${encodeURIComponent(ref)}`,
          );
          if (cancelled) return;
          if (rec.status === 'successful' || rec.status === 'success') {
            try {
              const { watchup } = require('../../services/watchup') as typeof import('../../services/watchup');
              watchup.track('payment.confirmed', { reference: rec.reference });
            } catch {
              /* ignore */
            }
            router.replace({ pathname: '/payment/success', params: { paymentRef: rec.reference } });
            return;
          }
          if (rec.status === 'failed') break;
        } catch {
          /* webhook may not have landed yet — keep polling */
        }
        setAttempt(i + 1);
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setState('failed');
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [params.checkout_id, params.reference, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {state === 'verifying' ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" />
          <Text style={{ color: colors.textPrimary }}>Confirming your payment… ({attempt + 1}/10)</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Do not close the app. We are verifying with the payment provider.
          </Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ color: colors.textPrimary }}>Payment not confirmed</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            The payment could not be verified. No money was deducted by KENDIBO. You can retry from your bookings.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
