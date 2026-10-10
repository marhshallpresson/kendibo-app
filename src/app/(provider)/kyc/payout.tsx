import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ChevronDown, Check, X } from '@/components/ui/icons';
import { Header, Button, Input } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';
import { payoutApi, type BankOption } from '../../../services/api/jobs';
import { providerApi } from '../../../services/api/provider';

const payoutSchema = z.object({
  bankName: z.string().min(2, 'Select your bank'),
  bankCode: z.string().min(1, 'Select your bank'),
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  accountName: z.string().min(2, 'Account name is required'),
});

type FormData = z.infer<typeof payoutSchema>;

export default function KycPayoutScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { payout, setPayout, basicInfo, services, location } = useKycStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [resolving, setResolving] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: payout,
  });

  const accountNumber = watch('accountNumber');
  const bankCode = watch('bankCode');
  const bankName = watch('bankName');
  const accountName = watch('accountName');

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => payoutApi.getBanks(),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  // Auto-resolve the account holder's name once a bank + full 10-digit number
  // are present. Resolved names are read-only; a user-typed name only survives
  // when the resolve call fails (e.g. no network).
  const resolveName = async (number: string, code: string) => {
    if (!/^\d{10}$/.test(number) || !code) return;
    setResolving(true);
    try {
      const r = await payoutApi.resolveAccount(number, code);
      if (r?.accountName) setValue('accountName', r.accountName);
    } catch {
      // Leave whatever the user typed; final submit still validates.
    } finally {
      setResolving(false);
    }
  };

  const filteredBanks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    );
  }, [banks, search]);

  const submitMutation = useMutation({
    mutationFn: (data: FormData) =>
      providerApi.submitKyc({
        businessName: basicInfo.businessName || undefined,
        skills: services.length > 0 ? services : undefined,
        bank: {
          accountNumber: data.accountNumber,
          bankCode: data.bankCode,
          bankName: data.bankName,
          accountName: data.accountName,
        },
        location:
          location.latitude !== 0 && location.longitude !== 0
            ? { lat: location.latitude, lng: location.longitude }
            : undefined,
      }),
    onSuccess: () => {
      setPayout(watch());
      Alert.alert(
        'Payout details submitted',
        'Your bank details were submitted for verification.',
        [{ text: 'OK', onPress: () => router.replace('/(provider)/storefront') }],
      );
    },
    onError: (e: Error) => {
      Alert.alert('Submission failed', e.message || 'Could not submit your details. Try again.');
    },
  });

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Payout Setup" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.textPrimary }]}>Step 5: Bank Details</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Where should we send your earnings?
          </Text>

          {/* Bank picker — searchable list from the live Bachs bank reference */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Bank Name</Text>
          <Pressable
            onPress={() => {
              setSearch('');
              setPickerOpen(true);
            }}
            style={[styles.picker, { backgroundColor: colors.inputFill, borderColor: errors.bankName ? colors.error : colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Select your bank"
          >
            <Text
              style={[styles.pickerText, { color: bankName ? colors.textPrimary : colors.textMuted }]}
              numberOfLines={1}
            >
              {bankName || 'Search and select your bank'}
            </Text>
            {banksLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </Pressable>
          {!!errors.bankName && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.bankName.message}</Text>
          )}

          <Controller
            control={control}
            name="accountNumber"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Account Number"
                value={value}
                onChangeText={(t: string) => {
                  onChange(t);
                  if (t.length === 10 && bankCode) void resolveName(t, bankCode);
                }}
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
                placeholder={resolving ? 'Resolving…' : 'Name as it appears on your account'}
                error={errors.accountName?.message}
              />
            )}
          />
          {resolving && (
            <Text style={[styles.note, { color: colors.textSecondary, marginTop: -spacing.xs }]}>
              Looking up your account name…
            </Text>
          )}

          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Your bank details are verified against your bank before payouts go live.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={submitMutation.isPending ? 'Submitting…' : 'Save Bank Details'}
            onPress={handleSubmit(onSubmit)}
            size="lg"
            disabled={submitMutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Bank picker modal */}
      <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select your bank</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={8} accessibilityLabel="Close bank picker">
              <X size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.inputFill }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search banks…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              autoCorrect={false}
              autoCapitalize="words"
            />
          </View>

          <FlatList
            data={filteredBanks}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {banksLoading ? 'Loading banks…' : 'No banks match your search.'}
              </Text>
            }
            renderItem={({ item }) => {
              const selected = item.code === bankCode;
              return (
                <Pressable
                  onPress={() => {
                    setValue('bankName', item.name, { shouldValidate: true });
                    setValue('bankCode', item.code, { shouldValidate: true });
                    setPickerOpen(false);
                    const currentNumber = accountNumber;
                    if (/^\d{10}$/.test(currentNumber)) void resolveName(currentNumber, item.code);
                  }}
                  style={[styles.bankRow, { borderBottomColor: colors.borderSubtle }]}
                >
                  <Text style={[styles.bankName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {selected && <Check size={20} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pickerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    marginRight: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bankName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    marginRight: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: spacing.xxl,
  },
});
