import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';

function DottedSpinner({ color, size = 48 }: { color: string; size?: number }) {
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

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, hasCompletedOnboarding, hydrated, user } = useAuthStore();
  const { colors } = useAppTheme();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    const timer = setTimeout(() => {
      // Waits for hydrate(): route off the restored session, never on stale
      // boot state (that was the "reload → onboarding" bug).
      if (isAuthenticated) {
        router.replace((user?.role === 'provider' ? '/(provider)' : '/(tabs)') as any);
      } else if (hasCompletedOnboarding) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, hydrated ? 900 : 400);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasCompletedOnboarding, hydrated, user, router, fadeAnim, pulseAnim]);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.xl,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        logoWrap: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        spinnerWrap: {
          marginTop: spacing.xxxl + spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        footer: {
          alignItems: 'center',
          paddingBottom: spacing.md,
        },
        versionText: {
          fontFamily: fonts.regular,
          fontSize: 12,
          lineHeight: 18,
          color: colors.textMuted,
        },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}>
          <BrandLogo width={168} />
        </Animated.View>
        <View style={styles.spinnerWrap}>
          <DottedSpinner color={colors.primary} size={44} />
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}
