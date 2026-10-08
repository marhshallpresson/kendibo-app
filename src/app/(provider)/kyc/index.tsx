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

const basicInfoSchema = z.object({
  businessName: z.string().min(2, 'Business name is too short'),
  contactPhone: z.string().min(10, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof basicInfoSchema>;

export default function KycBasicInfoScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { basicInfo, setBasicInfo } = useKycStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: basicInfo,
  });

  const onSubmit = (data: FormData) => {
    setBasicInfo(data);
    router.push('/(provider)/kyc/services');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Provider Onboarding" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 1: Basic Information</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tell us about your business.
        </Text>

        <Controller
          control={control}
          name="businessName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Business Name / Full Name"
              value={value}
              onChangeText={onChange}
              placeholder="Your business or full name"
              error={errors.businessName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="contactPhone"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Business Phone Number"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              placeholder="+234 800 000 0000"
              error={errors.contactPhone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Business Email Address"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="contact@example.com"
              error={errors.email?.message}
            />
          )}
        />

      </ScrollView>

      <View style={styles.footer}>
        <Button title="Continue to Services" onPress={handleSubmit(onSubmit)} size="lg" />
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
