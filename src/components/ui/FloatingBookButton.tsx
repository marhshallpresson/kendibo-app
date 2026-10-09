import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '../../constants/ThemeContext';
import { fonts, radii, shadows, spacing } from '../../constants/theme';

const appIcon = require('../../../assets/logo-dark.png');

const BUTTON_SIZE = 68;
const LABEL_WIDTH = 168;
const BOB_DISTANCE = 8;
const BOB_DURATION = 650;

// The native driver logs a warning on web, so only use it on native.
const useNativeDriver = Platform.OS !== 'web';

const ease = Easing.inOut(Easing.quad);

export function FloatingBookButton() {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Parked while expanded: the cleanup below has already stopped and
    // reset the values, so the tap target sits still once it opens.
    if (expanded) {
      return;
    }

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -BOB_DISTANCE,
          duration: BOB_DURATION,
          easing: ease,
          useNativeDriver,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: BOB_DURATION,
          easing: ease,
          useNativeDriver,
        }),
      ]),
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: BOB_DURATION,
          easing: ease,
          useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: BOB_DURATION,
          easing: ease,
          useNativeDriver,
        }),
      ]),
    );

    bounce.start();
    breathe.start();

    return () => {
      bounce.stop();
      breathe.stop();
      bob.setValue(0);
      pulse.setValue(1);
    };
  }, [expanded, bob, pulse]);

  const expand = () => {
    setExpanded(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const collapse = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start(() => setExpanded(false));
  };

  const handlePress = () => {
    if (!expanded) {
      expand();
      return;
    }
    router.push('/booking/on-demand/1-service');
    collapse();
  };

  const labelWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LABEL_WIDTH],
  });
  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        { transform: [{ translateY: bob }, { scale: pulse }] },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Book a service"
        accessibilityHint={
          expanded ? 'Confirms and opens the booking flow' : 'Expands to show booking'
        }
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.bar,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.circle}>
          <Image source={appIcon} style={styles.icon} resizeMode="contain" />
        </View>
        <Animated.View
          style={[styles.labelWrap, { width: labelWidth, opacity: labelOpacity }]}
        >
          <Text style={styles.label} numberOfLines={1}>
            Book a Service
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default FloatingBookButton;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing.md,
    bottom: 96,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BUTTON_SIZE,
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
  },
  labelWrap: {
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.semiBold,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
