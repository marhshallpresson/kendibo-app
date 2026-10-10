import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera, ImagePlus, X } from '@/components/ui/icons';
import { useAppTheme } from '../../app/_layout';
import { fonts, spacing, radii, shadows } from '../../constants/theme';
import { pickEvidence } from '../../utils/images';

export type MediaSource = 'camera' | 'library';

export interface PickedMedia {
  uri: string;
  mime: string;
  width: number;
  height: number;
}

interface MediaPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (media: PickedMedia) => void;
  /** Allow camera capture. Default true. */
  allowCamera?: boolean;
  /** Allow library pick. Default true. */
  allowLibrary?: boolean;
  title?: string;
}

/**
 * Unified bottom sheet for camera / photo-library selection with compression
 * and EXIF stripping baked in (PRD §48). Web has no camera stack — the camera
 * row is hidden automatically.
 */
export function MediaPickerSheet({
  visible,
  onClose,
  onSelect,
  allowCamera = true,
  allowLibrary = true,
  title = 'Add Photo',
}: MediaPickerSheetProps): React.ReactElement {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState<MediaSource | null>(null);

  const showCamera = allowCamera && Platform.OS !== 'web';

  const handlePick = useCallback(
    async (source: MediaSource) => {
      setBusy(source);
      try {
        const media = await pickEvidence(source);
        if (media) onSelect(media);
        onClose();
      } finally {
        setBusy(null);
      }
    },
    [onSelect, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.display }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {showCamera && (
            <Pressable
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() => handlePick('camera')}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
                <Camera size={22} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  Take Photo
                </Text>
                <Text style={[styles.rowHint, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                  Take a photo with your camera
                </Text>
              </View>
              {busy === 'camera' && <ActivityIndicator size="small" color={colors.primary} />}
            </Pressable>
          )}

          {allowLibrary && (
            <Pressable
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() => handlePick('library')}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
                <ImagePlus size={22} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                  Choose from Library
                </Text>
                <Text style={[styles.rowHint, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                  Pick an existing photo
                </Text>
              </View>
              {busy === 'library' && <ActivityIndicator size="small" color={colors.primary} />}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 54, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
  },
  close: {
    padding: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  rowHint: {
    fontSize: 12,
  },
});
