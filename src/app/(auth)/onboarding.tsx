import React, { useState, useRef } from 'react';
import { resolveImage } from '../../constants/images';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import BrandLogo from '../../components/ui/BrandLogo';
import GoogleIcon from '../../components/ui/GoogleIcon';

interface Slide {
  id: string;
  title: string;
  description: string;
  image: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'We provide professional service at a friendly price',
    description:
      'Find trusted local technicians, cleaners, painters, and appliance mechanics in Uyo ready to solve your property needs.',
    image:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'The best results and your satisfaction are our top priority',
    description:
      'Every job is backed by real warranty protection, genuine spare parts sourcing, and rigorous quality inspection.',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: "Let's make awesome changes to your home",
    description:
      'Book in under 60 seconds, track your service technician live in real-time, and pay seamlessly via card or bank transfer.',
    image:
      'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=800&q=80',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  const { colors } = useAppTheme();
  const windowDimensions = useWindowDimensions();
  // Handle web wrapper max-width
  const isWeb = Platform.OS === 'web';
  const SCREEN_WIDTH = isWeb ? Math.min(windowDimensions.width, 480) : windowDimensions.width;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLetsIn, setShowLetsIn] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const goToLogin = () => {
    setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  const goToRegister = () => {
    setOnboardingCompleted(true);
    router.replace('/(auth)/register');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      setShowLetsIn(true);
    }
  };

  const handleSkip = () => {
    setShowLetsIn(true);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < slides.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        },
        skipPill: {
          backgroundColor: colors.primaryLight,
          paddingHorizontal: spacing.md + 4,
          paddingVertical: spacing.xs + 2,
          borderRadius: radii.full,
        },
        skipText: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.primary,
        },
        pressed: {
          opacity: 0.7,
        },
        slide: {
          width: SCREEN_WIDTH,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          paddingTop: spacing.lg,
        },
        illustrationRing: {
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.xxl,
        },
        illustrationPhoto: {
          width: 248,
          height: 248,
          borderRadius: 124,
        },
        title: {
          fontFamily: fonts.display,
          fontSize: 26,
          lineHeight: 34,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.sm,
        },
        description: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textSecondary,
          textAlign: 'center',
          paddingHorizontal: spacing.md,
        },
        footer: {
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
          paddingTop: spacing.md,
          gap: spacing.lg,
        },
        dotsContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        },
        dot: {
          height: 8,
          borderRadius: radii.full,
        },
        activeDot: {
          width: 24,
          backgroundColor: colors.primary,
        },
        inactiveDot: {
          width: 8,
          backgroundColor: colors.border,
        },
        // Lets-in view (mockup 9_Light_lets in)
        letsInScroll: {
          flex: 1,
        },
        letsInContent: {
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
        },
        letsInNav: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        },
        backButton: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'flex-start',
        },
        letsInArtRing: {
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          marginVertical: spacing.lg,
          overflow: 'hidden',
        },
        letsInArt: {
          width: 220,
          height: 220,
          borderRadius: 110,
        },
        letsInTitle: {
          fontFamily: fonts.display,
          fontSize: 32,
          lineHeight: 40,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.xl,
        },
        socialCol: {
          gap: spacing.md,
          marginBottom: spacing.lg,
        },
        socialRowBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          paddingVertical: spacing.md,
        },
        socialGlyphBox: {
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        socialGlyph: {
          fontFamily: fonts.bold,
          fontSize: 18,
          lineHeight: 22,
          color: colors.textPrimary,
        },
        socialLabel: {
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 22,
          color: colors.textPrimary,
        },
        dividerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: spacing.lg,
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
        footerRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: spacing.lg,
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
    [colors, SCREEN_WIDTH]
  );

  if (showLetsIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.letsInNav}>
          <TouchableOpacity
            onPress={() => setShowLetsIn(false)}
            style={styles.backButton}
            accessibilityLabel="Back to onboarding"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.letsInScroll, styles.letsInContent]}>
          <View style={styles.letsInArtRing}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.letsInArt}
              accessibilityLabel="Home service professional"
            />
          </View>

          <Text style={styles.letsInTitle}>Let&apos;s get started</Text>

          <View style={styles.socialCol}>
            

            <TouchableOpacity
              style={styles.socialRowBtn}
              onPress={() => Alert.alert('Coming soon', 'Google login is coming soon. Please continue with phone or email.')}
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.socialGlyphBox}>
                <GoogleIcon size={20} />
              </View>
              <Text style={styles.socialLabel}>Continue with Google</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button title="Sign in with password" onPress={goToLogin} size="lg" />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={goToRegister}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandLogo width={92} />
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipPill, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.illustrationRing}>
              <Image
                source={resolveImage(item.image)}
                style={styles.illustrationPhoto}
                accessibilityLabel={item.title}
              />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentIndex === idx ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          icon={
            currentIndex === slides.length - 1 ? undefined : (
              <ArrowRight size={20} color={colors.textInverse} />
            )
          }
          iconPosition="right"
        />
      </View>
    </SafeAreaView>
  );
}



