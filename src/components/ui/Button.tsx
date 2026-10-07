import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { radii, spacing, typography, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
  textStyle,
  testID,
}) => {
  const isActionDisabled = disabled || loading;
  const { colors } = useAppTheme();

  const variantBackground = ((): string | undefined => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'danger':
        return colors.error;
      default:
        return undefined;
    }
  })();

  const getContainerStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
    return [
      styles.base,
      styles[`size_${size}`],
      fullWidth && styles.fullWidth,
      variantBackground ? { backgroundColor: variantBackground } : undefined,
      variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
      isActionDisabled && styles.disabled,
      pressed && !isActionDisabled && styles.pressed,
      style,
    ];
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return colors.textInverse;
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return colors.textInverse;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isActionDisabled}
      style={getContainerStyle}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.spinner}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, styles[`textSize_${size}`], { color: getTextColor(), fontFamily: fonts.semiBold }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  spinner: {
    marginVertical: 2,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  // Sizes
  size_sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
  // Variants (layout only — colors come from useAppTheme at render time)
  primary: {},
  secondary: {},
  outline: {
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {},
});
