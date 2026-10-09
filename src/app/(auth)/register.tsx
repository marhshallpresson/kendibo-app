import React, { useState } from 'react';
import { useWatchupScreen } from '../../hooks/useWatchupScreen';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User, Mail, Tag, Check, ArrowLeft, Phone } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores';
import { isValidEmail, isValidNigerianPhone, normalizeNigerianPhone } from '../../utils';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';
import GoogleIcon from '../../components/ui/GoogleIcon';
import { useGoogleAuth, GOOGLE_CANCELLED } from '../../hooks/useGoogleAuth';

export default function RegisterScreen() {
  useWatchupScreen('AuthRegister');

  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; phone?: string }>();
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const { signIn } = useGoogleAuth();
  const { colors } = useAppTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [phone, setPhone] = useState(
    typeof params.phone === 'string' ? params.phone.replace(/^\+234/, '0') : '',
  );
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async () => {
    setErrorMessage('');

    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Please enter your full name (minimum 3 characters)');
      return;
    }

    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    const fullPhone = phone.startsWith('0') || phone.startsWith('+234')
      ? phone
      : `0${phone}`;
    if (!phone.trim() || !isValidNigerianPhone(fullPhone)) {
      setErrorMessage('Please enter a valid Nigerian phone number');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service & Privacy Policy');
      return;
    }

    const normalizedPhone = normalizeNigerianPhone(fullPhone);
    const target = email.trim();

    setIsLoading(true);
    try {
      const { devCode } = await requestOtp('email', target);
      if (__DEV__ && devCode) {
        Alert.alert('DEV OTP code', `Your verification code is ${devCode}`);
      }
      router.push({
        pathname: '/(auth)/otp',
        params: {
          target,
          phone: normalizedPhone,
          name: fullName.trim(),
          email: target,
          role,
        },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send verification code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async () => {
    setErrorMessage('');
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service & Privacy Policy');
      return;
    }
    setIsGoogleLoading(true);
    try {
      const { isNew } = await signIn();
      if (isNew) {
        // New Google accounts pick Customer/Provider before entering the app.
        router.replace('/(auth)/role-pick');
        return;
      }
      const pin = useAuthStore.getState().pin;
      const userRole = useAuthStore.getState().user?.role;
      if (pin == null) {
        router.replace('/(auth)/biometrics');
      } else {
        router.replace((userRole?.toLowerCase() === 'provider' ? '/(provider)' : '/(tabs)') as any);
      }
    } catch (err: any) {
      if (err?.message !== GOOGLE_CANCELLED) {
        setErrorMessage(err?.message || 'Google sign-up failed. Try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xxl,
        },
        navBar: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        backButton: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'flex-start',
        },
        logoRow: {
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        header: {
          marginBottom: spacing.xl,
        },
        title: {
          fontFamily: fonts.display,
          fontSize: 40,
          lineHeight: 48,
          color: colors.textPrimary,
        },
        form: {
          gap: spacing.md,
        },
        countryPrefix: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingRight: spacing.xs,
        },
        prefixText: {
          fontFamily: fonts.semiBold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
        prefixDivider: {
          width: 1,
          height: 18,
          backgroundColor: colors.border,
          marginLeft: 8,
          marginRight: 4,
        },
        errorContainer: {
          backgroundColor: colors.badgeRedBg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
        errorText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
          textAlign: 'center',
        },
        termsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          marginTop: spacing.sm,
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
        },
        checkboxSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        termsText: {
          fontFamily: fonts.regular,
          fontSize: 12,
          lineHeight: 18,
          color: colors.textSecondary,
          flexShrink: 1,
        },
        termsLink: {
        fontFamily: fonts.semiBold,
        color: colors.primary,
      },
      roleCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radii.md,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceCard,
      },
      roleCardText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: colors.textSecondary,
      },
      label: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
      },
        signUpButton: {
          marginTop: spacing.md,
        },
        dividerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: spacing.xl,
        },
        dividerLine: {
          flex: 1,
          height: 1,
          backgroundColor: colors.border,
        },
        dividerText: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
          paddingHorizontal: spacing.md,
        },
        socialRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.md,
          marginBottom: spacing.xl,
        },
        socialBtn: {
          width: 72,
          height: 56,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
        },
        socialIconText: {
          fontFamily: fonts.bold,
          fontSize: 24,
          lineHeight: 28,
          color: colors.textPrimary,
        },
        footerRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        },
        footerText: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
        },
        signInLink: {
          fontFamily: fonts.bold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.primary,
        },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.logoRow}>
            <BrandLogo width={110} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Create your Account</Text>
          </View>

          <View style={styles.form}>
            <Input
              placeholder="Full Name"
              value={fullName}
              onChangeText={(val) => {
                setFullName(val);
                setErrorMessage('');
              }}
              autoCapitalize="words"
              leftIcon={<User size={20} color={colors.textSecondary} />}
            />

            <Input
              placeholder="Email"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setErrorMessage('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={colors.textSecondary} />}
            />

            <Input
              placeholder="Mobile Number"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                setErrorMessage('');
              }}
              keyboardType="phone-pad"
              leftIcon={
                <View style={styles.countryPrefix}>
                  <Text style={styles.prefixText}>+234</Text>
                  <View style={styles.prefixDivider} />
                  <Phone size={18} color={colors.textSecondary} />
                </View>
              }
            />

            <Input
              placeholder="Referral Code (Optional)"
              value={referralCode}
              onChangeText={(val) => setReferralCode(val.toUpperCase())}
              autoCapitalize="characters"
              leftIcon={<Tag size={20} color={colors.textSecondary} />}
            />

                        <View style={{ marginBottom: 20 }}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>How do you want to use this app?</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable
                  onPress={() => setRole('customer')}
                  style={[styles.roleCard, role === 'customer' && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                >
                  <Text style={[styles.roleCardText, role === 'customer' && { color: colors.primary, fontFamily: fonts.bold }]}>Customer</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRole('provider')}
                  style={[styles.roleCard, role === 'provider' && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                >
                  <Text style={[styles.roleCardText, role === 'provider' && { color: colors.primary, fontFamily: fonts.bold }]}>Provider</Text>
                </Pressable>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              accessibilityRole="checkbox"
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxSelected]}>
                {agreeTerms && <Check size={14} color={colors.textInverse} strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            <Button
              title="Sign up"
              onPress={handleSignUp}
              loading={isLoading}
              size="lg"
              style={styles.signUpButton}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            
            <TouchableOpacity
              style={[styles.socialBtn, isGoogleLoading && { opacity: 0.5 }]}
              onPress={handleSocialSignUp}
              disabled={isGoogleLoading}
              accessibilityLabel="Sign up with Google"
            >
              <GoogleIcon size={22} />
            </TouchableOpacity>

          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}




