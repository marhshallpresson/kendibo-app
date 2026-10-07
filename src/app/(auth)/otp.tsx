import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    target?: string;
    phone?: string;
    email?: string;
    name?: string;
    role?: string;
  }>();
  const { colors } = useAppTheme();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);

  const target = params.target || params.email || params.phone || '';
  const displayTarget = target;
  // Backend OTP is channel-scoped: derive channel from the identity shape.
  const channel: 'phone' | 'email' = target.includes('@') ? 'email' : 'phone';

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(55);
  const isResendActive = countdown === 0;
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!isResendActive || isResending) return;
    setOtp('');
    setErrorMessage('');
    setIsResending(true);
    try {
      const { devCode } = await requestOtp(channel, target);
      if (__DEV__ && devCode) {
        Alert.alert('DEV OTP code', `Your verification code is ${devCode}`);
      }
      setCountdown(60);
      inputRef.current?.focus();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend code. Try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    setErrorMessage('');
    if (otp.length < 4) {
      setErrorMessage('Please enter the verification code sent to you');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(channel, target, otp, params.name, params.role);
      router.push({
        pathname: '/(auth)/create-pin',
        params: {
          phone: params.phone,
          name: params.name,
          email: params.email,
        },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        navBar: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xs,
        },
        backButton: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'flex-start',
        },
        content: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
        },
        logoWrap: {
          alignItems: 'center',
          marginBottom: spacing.xl,
        },
        header: {
          alignItems: 'center',
          marginBottom: spacing.xl,
        },
        title: {
          fontFamily: fonts.display,
          fontSize: 28,
          lineHeight: 36,
          color: colors.textPrimary,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        subtitle: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textSecondary,
          textAlign: 'center',
          paddingHorizontal: spacing.md,
        },
        phoneText: {
          fontFamily: fonts.bold,
          fontSize: 15,
          lineHeight: 22,
          color: colors.primary,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        hiddenInput: {
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        },
        otpBoxesContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
          marginTop: spacing.xl,
        },
        otpBox: {
          flex: 1,
          maxWidth: 52,
          aspectRatio: 1,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surfaceCard,
          justifyContent: 'center',
          alignItems: 'center',
        },
        otpBoxFocused: {
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
        otpBoxFilled: {
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
        otpBoxError: {
          borderColor: colors.error,
        },
        otpDigit: {
          fontFamily: fonts.display,
          fontSize: 24,
          lineHeight: 32,
          color: colors.textPrimary,
        },
        errorText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        resendContainer: {
          alignItems: 'center',
          marginBottom: spacing.xl,
          marginTop: spacing.sm,
        },
        resendText: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
        resendCountdown: {
          fontFamily: fonts.bold,
          color: colors.primary,
        },
        resendActiveText: {
          fontFamily: fonts.bold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.primary,
        },
        verifyButton: {
          marginTop: 'auto',
          marginBottom: spacing.xl,
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
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <BrandLogo width={110} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>
              We have sent you a verification code on
            </Text>
            <Text style={styles.phoneText}>{displayTarget}</Text>
          </View>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(val) => {
              const numeric = val.replace(/[^0-9]/g, '');
              if (numeric.length <= CODE_LENGTH) {
                setOtp(numeric);
                setErrorMessage('');
              }
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            caretHidden
          />

          <Pressable
            style={styles.otpBoxesContainer}
            onPress={() => inputRef.current?.focus()}
            accessibilityLabel={`Enter ${CODE_LENGTH}-digit OTP`}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const digit = otp[index] || '';
              const isFocused = otp.length === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isFocused && styles.otpBoxFocused,
                    digit !== '' && styles.otpBoxFilled,
                    Boolean(errorMessage) && styles.otpBoxError,
                  ]}
                >
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              );
            })}
          </Pressable>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.resendContainer}>
            {isResendActive ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendActiveText}>Didn&apos;t receive OTP? Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendText}>
                Resend code in <Text style={styles.resendCountdown}>{countdown} s</Text>
              </Text>
            )}
          </View>

          <Button
            title="Verify"
            onPress={handleVerify}
            disabled={otp.length < 4}
            loading={isLoading}
            size="lg"
            style={styles.verifyButton}
          />        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

