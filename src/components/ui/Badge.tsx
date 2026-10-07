import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { radii, spacing, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'info',
  size = 'md',
  icon,
  style,
  textStyle,
  testID,
}) => {
  const { colors } = useAppTheme();
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.badgeGreenBg, text: colors.badgeGreenText };
      case 'warning':
        return { bg: colors.badgeOrangeBg, text: colors.badgeOrangeText };
      case 'error':
        return { bg: colors.badgeRedBg, text: colors.badgeRedText };
      case 'info':
        return { bg: colors.badgeBlueBg, text: colors.badgeBlueText };
      case 'neutral':
      default:
        return { bg: colors.surfaceHover, text: colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.base,
        styles[`size_${size}`],
        { backgroundColor: bg },
        style,
      ]}
      testID={testID}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          styles[`textSize_${size}`],
          { color: text, fontFamily: fonts.semiBold },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 4,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
  },
  textSize_sm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textSize_md: {
    fontSize: 13,
    lineHeight: 18,
  },
});
