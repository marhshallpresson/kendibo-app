import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableWithoutFeedback,
} from 'react-native';
import { X } from '@/components/ui/icons';
import { radii, spacing, typography, shadows, fonts } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'center' | 'bottomSheet';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  type = 'center',
  style,
  testID,
}) => {
  const isBottomSheet = type === 'bottomSheet';
  const { colors } = useAppTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isBottomSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, isBottomSheet ? styles.bottomBackdrop : styles.centerBackdrop]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.surface },
                isBottomSheet ? styles.bottomSheetContent : styles.centerContent,
                style,
              ]}
            >
              {isBottomSheet && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
              {(Boolean(title) || typeof onClose === 'function') && (
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{title || ''}</Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close modal"
                  >
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              )}
              <View style={styles.body}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  centerBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  bottomBackdrop: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    ...shadows.modal,
  },
  centerContent: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    maxWidth: 400,
  },
  bottomSheetContent: {
    borderTopLeftRadius: radii.modalSheet,
    borderTopRightRadius: radii.modalSheet,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  body: {
    width: '100%',
  },
});
