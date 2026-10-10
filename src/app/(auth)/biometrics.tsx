import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { ArrowLeft, FingerprintPattern, CircleUserRound } from '@/components/ui/icons';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';

function DottedSpinner({ color, size = 44 }: { color: string; size?: number }) {
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

export default function BiometricsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone?: string;
    email?: string;
    name?: string;
  }>();
  const { colors } = useAppTheme();

  const { enableBiometrics } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const goToCreatePin = () => {
    router.replace({
      pathname: '/(auth)/create-pin',
      params: {
        phone: params.phone,
        name: params.name,
        email: params.email,
      },
    } as any);
  };

  const handleSkip = () => {
    enableBiometrics(false);
    goToCreatePin();
  };

  const handleEnableBiometrics = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setErrorMessage('Biometric authentication is not available on this device.');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setErrorMessage('No biometrics enrolled. Please set up fingerprint or face in device settings, or skip.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify it’s you',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });
      if (!result.success) {
        if (result.error !== 'user_cancel') {
          setErrorMessage('Biometric verification failed. Try again or skip.');
        }
        return;
      }
      enableBiometrics(true);
      setShowSuccess(true);
      setTimeout(goToCreatePin, 1400);
    } catch {
      setErrorMessage('Biometric verification failed. Try again or skip.');
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
          paddingHorizontal: spacing.md,
          marginVertical: spacing.lg,
        },
        fingerprintWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: spacing.xl,
        },
        hint: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textPrimary,
          textAlign: 'center',
          paddingHorizontal: spacing.xl,
          marginTop: spacing.xl,
        },
        footer: {
          flexDirection: 'row',
          gap: spacing.md,
          marginTop: 'auto',
          marginBottom: spacing.xl,
        },
        skipBtn: {
          flex: 1,
          backgroundColor: colors.primaryLight,
        },
        continueBtn: {
          flex: 1,
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
        successCircle: {
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
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        successSubtitle: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.lg,
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
        <Text style={styles.navTitle}>Set Your Fingerprint</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Add a fingerprint to make your account more secure.
        </Text>

        <View style={styles.fingerprintWrap}>
          <TouchableOpacity
            onPress={handleEnableBiometrics}
            activeOpacity={0.8}
            accessibilityLabel="Enable fingerprint"
          >
            <FingerprintPattern size={180} color={colors.primary} strokeWidth={1.4} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Please put your finger on the fingerprint scanner to get started.
        </Text>

        {errorMessage ? (
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 12,
              lineHeight: 18,
              color: colors.error,
              textAlign: 'center',
              marginTop: spacing.md,
            }}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button
            title="Skip and continue"
            onPress={handleSkip}
            variant="primary"
            size="lg"
            style={styles.skipBtn}
            textStyle={{ color: colors.primary }}
          />
          <Button
            title="Continue"
            onPress={handleEnableBiometrics}
            loading={isLoading}
            variant="primary"
            size="lg"
            style={styles.continueBtn}
          />
        </View>
      </View>

      {showSuccess ? (
        <View style={styles.overlay}>
          <View style={styles.successCard}>
            <View style={styles.successCircle}>
              <CircleUserRound size={64} color={colors.textInverse} strokeWidth={1.6} />
            </View>
            <Text style={styles.successTitle}>Congratulations!</Text>
            <Text style={styles.successSubtitle}>
              Biometrics enabled. Let&apos;s secure your account with a PIN next.
            </Text>
            <DottedSpinner color={colors.primary} size={40} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
