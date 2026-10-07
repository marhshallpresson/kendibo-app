import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MoreHorizontal,
  Bell,
  Shield,
  Globe,
  Moon,
  Gift,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const LANGUAGES = ['English (US)', 'English (UK)', 'Nigerian Pidgin', 'Hausa', 'Yoruba', 'Igbo'];

  const handleCopyReferral = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    router.replace('/');
  };

  const renderRow = ({
    icon,
    label,
    right,
    onPress,
  }: {
    icon: React.ReactNode;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityRole="button">
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>{icon}</View>
        <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      {right ?? <ChevronRight size={20} color={colors.textPrimary} />}
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <MoreHorizontal size={22} color={colors.textPrimary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.menuList}>
          {renderRow({
            icon: <Bell size={22} color={colors.textPrimary} />,
            label: 'Notification',
            onPress: () => router.push('/settings/notifications'),
          })}
          {renderRow({
            icon: <Shield size={22} color={colors.textPrimary} />,
            label: 'Security',
            onPress: () => router.push('/settings/security'),
          })}
          {renderRow({
            icon: <Globe size={22} color={colors.textPrimary} />,
            label: 'Language',
            right: (
              <View style={styles.valueRight}>
                <Text style={[styles.valueText, { color: colors.textPrimary }]}>
                  {selectedLanguage}
                </Text>
                <ChevronRight size={20} color={colors.textPrimary} />
              </View>
            ),
            onPress: () => setShowLanguageModal(true),
          })}
          {renderRow({
            icon: <Moon size={22} color={colors.textPrimary} />,
            label: 'Dark Mode',
            right: (
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            ),
            onPress: () => setIsDarkMode((v) => !v),
          })}
          {renderRow({
            icon: <FileText size={22} color={colors.textPrimary} />,
            label: 'Privacy Policy',
            onPress: () => setShowPrivacyModal(true),
          })}
          {renderRow({
            icon: <HelpCircle size={22} color={colors.textPrimary} />,
            label: 'Help Center',
            onPress: () => setShowHelpModal(true),
          })}
          {renderRow({
            icon: <Gift size={22} color={colors.textPrimary} />,
            label: 'Invite Friends',
            onPress: () => setShowInviteModal(true),
          })}
        </View>

        <Pressable
          onPress={() => setShowLogoutModal(true)}
          style={styles.logoutRow}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <View style={styles.menuLeft}>
            <View style={styles.menuIcon}>
              <LogOut size={22} color={colors.error} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.error }]}>Logout</Text>
          </View>
        </Pressable>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          KENDIBO Mobile App • Version 1.0.0
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        type="bottomSheet"
        title="Select App Language"
      >
        <View style={styles.languageModalContent}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang;
            return (
              <Pressable
                key={lang}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setShowLanguageModal(false);
                }}
                style={[
                  styles.languageOption,
                  { backgroundColor: isSelected ? colors.primaryLight : colors.surfaceCard },
                ]}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    { color: isSelected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {lang}
                </Text>
                {isSelected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      <Modal visible={showInviteModal} onClose={() => setShowInviteModal(false)} type="center">
        <View style={styles.inviteModalContent}>
          <View style={[styles.inviteIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Gift size={40} color={colors.primary} />
          </View>
          <Text style={[styles.inviteTitle, { color: colors.textPrimary }]}>
            Invite & Earn ₦2,000
          </Text>
          <Text style={[styles.inviteText, { color: colors.textSecondary }]}>
            Share your unique referral code with family and neighbors. When they complete their
            first home service booking, you get ₦2,000 credited to your KENDIBO wallet!
          </Text>

          <View style={[styles.referralCodeBox, { borderColor: colors.primary }]}>
            <Text style={[styles.referralCodeText, { color: colors.primary }]}>
              KENDIBO-CHIDI24
            </Text>
            <Pressable onPress={handleCopyReferral} style={styles.copyButton}>
              {copiedCode ? (
                <Check size={18} color={colors.success} />
              ) : (
                <Copy size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>
          {copiedCode && (
            <Text style={[styles.copiedToast, { color: colors.success }]}>
              Code copied to clipboard!
            </Text>
          )}

          <Button
            title="Close"
            variant="primary"
            size="md"
            onPress={() => setShowInviteModal(false)}
            style={styles.modalCloseBtn}
          />
        </View>
      </Modal>

      <Modal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        type="bottomSheet"
        title="Help & Support"
      >
        <View style={styles.helpModalContent}>
          <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>
            Q: How do warranties work?
          </Text>
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            Every verified KENDIBO service carries a statutory 14-day quality guarantee. If an
            issue returns, submit a warranty claim for a free technician inspection.
          </Text>

          <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>
            Q: What payment methods are supported?
          </Text>
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            We support Nigerian debit cards (Mastercard, Visa, Verve), dynamic virtual bank
            transfers via Bachs, USSD, and KENDIBO wallet balances.
          </Text>

          <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>
            Q: Need emergency assistance?
          </Text>
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            Call operations at +234 800 KENDIBO (0800 536 3426) or chat customer support.
          </Text>

          <Button
            title="Done"
            variant="outline"
            size="md"
            onPress={() => setShowHelpModal(false)}
            style={styles.modalCloseBtn}
          />
        </View>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        type="bottomSheet"
        title="Privacy Policy & NDPR"
      >
        <View style={styles.helpModalContent}>
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            KENDIBO complies strictly with the Nigeria Data Protection Regulation (NDPR 2023). Your
            personal data, home addresses, gate codes, and financial tokens are encrypted using
            AES-256 and never sold to third-party advertisers.
          </Text>
          <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
            All service providers undergo National Identity Number (NIN) verification and criminal
            background checks prior to onboarding.
          </Text>
          <Button
            title="Accept & Close"
            variant="primary"
            size="md"
            onPress={() => setShowPrivacyModal(false)}
            style={styles.modalCloseBtn}
          />
        </View>
      </Modal>

      <Modal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} type="bottomSheet" title="Logout">
        <View style={styles.logoutModalContent}>
          <Text style={[styles.logoutModalMessage, { color: colors.textPrimary }]}>
            Are you sure you want to log out?
          </Text>
          <View style={styles.logoutModalButtons}>
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmLogout}
            >
              <Text style={styles.confirmBtnText}>Yes, Logout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  menuList: {
    gap: 2,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuIcon: {
    width: 28,
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  valueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  valueText: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  versionText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  languageModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  languageOptionText: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  inviteModalContent: {
    alignItems: 'center',
    padding: spacing.md,
  },
  inviteIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  inviteTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  inviteText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    width: '100%',
    marginBottom: spacing.xs,
  },
  referralCodeText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
  },
  copyButton: {
    padding: spacing.xs,
  },
  copiedToast: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    marginBottom: spacing.md,
  },
  modalCloseBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
  helpModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: fonts.bold,
    marginTop: spacing.xs,
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  logoutModalContent: {
    paddingVertical: spacing.sm,
  },
  logoutModalMessage: {
    fontSize: 17,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
