import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { radii, spacing, shadows } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export type CardVariant = 'elevated' | 'outlined' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  onPress,
  style,
  testID,
}) => {
  const { colors } = useAppTheme();
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    { backgroundColor: variant === 'flat' ? colors.surfaceCard : colors.surface },
    variant === 'outlined' && { borderWidth: 1.5, borderColor: colors.border },
    variant === 'elevated' && styles.elevated,
    styles[`pad_${padding}`],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
        testID={testID}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  // Variants (colors resolved at render time for theme support)
  elevated: {
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  // Paddings
  pad_none: {
    padding: 0,
  },
  pad_sm: {
    padding: spacing.sm,
  },
  pad_md: {
    padding: spacing.md,
  },
  pad_lg: {
    padding: spacing.lg,
  },
});
