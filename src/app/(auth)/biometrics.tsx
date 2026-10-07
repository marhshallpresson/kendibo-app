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
import { useRouter } from 'expo-router';
import { ArrowLeft, FingerprintPattern, CircleUserRound } from 'lucide-react-native';
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
  const { colors } = useAppTheme();

  const { enableBiometrics, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const completeSetup = (biometricsEnabled: boolean) => {
    setIsLoading(true);

    setTimeout(() => {
      enableBiometrics(biometricsEnabled);

      setIsLoading(false);
      setShowSuccess(true);

      setTimeout(() => {
        // Session comes from the verified OTP login — never synthesize one here.
        router.replace(((user ? '/(tabs)' : '/(auth)/login') as any));
      }, 1400);
    }, 500);
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
            onPress={() => completeSetup(true)}
            activeOpacity={0.8}
            accessibilityLabel="Enable fingerprint"
          >
            <FingerprintPattern size={180} color={colors.primary} strokeWidth={1.4} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Please put your finger on the fingerprint scanner to get started.
        </Text>

        <View style={styles.footer}>
          <Button
            title="Skip"
            onPress={() => completeSetup(false)}
            variant="primary"
            size="lg"
            style={styles.skipBtn}
            textStyle={{ color: colors.primary }}
          />
          <Button
            title="Continue"
            onPress={() => completeSetup(true)}
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
              Your account is ready to use. You will be redirected to the Home page in a few
              seconds..
            </Text>
            <DottedSpinner color={colors.primary} size={40} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
