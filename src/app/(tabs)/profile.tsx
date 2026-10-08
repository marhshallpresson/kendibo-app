import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Bell,
  CreditCard,
  ShieldCheck,
  Globe,
  Eye,
  FileText,
  HelpCircle,
  Users,
  LogOut,
  ChevronRight,
  MoreHorizontal,
  Pencil,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, fonts } from '../../constants/theme';
import { useAuthStore } from '../../stores';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const isBiometricEnabled = useAuthStore((state) => state.isBiometricEnabled);
  const logout = useAuthStore((state) => state.logout);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const userName = user?.name || 'Andrew Ainsley';
  const userEmail = user?.email || 'andrew_ainsley@yourdomain.com';

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    router.replace('/(auth)/login');
  };

  const renderRow = ({
    icon,
    label,
    right,
    onPress,
    danger,
  }: {
    icon: React.ReactNode;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityRole="button">
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>{icon}</View>
        <Text style={[styles.menuLabel, { color: danger ? colors.error : colors.textPrimary }]}>
          {label}
        </Text>
      </View>
      {right ?? <ChevronRight size={20} color={colors.textPrimary} />}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
        <MoreHorizontal size={22} color={colors.textPrimary} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered identity block */}
        <View style={styles.identityBlock}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {userName.charAt(0)}
              </Text>
            </View>
            <Pressable
              style={[styles.editBadge, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Edit profile photo"
              onPress={() => router.push('/settings/edit-profile')}
            >
              <Pencil size={13} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={[styles.userNameText, { color: colors.textPrimary }]}>
            {userName}
          </Text>
          <Text style={[styles.userEmailText, { color: colors.textPrimary }]}>
            {userEmail}
          </Text>
        </View>

        <View style={[styles.listDivider, { backgroundColor: colors.borderSubtle }]} />

        {/* Menu list */}
        <View style={styles.menuList}>
          {renderRow({
            icon: <User size={22} color={colors.textPrimary} />,
            label: 'Edit Profile',
            onPress: () => router.push('/settings'),
          })}
          {renderRow({
            icon: <Bell size={22} color={colors.textPrimary} />,
            label: 'Notification',
            onPress: () => router.push('/settings/notifications'),
          })}
          {renderRow({
            icon: <CreditCard size={22} color={colors.textPrimary} />,
            label: 'Payment',
            onPress: () =>
              Alert.alert('Payment Methods', 'Debit cards and bank transfer via Bachs are enabled for Nigeria.'),
          })}
          {renderRow({
            icon: <ShieldCheck size={22} color={colors.textPrimary} />,
            label: 'Security',
            onPress: () => router.push('/settings/security'),
          })}
          {renderRow({
            icon: <Globe size={22} color={colors.textPrimary} />,
            label: 'Language',
            right: (
              <View style={styles.valueRight}>
                <Text style={[styles.valueText, { color: colors.textPrimary }]}>
                  English (US)
                </Text>
                <ChevronRight size={20} color={colors.textPrimary} />
              </View>
            ),
            onPress: () => router.push('/settings'),
          })}
          {renderRow({
            icon: <Eye size={22} color={colors.textPrimary} />,
            label: 'Dark Mode',
            right: (
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            ),
            onPress: toggleTheme,
          })}
          {renderRow({
            icon: <FileText size={22} color={colors.textPrimary} />,
            label: 'Privacy Policy',
            onPress: () =>
              Alert.alert('Privacy', 'KENDIBO complies with the Nigeria Data Protection Act (NDPA).'),
          })}
          {renderRow({
            icon: <HelpCircle size={22} color={colors.textPrimary} />,
            label: 'Help Center',
            onPress: () =>
              Alert.alert('Help Center', 'KENDIBO Customer Support is available 24/7 at +234 800 KENDIBO'),
          })}
          {renderRow({
            icon: <Users size={22} color={colors.textPrimary} />,
            label: 'Invite Friends',
            onPress: () =>
              Alert.alert(
                'Referral Program',
                'Share code EMEKA2000 to earn ₦2,000 when your friend books!'
              ),
          })}
          {renderRow({
            icon: <LogOut size={22} color={colors.error} />,
            label: 'Logout',
            danger: true,
            right: <View />,
            onPress: () => setIsLogoutModalOpen(true),
          })}
        </View>

        <Text style={[styles.bioHint, { color: colors.textMuted }]}>
          {isBiometricEnabled ? 'Biometric sign-in is enabled' : 'Biometric sign-in is disabled'}
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Logout confirmation bottom sheet */}
      <Modal
        visible={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        type="bottomSheet"
        title="Logout"
      >
        <View style={styles.modalContentWrap}>
          <Text style={[styles.modalDesc, { color: colors.textPrimary }]}>
            Are you sure you want to log out?
          </Text>

          <View style={styles.modalButtonsRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsLogoutModalOpen(false)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Button
                title="Yes, Logout"
                variant="primary"
                onPress={handleConfirmLogout}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  identityBlock: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 42,
    fontFamily: fonts.display,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 22,
    fontFamily: fonts.display,
  },
  userEmailText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  listDivider: {
    height: 1,
    marginVertical: spacing.md,
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
  bioHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  modalContentWrap: {
    paddingVertical: spacing.sm,
  },
  modalDesc: {
    fontSize: 17,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: 'row',
  },
});
