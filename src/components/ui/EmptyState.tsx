import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { spacing, typography, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onActionPress?: () => void;
  buttonTitle?: string;
  onButtonPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onActionPress,
  buttonTitle,
  onButtonPress,
  style,
  testID,
}) => {
  const effectiveButtonTitle = actionTitle || buttonTitle;
  const effectiveButtonPress = onActionPress || onButtonPress;
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        {icon ? icon : <Inbox size={48} color={colors.primary} />}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.display }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{description}</Text>}
      {effectiveButtonTitle && effectiveButtonPress && (
        <View style={styles.buttonWrapper}>
          <Button
            title={effectiveButtonTitle}
            onPress={effectiveButtonPress}
            size="md"
            variant="primary"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  buttonWrapper: {
    marginTop: spacing.sm,
    minWidth: 160,
  },
});
