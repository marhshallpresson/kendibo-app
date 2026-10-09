import React, { useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '../../constants/ThemeContext';
import { fonts, radii, shadows, spacing } from '../../constants/theme';

const appIcon = require('../../../assets/icon.png');

export function FloatingBookButton() {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

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
    outputRange: [0, 156],
  });
  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Book a service"
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
    </View>
  );
}

export default FloatingBookButton;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    bottom: 96,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.lg,
  },
  circle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 34,
    height: 34,
  },
  labelWrap: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.semiBold,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
