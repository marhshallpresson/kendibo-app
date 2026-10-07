import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { spacing, typography, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Hide the back affordance (e.g. tab roots, multi-step wizards). */
  hideBackButton?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  hideBackButton = false,
  rightAction,
  transparent = false,
  style,
  testID,
}) => {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.container,
        transparent
          ? styles.transparent
          : { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.leftContainer}>
        {!hideBackButton && onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.semiBold }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightAction ? rightAction : <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  opaque: {
    borderBottomWidth: 1,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
});
