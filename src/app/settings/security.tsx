import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface LoginSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [isRememberMe, setIsRememberMe] = useState(true);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeSessions, setActiveSessions] = useState<LoginSession[]>([
    {
      id: 'sess_1',
      device: 'Infinix Note 30 Pro (This Device)',
      location: 'Uyo, Akwa Ibom, Nigeria',
      lastActive: 'Active now',
      isCurrent: true,
    },
    {
      id: 'sess_2',
      device: 'Chrome on Windows 11',
      location: 'Lagos, Nigeria',
      lastActive: '2 days ago',
      isCurrent: false,
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdatePin = () => {
    if (currentPin.length !== 4) {
      setPinError('Current PIN must be 4 digits.');
      return;
    }
    if (newPin.length !== 4) {
      setPinError('New PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation PIN do not match.');
      return;
    }

    setPinError('');
    setShowPinModal(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    showToast('Transaction PIN updated successfully!');
  };

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      setPasswordError('Please enter current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordError('');
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password updated successfully!');
  };

  const handleRevokeSession = (sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast('Session revoked successfully.');
  };

  const toggleRow = (
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
    key: string
  ) => (
    <View key={key} style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {toastMessage && (
          <View style={[styles.toastCard, { backgroundColor: colors.primaryLight }]}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={[styles.toastText, { color: colors.primary }]}>{toastMessage}</Text>
          </View>
        )}

        {toggleRow('Remember me', isRememberMe, setIsRememberMe, 'remember')}
        {toggleRow('Face ID', isFaceIdEnabled, setIsFaceIdEnabled, 'face')}
        {toggleRow('Biometric ID', isBiometricEnabled, setIsBiometricEnabled, 'bio')}

        <Pressable
          style={styles.authRow}
          onPress={() => setIsTwoFactorEnabled((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
            Google Authenticator
          </Text>
          <View style={styles.authRight}>
            <Text style={[styles.authState, { color: colors.textSecondary }]}>
              {isTwoFactorEnabled ? 'On' : 'Off'}
            </Text>
            <ChevronRight size={20} color={colors.primary} />
          </View>
        </Pressable>

        <Pressable
          style={[styles.softButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => setShowPinModal(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.softButtonText, { color: colors.primary }]}>Change PIN</Text>
        </Pressable>

        <Pressable
          style={[styles.softButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => setShowPasswordModal(true)}
          accessibilityRole="button"
        >
          <Text style={[styles.softButtonText, { color: colors.primary }]}>Change Password</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Active Sessions
        </Text>
        {activeSessions.map((session) => (
          <View
            key={session.id}
            style={[styles.sessionCard, { backgroundColor: colors.surfaceCard }]}
          >
            <View style={styles.sessionInfo}>
              <View style={styles.sessionNameRow}>
                <Text style={[styles.sessionDevice, { color: colors.textPrimary }]}>
                  {session.device}
                </Text>
                {session.isCurrent && (
                  <Badge label="This Device" variant="success" size="sm" />
                )}
              </View>
              <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
                {session.location} • {session.lastActive}
              </Text>
            </View>
            {!session.isCurrent && (
              <Button
                title="Revoke"
                variant="ghost"
                size="sm"
                fullWidth={false}
                textStyle={{ color: colors.error }}
                onPress={() => handleRevokeSession(session.id)}
              />
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPinError('');
        }}
        type="center"
        title="Change Security PIN"
      >
        <View style={styles.modalFormContent}>
          {pinError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.badgeRedBg }]}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{pinError}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Current 4-Digit PIN
          </Text>
          <TextInput
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            value={currentPin}
            onChangeText={setCurrentPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            style={[
              styles.pinInputField,
              { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>New 4-Digit PIN</Text>
          <TextInput
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            value={newPin}
            onChangeText={setNewPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            style={[
              styles.pinInputField,
              { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Confirm New 4-Digit PIN
          </Text>
          <TextInput
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            style={[
              styles.pinInputField,
              { backgroundColor: colors.inputFill, borderColor: colors.border, color: colors.textPrimary },
            ]}
          />

          <Button
            title="Save New PIN"
            variant="primary"
            size="md"
            onPress={handleUpdatePin}
            style={styles.modalSubmitButton}
          />
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordError('');
        }}
        type="center"
        title="Change Password"
      >
        <View style={styles.modalFormContent}>
          {passwordError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.badgeRedBg }]}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Current Password
          </Text>
          <View
            style={[
              styles.passwordFieldWrapper,
              { backgroundColor: colors.inputFill, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              style={[styles.passwordInput, { color: colors.textPrimary }]}
            />
            <Pressable
              onPress={() => setShowCurrentPassword((prev) => !prev)}
              style={styles.eyeIcon}
            >
              {showCurrentPassword ? (
                <EyeOff size={18} color={colors.textSecondary} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            New Password (min 8 chars)
          </Text>
          <View
            style={[
              styles.passwordFieldWrapper,
              { backgroundColor: colors.inputFill, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              style={[styles.passwordInput, { color: colors.textPrimary }]}
            />
            <Pressable
              onPress={() => setShowNewPassword((prev) => !prev)}
              style={styles.eyeIcon}
            >
              {showNewPassword ? (
                <EyeOff size={18} color={colors.textSecondary} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Confirm New Password
          </Text>
          <View
            style={[
              styles.passwordFieldWrapper,
              { backgroundColor: colors.inputFill, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNewPassword}
              style={[styles.passwordInput, { color: colors.textPrimary }]}
            />
          </View>

          <Button
            title="Update Password"
            variant="primary"
            size="md"
            onPress={handleUpdatePassword}
            style={styles.modalSubmitButton}
          />
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    flex: 1,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
  },
  authRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  authState: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  softButton: {
    paddingVertical: 16,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  softButtonText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionDevice: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  sessionMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  modalFormContent: {
    padding: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  pinInputField: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 22,
    fontFamily: fonts.bold,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: spacing.sm,
  },
  passwordFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  eyeIcon: {
    padding: spacing.sm,
  },
  modalSubmitButton: {
    marginTop: spacing.md,
  },
});
