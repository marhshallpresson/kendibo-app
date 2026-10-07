import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';

const payoutSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(10, 'Account number must be 10 digits'),
  accountName: z.string().min(2, 'Account name is required'),
});

type FormData = z.infer<typeof payoutSchema>;

export default function KycPayoutScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { payout, setPayout } = useKycStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: payout,
  });

  const onSubmit = (data: FormData) => {
    setPayout(data);
    // Finally submit the entire KYC store payload to the backend
    // Since we are mocking, we just navigate to a success screen or storefront
    alert('KYC Application Submitted Successfully!');
    router.replace('/(provider)/storefront');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Payout Setup" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 5: Bank Details</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Where should we send your earnings?
        </Text>

        <Controller
          control={control}
          name="bankName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Bank Name"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Zenith Bank"
              error={errors.bankName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="accountNumber"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Account Number"
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
              placeholder="0000000000"
              error={errors.accountNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="accountName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Account Name"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Courtney Henry"
              error={errors.accountName?.message}
            />
          )}
        />

      </ScrollView>

      <View style={styles.footer}>
        <Button title="Submit Application" onPress={handleSubmit(onSubmit)} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: spacing.xxl,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});
