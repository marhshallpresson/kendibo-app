import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lock, Delete, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Header, Button } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { formatKoboToNaira } from '../../utils/currency';
import { lightColors as colors, radii, spacing, typography, shadows } from '../../constants/theme';

export interface PinModalProps {
  visible?: boolean;
  amountKobo?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function PinModalScreen(props: PinModalProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ amountKobo?: string; bookingId?: string }>();
  const { pin: userPin } = useAuthStore();

  const amountKobo = props.amountKobo ?? (params.amountKobo ? parseInt(params.amountKobo, 10) : 1538700);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Expected PIN is user's stored PIN or '1234' by default
  const expectedPin = userPin || '1234';

  const handleKeyPress = (num: string) => {
    if (isVerifying || pinDigits.length >= 4) return;
    setErrorMsg('');

    const newPin = pinDigits + num;
    setPinDigits(newPin);

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (isVerifying || pinDigits.length === 0) return;
    setErrorMsg('');
    setPinDigits((prev) => prev.slice(0, -1));
  };

  const verifyPin = (enteredPin: string) => {
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      if (enteredPin === expectedPin) {
        if (props.onSuccess) {
          props.onSuccess();
        } else {
          router.replace({
            pathname: '/payment/success',
            params: {
              amountKobo: amountKobo.toString(),
              bookingId: params.bookingId || 'KB-88219',
            },
          });
        }
      } else {
        const remaining = attemptsRemaining - 1;
        setAttemptsRemaining(remaining);
        setPinDigits('');
        if (remaining <= 0) {
          setErrorMsg('Account temporarily locked. Reset PIN via SMS.');
        } else {
          setErrorMsg(`Incorrect PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
        }
      }
    }, 450);
  };

  const handleBack = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Security PIN"
        onBack={handleBack}
      />

      <View style={styles.container}>
        {/* Header Icon */}
        <View style={styles.lockIconCircle}>
          <Lock size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>Enter Transaction PIN</Text>
        <Text style={styles.subtitle}>
          Authorize payment of{' '}
          <Text style={styles.amountHighlight}>{formatKoboToNaira(amountKobo)}</Text>
        </Text>

        {/* PIN Indicators (4 Dots) */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pinDigits.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  errorMsg ? styles.dotError : null,
                ]}
              />
            );
          })}
        </View>

        {/* Verification spinner or error message */}
        {isVerifying ? (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.verifyingText}>Authorizing payment...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorRow}>
            <AlertCircle size={14} color={colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <Text style={styles.hintText}>Default test PIN: 1234</Text>
        )}

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'backspace'],
          ].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map((key, keyIdx) => {
                if (key === '') {
                  return <View key={keyIdx} style={styles.emptyKey} />;
                }
                if (key === 'backspace') {
                  return (
                    <Pressable
                      key={keyIdx}
                      onPress={handleBackspace}
                      style={({ pressed }) => [
                        styles.keyButton,
                        pressed && styles.keyPressed,
                      ]}
                      accessibilityLabel="Backspace"
                    >
                      <Delete size={24} color={colors.textPrimary} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={keyIdx}
                    onPress={() => handleKeyPress(key)}
                    style={({ pressed }) => [
                      styles.keyButton,
                      pressed && styles.keyPressed,
                    ]}
                    accessibilityLabel={`Digit ${key}`}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Forgot PIN Link */}
        <Pressable
          onPress={() => {
            setErrorMsg('');
            setPinDigits('');
            alert('A temporary PIN reset code has been sent to your registered phone number.');
          }}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  amountHighlight: {
    fontWeight: '800',
    color: colors.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotError: {
    borderColor: colors.error,
    backgroundColor: colors.badgeRedBg,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 24,
    marginBottom: spacing.md,
  },
  verifyingText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    height: 24,
    marginBottom: spacing.md,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  keyPressed: {
    backgroundColor: colors.primaryLight,
  },
  emptyKey: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  forgotBtn: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  forgotText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
});
