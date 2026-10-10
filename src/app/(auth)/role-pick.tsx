import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Briefcase, Check } from '@/components/ui/icons';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';

type Choice = 'customer' | 'provider';

const OPTIONS: { value: Choice; title: string; description: string; Icon: typeof User }[] = [
  {
    value: 'customer',
    title: 'Customer',
    description: 'Book trusted professionals for your home or office.',
    Icon: User,
  },
  {
    value: 'provider',
    title: 'Provider',
    description: 'Offer your services and earn on Kendibo.',
    Icon: Briefcase,
  },
];

export default function RolePickScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const setRole = useAuthStore((s) => s.setRole);

  const [selected, setSelected] = useState<Choice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleContinue = async () => {
    if (!selected || isSaving) return;
    setErrorMessage('');
    setIsSaving(true);
    try {
      await setRole(selected);
      // Same PIN detour as OTP sign-ups: biometrics setup, then create-pin → confirm-pin.
      const pin = useAuthStore.getState().pin;
      if (pin == null) {
        router.replace('/(auth)/biometrics');
      } else {
        router.replace(selected === 'provider' ? ('/(provider)' as any) : ('/(tabs)' as any));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not save your choice. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
        },
        logoRow: {
          alignItems: 'center',
          marginBottom: spacing.xxl,
        },
        eyebrow: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        title: {
          fontFamily: fonts.display,
          fontSize: 32,
          lineHeight: 40,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        subtitle: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.xxl,
        },
        options: {
          gap: spacing.md,
        },
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        cardSelected: {
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
        iconBox: {
          width: 48,
          height: 48,
          borderRadius: radii.md,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        cardTexts: {
          flex: 1,
        },
        cardTitle: {
          fontFamily: fonts.semiBold,
          fontSize: 17,
          lineHeight: 24,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        cardDescription: {
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary,
        },
        checkCircle: {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        },
        checkCircleSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        errorContainer: {
          backgroundColor: colors.badgeRedBg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          marginTop: spacing.md,
        },
        errorText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
          textAlign: 'center',
        },
        continueBtn: {
          marginTop: 'auto',
          marginBottom: spacing.xl,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <BrandLogo width={110} />
        </View>

        <Text style={styles.eyebrow}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
        <Text style={styles.title}>You&apos;re joining as</Text>
        <Text style={styles.subtitle}>
          {user?.email ? `${user.email} · ` : ''}Choose how you&apos;ll use Kendibo. You can still book services as a provider later.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map(({ value, title, description, Icon }) => {
            const isSelected = selected === value;
            return (
              <Pressable
                key={value}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={title}
              >
                <View style={styles.iconBox}>
                  <Icon size={22} color={isSelected ? colors.primary : colors.textSecondary} />
                </View>
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardDescription}>{description}</Text>
                </View>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected ? <Check size={14} color={colors.textInverse} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.continueBtn, (!selected || isSaving) && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={!selected || isSaving}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              height: 54,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 16, color: colors.textInverse }}>
                Continue
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
