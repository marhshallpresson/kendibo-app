import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
  KeyboardTypeOptions,
} from 'react-native';
import { radii, spacing, typography, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
  containerStyle,
  inputStyle,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const { colors } = useAppTheme();

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.inputFill, borderColor: colors.border },
          multiline && styles.multilineWrapper,
          isFocused && { borderColor: colors.primary, backgroundColor: colors.surface },
          hasError && { borderColor: colors.error },
          disabled && { backgroundColor: colors.surfaceHover, borderColor: colors.borderSubtle },
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={isSecure}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={testID}
          style={[
            styles.textInput,
            { color: colors.textPrimary, fontFamily: fonts.regular },
            multiline && styles.multilineInput,
            disabled && { color: colors.textMuted },
            inputStyle,
          ]}
        />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>
      {hasError && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
      {!hasError && helperText && <Text style={[styles.helperText, { color: colors.textSecondary }]}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyMedium,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  multilineWrapper: {
    minHeight: 90,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  focusedWrapper: {},
  errorWrapper: {},
  disabledWrapper: {},
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  disabledText: {},
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
