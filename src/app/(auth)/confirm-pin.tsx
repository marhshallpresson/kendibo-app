import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';

const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', 'delete'],
];

export default function ConfirmPinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pin?: string;
    phone?: string;
    email?: string;
    name?: string;
  }>();
  const { colors } = useAppTheme();

  const setStorePin = useAuthStore((s) => s.setPin);
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const initialPin = params.pin || '';

  const handleKeyPress = (val: string) => {
    if (confirmPin.length < 4) {
      const nextPin = confirmPin + val;
      setConfirmPin(nextPin);
      setErrorMessage('');

      if (nextPin.length === 4) {
        validateAndProceed(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const validateAndProceed = (pinToTest: string) => {
    if (pinToTest !== initialPin) {
      setErrorMessage('PINs do not match. Please re-enter carefully.');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setStorePin(pinToTest);

        // PIN setup complete — session already verified via OTP/Google.
        const role = useAuthStore.getState().user?.role;
        router.replace((role === 'provider' ? '/(provider)' : '/(tabs)') as any);
      }, 400);
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
        content: {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
        },
        subtitle: {
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 24,
          color: colors.textPrimary,
          textAlign: 'center',
          paddingHorizontal: spacing.lg,
          marginVertical: spacing.xl,
        },
        pinBoxesRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
          marginBottom: spacing.md,
        },
        pinBox: {
          width: 64,
          height: 64,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surfaceCard,
          justifyContent: 'center',
          alignItems: 'center',
        },
        pinBoxActive: {
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
        pinBoxError: {
          borderColor: colors.error,
        },
        pinDot: {
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.textPrimary,
        },
        errorText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        confirmButton: {
          marginBottom: spacing.lg,
          marginTop: spacing.xl,
        },
        keypadContainer: {
          marginTop: 'auto',
          marginHorizontal: -spacing.xl,
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Confirm Your PIN</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Re-enter your 4-digit security PIN to confirm your chosen code.
        </Text>

        <View style={styles.pinBoxesRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = confirmPin.length > index;
            const isActive = confirmPin.length === index;
            return (
              <View
                key={index}
                style={[
                  styles.pinBox,
                  isActive && styles.pinBoxActive,
                  Boolean(errorMessage) && styles.pinBoxError,
                ]}
              >
                {isFilled ? <View style={styles.pinDot} /> : null}
              </View>
            );
          })}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Button
          title="Confirm PIN"
          onPress={() => validateAndProceed(confirmPin)}
          disabled={confirmPin.length < 4}
          loading={isLoading}
          size="lg"
          style={styles.confirmButton}
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
                      onPress={handleDelete}
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
                    onPress={() => handleKeyPress(item)}
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
    </SafeAreaView>
  );
}
