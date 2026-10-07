import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Mail, Phone, ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores';
import { isValidEmail, isValidNigerianPhone, normalizeNigerianPhone } from '../../utils';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';
import GoogleIcon from '../../components/ui/GoogleIcon';

export default function LoginScreen() {
  const router = useRouter();
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const { colors } = useAppTheme();

  const [authMode, setAuthMode] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resolveTarget = (): string | null => {
    if (authMode === 'phone') {
      if (!phone.trim()) {
        setErrorMessage('Please enter your phone number');
        return null;
      }
      const fullPhone = phone.startsWith('0') || phone.startsWith('+234')
        ? phone
        : `0${phone}`;
      if (!isValidNigerianPhone(fullPhone)) {
        setErrorMessage('Please enter a valid Nigerian phone number');
        return null;
      }
      return normalizeNigerianPhone(fullPhone);
    }
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      return null;
    }
    return email.trim();
  };

  const handleSignIn = async () => {
    setErrorMessage('');
    const target = resolveTarget();
    if (!target) return;

    setIsLoading(true);
    try {
      const { devCode } = await requestOtp(authMode, target);
      if (__DEV__ && devCode) {
        Alert.alert('DEV OTP code', `Your verification code is ${devCode}`);
      }
      router.push({
        pathname: '/(auth)/otp',
        params:
          authMode === 'phone'
            ? { phone: target, target }
            : { email: target, target },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send verification code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async () => {
    Alert.alert('Coming soon', 'Social login is coming soon. Please continue with phone or email.');
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
        switcherContainer: {
          flexDirection: 'row',
          backgroundColor: colors.surfaceCard,
          borderRadius: radii.full,
          padding: 4,
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
        switchTab: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
          borderRadius: radii.full,
          gap: 6,
        },
        switchTabActive: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        switchTabText: {
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
        },
        switchTabTextActive: {
          fontFamily: fonts.semiBold,
          color: colors.primary,
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
        rememberRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        checkboxContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
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
        checkboxLabel: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textPrimary,
        },
        signInButton: {
          marginTop: spacing.md,
        },
        forgotCenter: {
          alignItems: 'center',
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        forgotPasswordText: {
          fontFamily: fonts.semiBold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.primary,
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
        signUpLink: {
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
            <Text style={styles.title}>Login to your Account</Text>
          </View>

          <View style={styles.switcherContainer}>
            <Pressable
              style={[styles.switchTab, authMode === 'phone' && styles.switchTabActive]}
              onPress={() => {
                setAuthMode('phone');
                setErrorMessage('');
              }}
              accessibilityRole="tab"
            >
              <Phone
                size={16}
                color={authMode === 'phone' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.switchTabText,
                  authMode === 'phone' && styles.switchTabTextActive,
                ]}
              >
                Phone
              </Text>
            </Pressable>

            <Pressable
              style={[styles.switchTab, authMode === 'email' && styles.switchTabActive]}
              onPress={() => {
                setAuthMode('email');
                setErrorMessage('');
              }}
              accessibilityRole="tab"
            >
              <Mail
                size={16}
                color={authMode === 'email' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.switchTabText,
                  authMode === 'email' && styles.switchTabTextActive,
                ]}
              >
                Email
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            {authMode === 'phone' ? (
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
                  </View>
                }
              />
            ) : (
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
            )}

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Button
              title="Send verification code"
              onPress={handleSignIn}
              loading={isLoading}
              size="lg"
              style={styles.signInButton}
            />

            <View style={styles.forgotCenter}>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPasswordText}>Didn&apos;t get a code?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleSocialLogin}
              accessibilityLabel="Continue with Facebook"
            >
              <Text style={[styles.socialIconText, { color: colors.primary }]}>f</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleSocialLogin}
              accessibilityLabel="Continue with Google"
            >
              <GoogleIcon size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleSocialLogin}
              accessibilityLabel="Continue with Apple"
            >
              <Text style={styles.socialIconText}></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
