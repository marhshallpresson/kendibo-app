import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Delete,
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isValidEmail, isValidNigerianPhone } from '../../utils';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';

type ResetStep = 'select_method' | 'enter_otp' | 'new_password' | 'success';

const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', 'delete'],
];

function DottedSpinner({ color, size = 40 }: { color: string; size?: number }) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dots = [10, 9, 8, 7, 6, 5, 4, 3];
  const radius = size / 2 - 6;

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ rotate }] }}
      accessibilityLabel="Loading"
    >
      {dots.map((d, i) => {
        const angle = (i / dots.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: size / 2 - d / 2 + x,
              top: size / 2 - d / 2 + y,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity: 1 - i * 0.1,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [step, setStep] = useState<ResetStep>('select_method');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email'>('sms');
  const [targetContact, setTargetContact] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(55);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step !== 'enter_otp') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleRequestReset = () => {
    setErrorMessage('');
    if (selectedMethod === 'sms') {
      const fullPhone =
        targetContact.startsWith('0') || targetContact.startsWith('+234')
          ? targetContact
          : `0${targetContact}`;
      if (!targetContact || !isValidNigerianPhone(fullPhone)) {
        setErrorMessage('Please enter a valid Nigerian phone number');
        return;
      }
    } else {
      if (!targetContact || !isValidEmail(targetContact)) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtp('');
      setCountdown(55);
      setStep('enter_otp');
    }, 500);
  };

  const handleVerifyOtp = () => {
    setErrorMessage('');
    if (otp.length < 4) {
      setErrorMessage('Please enter the 4-digit reset code');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('new_password');
    }, 500);
  };

  const handleResetPassword = () => {
    setErrorMessage('');
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('success');
    }, 600);
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'delete') {
      setOtp((prev) => prev.slice(0, -1));
      setErrorMessage('');
      return;
    }
    if (val === '*') return;
    if (otp.length < 4) {
      setOtp((prev) => prev + val);
      setErrorMessage('');
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
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xs,
        },
        backButton: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'flex-start',
        },
        navTitle: {
          fontFamily: fonts.display,
          fontSize: 22,
          lineHeight: 30,
          color: colors.textPrimary,
        },
        scrollContent: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xxl,
        },
        logoWrap: {
          alignItems: 'center',
          marginVertical: spacing.md,
        },
        illustrationCircle: {
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginVertical: spacing.lg,
        },
        header: {
          marginBottom: spacing.xl,
        },
        headerCenter: {
          alignItems: 'center',
          marginBottom: spacing.md,
          marginTop: spacing.lg,
        },
        instruction: {
          fontFamily: fonts.regular,
          fontSize: 17,
          lineHeight: 26,
          color: colors.textPrimary,
        },
        codeSentText: {
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 24,
          color: colors.textPrimary,
          textAlign: 'center',
        },
        sectionLabel: {
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 24,
          color: colors.textPrimary,
          marginBottom: spacing.lg,
        },
        newPasswordTitle: {
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 24,
          color: colors.textPrimary,
          marginBottom: spacing.lg,
        },
        channelCards: {
          gap: spacing.md,
          marginBottom: spacing.xl,
        },
        methodCard: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.lg,
          borderRadius: radii.xl,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        methodCardActive: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        methodIconWrapper: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing.md,
        },
        methodDetails: {
          flex: 1,
        },
        methodLabel: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
          marginBottom: 4,
        },
        methodPreview: {
          fontFamily: fonts.bold,
          fontSize: 16,
          lineHeight: 24,
          color: colors.textPrimary,
        },
        inputSection: {
          marginBottom: spacing.md,
        },
        errorText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        actionButton: {
          marginTop: spacing.md,
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
          gap: spacing.md,
          marginVertical: spacing.xl,
        },
        otpBox: {
          width: 64,
          height: 56,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceCard,
          justifyContent: 'center',
          alignItems: 'center',
        },
        otpBoxFocused: {
          borderColor: colors.primary,
          borderWidth: 1.5,
          backgroundColor: colors.surface,
        },
        otpBoxFilled: {
          borderColor: colors.border,
          backgroundColor: colors.surfaceCard,
        },
        otpDigit: {
          fontFamily: fonts.bold,
          fontSize: 22,
          lineHeight: 30,
          color: colors.textPrimary,
        },
        resendRow: {
          alignItems: 'center',
          marginBottom: spacing.xl,
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
        rememberRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: spacing.md,
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary,
          marginRight: spacing.sm,
        },
        checkboxLabel: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textPrimary,
        },
        overlay: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        } as any,
        successCard: {
          width: '100%',
          maxWidth: 340,
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
          alignItems: 'center',
        },
        successIconCircle: {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        successTitle: {
          fontFamily: fonts.display,
          fontSize: 24,
          lineHeight: 32,
          color: colors.primary,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        successSubtitle: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.lg,
        },
        successButton: {
          marginTop: spacing.lg,
        },
        formGap: {
          gap: spacing.md,
        },
        keypadContainer: {
          marginHorizontal: -spacing.xl,
          marginTop: spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          backgroundColor: colors.surfaceCard,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        },
        keypadRow: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        },
        keypadKey: {
          width: 80,
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: radii.md,
        },
        keypadDigit: {
          fontFamily: fonts.regular,
          fontSize: 24,
          lineHeight: 32,
          color: colors.textPrimary,
        },
        keypadStar: {
          fontFamily: fonts.regular,
          fontSize: 24,
          lineHeight: 32,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  const navTitleText =
    step === 'new_password' || step === 'success'
      ? 'Create New Password'
      : 'Forgot Password';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'enter_otp') setStep('select_method');
              else if (step === 'new_password') setStep('enter_otp');
              else router.back();
            }}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>{navTitleText}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'select_method' && (
            <View>
              <View style={styles.logoWrap}>
                <BrandLogo width={110} />
              </View>
              <View style={styles.illustrationCircle}>
                <Lock size={56} color={colors.primary} strokeWidth={1.4} />
              </View>

              <View style={styles.header}>
                <Text style={styles.instruction}>
                  Select which contact details should we use to reset your password
                </Text>
              </View>

              <View style={styles.channelCards}>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedMethod === 'sms' && styles.methodCardActive,
                  ]}
                  onPress={() => {
                    setSelectedMethod('sms');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                >
                  <View style={styles.methodIconWrapper}>
                    <MessageSquare size={32} color={colors.primary} />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodLabel}>via SMS:</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedMethod === 'email' && styles.methodCardActive,
                  ]}
                  onPress={() => {
                    setSelectedMethod('email');
                    setErrorMessage('');
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                >
                  <View style={styles.methodIconWrapper}>
                    <Mail size={32} color={colors.primary} />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodLabel}>via Email:</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Input
                  placeholder={selectedMethod === 'sms' ? '08012345678' : 'you@example.com'}
                  value={targetContact}
                  onChangeText={(val) => {
                    setTargetContact(val);
                    setErrorMessage('');
                  }}
                  keyboardType={selectedMethod === 'sms' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                />
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Button
                title="Continue"
                onPress={handleRequestReset}
                loading={isLoading}
                size="lg"
                style={styles.actionButton}
              />
            </View>
          )}

          {step === 'enter_otp' && (
            <View>
              <View style={styles.headerCenter}>
                <Text style={styles.codeSentText}>
                  Code has been send to {selectedMethod === 'sms' ? '+234 801 *** 4567' : 'your email'}
                </Text>
              </View>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/[^0-9]/g, '').slice(0, 4));
                  setErrorMessage('');
                }}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.hiddenInput}
                caretHidden
              />

              <Pressable
                style={styles.otpBoxesContainer}
                onPress={() => otpInputRef.current?.focus()}
                accessibilityLabel="Enter 4-digit reset code"
              >
                {[0, 1, 2, 3].map((index) => {
                  const digit = otp[index] || '';
                  const isFocused = otp.length === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        digit !== '' && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </Pressable>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.resendText}>
                    Resend code in <Text style={styles.resendCountdown}>{countdown} s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setOtp('');
                      setErrorMessage('');
                      setCountdown(55);
                    }}
                  >
                    <Text style={[styles.resendText, { color: colors.primary, fontFamily: fonts.bold }]}>
                      Resend code
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Button
                title="Verify"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={otp.length < 4}
                size="lg"
                style={styles.actionButton}
              />

              <View style={styles.keypadContainer}>
                {KEYPAD_ROWS.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.keypadRow}>
                    {row.map((item, colIdx) => {
                      if (item === 'delete') {
                        return (
                          <TouchableOpacity
                            key={colIdx}
                            style={styles.keypadKey}
                            onPress={() => handleKeypadPress('delete')}
                            accessibilityLabel="Delete digit"
                          >
                            <Delete size={24} color={colors.textPrimary} />
                          </TouchableOpacity>
                        );
                      }
                      if (item === '*') {
                        return (
                          <View key={colIdx} style={styles.keypadKey}>
                            <Text style={styles.keypadStar}>*</Text>
                          </View>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={colIdx}
                          style={styles.keypadKey}
                          onPress={() => handleKeypadPress(item)}
                          accessibilityLabel={`Digit ${item}`}
                        >
                          <Text style={styles.keypadDigit}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}

          {step === 'new_password' && (
            <View>
              <View style={styles.illustrationCircle}>
                <ShieldCheck size={56} color={colors.primary} strokeWidth={1.4} />
              </View>

              <Text style={styles.newPasswordTitle}>Create Your New Password</Text>

              <View style={styles.formGap}>
                <Input
                  placeholder="New Password"
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  leftIcon={<Lock size={20} color={colors.textSecondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff size={20} color={colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  }
                />

                <Input
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showPassword}
                  leftIcon={<Lock size={20} color={colors.textSecondary} />}
                />
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                accessibilityRole="checkbox"
              >
                <View style={styles.checkbox}>
                  {rememberMe && <Check size={14} color={colors.textInverse} strokeWidth={3} />}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </Pressable>

              <Button
                title="Continue"
                onPress={handleResetPassword}
                loading={isLoading}
                size="lg"
                style={styles.actionButton}
              />
            </View>
          )}

          {step === 'success' && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <View style={styles.illustrationCircle}>
                <ShieldCheck size={56} color={colors.primary} strokeWidth={1.4} />
              </View>
              <Button
                title="Go to Sign In"
                onPress={() => router.replace('/(auth)/login')}
                size="lg"
                style={styles.successButton}
              />
            </View>
          )}
        </ScrollView>

        {step === 'success' ? (
          <View style={styles.overlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <ShieldCheck size={56} color={colors.textInverse} strokeWidth={1.8} />
              </View>
              <Text style={styles.successTitle}>Congratulations!</Text>
              <Text style={styles.successSubtitle}>
                Your account is ready to use. You will be redirected to the Home page in a few
                seconds..
              </Text>
              <DottedSpinner color={colors.primary} size={40} />
              <Button
                title="Go to Sign In"
                onPress={() => router.replace('/(auth)/login')}
                size="lg"
                style={styles.successButton}
              />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
