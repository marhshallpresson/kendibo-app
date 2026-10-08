import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
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
    Alert.alert(
      'Payout details saved',
      'Your bank details have been saved on this device. They will be submitted for verification once the payout service is available.',
      [{ text: 'OK', onPress: () => router.replace('/(provider)/storefront') }],
    );
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
              placeholder="Enter your bank name"
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
              maxLength={10}
              placeholder="10-digit account number"
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
              placeholder="Name as it appears on your account"
              error={errors.accountName?.message}
            />
          )}
        />

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Bank details are stored locally until payout verification goes live.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Save Bank Details" onPress={handleSubmit(onSubmit)} size="lg" />
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
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});
