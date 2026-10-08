import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, Pressable } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore, OtpChannel } from '../stores/authStore';
import { useAppTheme } from '../app/_layout';
import { Button } from './ui/Button';
import { fonts, radii, spacing } from '../constants/theme';

/**
 * Full-screen overlay rendered above the router stack while `isLocked`.
 *
 * Because it sits on top of navigation, every recovery step runs inside the
 * overlay instead of pushing a screen: PIN → (Forgot Pin?) identify → code →
 * new PIN. Fingerprint/Face ID auto-prompts once when the user enabled it and
 * silently falls back to the keypad.
 */
type Step = 'pin' | 'identify' | 'code' | 'new-pin';

const OTP_LENGTH = 6;

export function PinLockScreen() {
  const { colors } = useAppTheme();
  const unlockApp = useAuthStore((s) => s.unlockApp);
  const unlock = useAuthStore((s) => s.unlock);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const setPin = useAuthStore((s) => s.setPin);

  const [step, setStep] = useState<Step>('pin');
  const [pin, setPinInput] = useState('');
  const [error, setError] = useState(false);

  // Forgot-Pin state
  const [channel, setChannel] = useState<OtpChannel>('phone');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const bioPrompted = useRef(false);

  // --- Fingerprint / Face ID: one auto-prompt, then the keypad. ---
  useEffect(() => {
    if (bioPrompted.current || !isBiometricEnabled) return;
    if (Platform.OS === 'web') return;
    bioPrompted.current = true;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) return;
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Kendibo',
          disableDeviceFallback: false,
        });
        if (res.success) unlock();
      } catch {
        /* keypad stays available */
      }
    })();
  }, [isBiometricEnabled, unlock]);

  // Resend countdown for the code step.
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleUnlock = () => {
    if (unlockApp(pin)) {
      setError(false);
      setPinInput('');
    } else {
      setError(true);
      setPinInput('');
    }
  };

  const resetFlow = () => {
    setMessage('');
    setOtp('');
    setContact('');
    setNewPin('');
    setConfirmPin('');
    setCountdown(0);
  };

  const handleIdentify = async () => {
    setMessage('');
    const id = contact.trim();
    if (!id) {
      setMessage(`Enter the ${channel === 'email' ? 'email' : 'phone number'} on your account.`);
      return;
    }
    if (channel === 'email' && !id.includes('@')) {
      setMessage('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(channel, id);
      setOtp('');
      setCountdown(60);
      setStep('code');
    } catch (err: any) {
      setMessage(err?.message || 'Could not send the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setMessage('');
    setLoading(true);
    try {
      await requestOtp(channel, contact.trim());
      setOtp('');
      setCountdown(60);
    } catch (err: any) {
      setMessage(err?.message || 'Could not resend the code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setMessage('');
    if (otp.length < OTP_LENGTH) {
      setMessage('Enter the 6-digit code we sent you.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(channel, contact.trim(), otp);
      setStep('new-pin');
    } catch (err: any) {
      setMessage(err?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = () => {
    setMessage('');
    if (newPin.length !== 4) {
      setMessage('Choose a 4-digit PIN.');
      return;
    }
    if (confirmPin !== newPin) {
      setMessage('PINs do not match.');
      return;
    }
    setPin(newPin);
    unlockApp(newPin);
    resetFlow();
    setStep('pin');
  };

  const backToPin = () => {
    resetFlow();
    setStep('pin');
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 99999,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background,
        },
        inner: { width: '100%', maxWidth: 360, alignItems: 'center' },
        title: { fontSize: 24, fontFamily: fonts.bold, marginBottom: 8, textAlign: 'center' },
        subtitle: {
          fontSize: 16,
          fontFamily: fonts.regular,
          marginBottom: 32,
          textAlign: 'center',
          color: colors.textSecondary,
        },
        input: {
          fontSize: 32,
          letterSpacing: 16,
          textAlign: 'center',
          borderWidth: 1,
          borderRadius: radii.md,
          padding: 16,
          width: 200,
          marginBottom: 16,
          borderColor: colors.border,
          color: colors.textPrimary,
        },
        textField: {
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: 14,
          paddingVertical: 14,
          width: '100%',
          marginBottom: 12,
          fontSize: 15,
          fontFamily: fonts.regular,
          borderColor: colors.border,
          color: colors.textPrimary,
        },
        otpRow: { flexDirection: 'row', gap: 8, marginBottom: 14, width: '100%' },
        otpBox: {
          flex: 1,
          aspectRatio: 1,
          maxWidth: 50,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surfaceCard,
          justifyContent: 'center',
          alignItems: 'center',
        },
        otpBoxFilled: { borderColor: colors.primary },
        otpBoxError: { borderColor: colors.error },
        otpDigit: { fontSize: 22, fontFamily: fonts.semiBold, color: colors.textPrimary },
        error: { color: colors.error, marginTop: 8, textAlign: 'center', fontSize: 13 },
        hint: {
          color: colors.textSecondary,
          fontSize: 13,
          textAlign: 'center',
          marginBottom: 14,
        },
        channelRow: {
          flexDirection: 'row',
          backgroundColor: colors.surfaceCard,
          borderRadius: radii.full,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          marginBottom: 14,
          width: '100%',
        },
        channelTab: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          borderRadius: radii.full,
        },
        channelTabActive: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        channelTabText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
        channelTabTextActive: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
        countdown: {
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 12,
          textAlign: 'center',
        },
        stack: { width: '100%' },
        hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {step === 'pin' && (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={styles.subtitle}>Please enter your 4 digit PIN to continue.</Text>

            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              onChangeText={(text) => {
                setPinInput(text);
                if (text.length === 4) {
                  // Auto unlock when 4 digits are entered
                  setTimeout(() => {
                    if (!useAuthStore.getState().unlockApp(text)) {
                      setError(true);
                      setPinInput('');
                    }
                  }, 100);
                }
              }}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            {error && <Text style={styles.error}>Incorrect PIN</Text>}

            <Button title="Unlock" onPress={handleUnlock} style={{ marginTop: 20, width: 200 }} />

            <Button
              title="Forgot Pin?"
              variant="ghost"
              onPress={() => {
                resetFlow();
                setError(false);
                setStep('identify');
              }}
              style={{ marginTop: 20 }}
            />
          </>
        )}

        {step === 'identify' && (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Reset your PIN</Text>
            <Text style={styles.subtitle}>
              Enter the phone number or email on your account and we&apos;ll send you a code.
            </Text>

            <View style={styles.channelRow}>
              {(['phone', 'email'] as OtpChannel[]).map((c) => (
                <Pressable
                  key={c}
                  style={[styles.channelTab, channel === c && styles.channelTabActive]}
                  onPress={() => {
                    setChannel(c);
                    setMessage('');
                  }}
                  accessibilityRole="tab"
                  accessibilityLabel={c === 'phone' ? 'Send via SMS' : 'Send via Email'}
                >
                  <Text style={channel === c ? styles.channelTabTextActive : styles.channelTabText}>
                    {c === 'phone' ? 'SMS' : 'Email'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.textField}
              placeholder={channel === 'phone' ? '08012345678' : 'you@example.com'}
              placeholderTextColor={colors.textSecondary}
              value={contact}
              onChangeText={(t) => {
                setContact(t);
                setMessage('');
              }}
              keyboardType={channel === 'phone' ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <Button
              title="Send code"
              onPress={handleIdentify}
              loading={loading}
              style={{ marginTop: 12, width: '100%' }}
            />
            <Button title="Back" variant="ghost" onPress={backToPin} style={{ marginTop: 12 }} />
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Enter the code</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {contact}</Text>

            <TextInput
              value={otp}
              onChangeText={(t) => {
                setOtp(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
                setMessage('');
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
            />

            <View style={styles.otpRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    otp[i] ? styles.otpBoxFilled : null,
                    message ? styles.otpBoxError : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
                </View>
              ))}
            </View>

            {message ? <Text style={styles.error}>{message}</Text> : null}

            {countdown > 0 ? (
              <Text style={styles.countdown}>Resend code in {countdown}s</Text>
            ) : (
              <Pressable onPress={handleResend} accessibilityRole="button">
                <Text style={[styles.countdown, { color: colors.primary, fontFamily: fonts.bold }]}>
                  Resend code
                </Text>
              </Pressable>
            )}

            <Button
              title="Verify"
              onPress={handleVerifyCode}
              loading={loading}
              disabled={otp.length < OTP_LENGTH}
              style={{ width: '100%' }}
            />
            <Button title="Back" variant="ghost" onPress={() => setStep('identify')} style={{ marginTop: 12 }} />
          </>
        )}

        {step === 'new-pin' && (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create new PIN</Text>
            <Text style={styles.subtitle}>Choose a 4-digit PIN to unlock this device.</Text>

            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={newPin}
              onChangeText={(t) => {
                setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                setMessage('');
              }}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={confirmPin}
              onChangeText={(t) => {
                setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4));
                setMessage('');
              }}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
            />

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <Button
              title="Save PIN & unlock"
              onPress={handleSavePin}
              disabled={newPin.length !== 4 || confirmPin.length !== 4}
              style={{ marginTop: 8, width: '100%' }}
            />
            <Button title="Back" variant="ghost" onPress={() => setStep('code')} style={{ marginTop: 12 }} />
          </>
        )}
      </View>
    </View>
  );
}
