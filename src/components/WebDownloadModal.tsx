import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Download, X } from '@/components/ui/icons';
import { useAppTheme } from '../app/_layout';
import { spacing, fonts, radii, shadows } from '../constants/theme';

const DISMISS_KEY = 'kendibo_web_modal_dismissed';

function alreadyDismissed(): boolean {
  if (Platform.OS !== 'web') return true;
  try {
    return globalThis.localStorage?.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    globalThis.localStorage?.setItem(DISMISS_KEY, '1');
  } catch {
    /* private-mode / storage-disabled — will re-offer next visit */
  }
}

/**
 * Web-only "Download the App" modal. Native builds return null. Shows once
 * per browser until dismissed (localStorage); "Download" honours the env
 * override and falls back to the Play Store listing.
 */
export function WebDownloadModal(): React.ReactElement | null {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (alreadyDismissed()) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (Platform.OS !== 'web' || !open) return null;

  const downloadUrl =
    process.env.EXPO_PUBLIC_DOWNLOAD_URL || 'https://play.google.com/store/apps/details?id=com.kendibo.app';

  const handleDownload = () => {
    markDismissed();
    globalThis.location?.assign(downloadUrl);
  };

  const handleDismiss = () => {
    markDismissed();
    setOpen(false);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Pressable style={styles.close} onPress={handleDismiss} accessibilityLabel="Close">
            <X size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
            <Download size={24} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.display }]}>
            Download Kendibo App
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            Get the full experience — live tracking, in-app chat, and secure checkout.
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryLabel, { fontFamily: fonts.semiBold }]}>Download App</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={handleDismiss}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryLabel, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
              Continue with Web
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 54, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  close: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 14,
  },
});
