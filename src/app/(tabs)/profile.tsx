import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Bell,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Wallet,
} from '@/components/ui/icons';
import { useAppTheme } from '../_layout';
import { spacing, fonts } from '../../constants/theme';
import { useAuthStore } from '../../stores';
import { useWalletStore } from '../../stores/walletStore';
import { formatKoboToNaira } from '../../utils/currency';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const isBiometricEnabled = useAuthStore((state) => state.isBiometricEnabled);
  const balanceKobo = useWalletStore((state) => state.balanceKobo);
  const refreshWallet = useWalletStore((state) => state.refresh);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const userName = user?.name || 'Hi there, Welcome';
  const userEmail = user?.email || 'Sign in';

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
        <Pressable
          onPress={() => router.navigate('/settings')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <MoreHorizontal size={22} color={colors.textPrimary} />
        </Pressable>
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
            onPress: () => router.push('/settings/edit-profile'),
          })}
          {renderRow({
            icon: <Bell size={22} color={colors.textPrimary} />,
            label: 'Notification',
            onPress: () => router.push('/settings/notifications'),
          })}
          {renderRow({
            icon: <Wallet size={22} color={colors.primary} />,
            label: 'Kendibo Wallet',
            right: (
              <View style={styles.walletRight}>
                <Text style={[styles.walletBalance, { color: colors.primary }]}>
                  {formatKoboToNaira(balanceKobo)}
                </Text>
                <ChevronRight size={20} color={colors.textPrimary} />
              </View>
            ),
            onPress: () => router.push('/wallet'),
          })}
          {renderRow({
            icon: <CreditCard size={22} color={colors.textPrimary} />,
            label: 'Payment',
            onPress: () =>
              Alert.alert('Payment Methods', 'Pay with your Kendibo Wallet balance, or debit card / bank transfer via Bachs.'),
          })}
          {renderRow({
            icon: <ShieldCheck size={22} color={colors.textPrimary} />,
            label: 'Security',
            onPress: () => router.push('/settings/security'),
          })}
        </View>

        <Text style={[styles.bioHint, { color: colors.textMuted }]}>
          {isBiometricEnabled ? 'Biometric sign-in is enabled' : 'Biometric sign-in is disabled'}
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  bioHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  walletRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  walletBalance: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
});
