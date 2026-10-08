import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

const LOCK_KEY = 'kendibo_pin_lock_until';
const ATTEMPTS_KEY = 'kendibo_pin_attempts';
export const MAX_PIN_ATTEMPTS = 3;
export const LOCKOUT_MS = 5 * 60 * 1000;

/**
 * Shared transaction-PIN failure policy (wrong PIN, failed attempts, lockout).
 * Lockout timestamp survives app restarts via SecureStore.
 */
export async function recordPinFailure(): Promise<{ remaining: number; lockedUntil: number }> {
  let attempts = 0;
  try {
    attempts = Number((await SecureStore.getItemAsync(ATTEMPTS_KEY)) ?? 0) + 1;
    await SecureStore.setItemAsync(ATTEMPTS_KEY, String(attempts));
  } catch {
    /* memory-only fallback */
  }
  const remaining = Math.max(0, MAX_PIN_ATTEMPTS - attempts);
  let lockedUntil = 0;
  if (remaining <= 0) {
    lockedUntil = Date.now() + LOCKOUT_MS;
    try {
      await SecureStore.setItemAsync(LOCK_KEY, String(lockedUntil));
    } catch {
      /* ignore */
    }
  }
  return { remaining, lockedUntil };
}

export async function resetPinAttempts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
    await SecureStore.deleteItemAsync(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

export async function pinLockRemainingMs(): Promise<number> {
  try {
    const until = Number((await SecureStore.getItemAsync(LOCK_KEY)) ?? 0);
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

/**
 * Offline transaction guard — call before pay/book/topup. Money actions must
 * never start ambiguous work on an unstable network: blocked with a clear
 * dialog instead of a raw failure, and nothing is charged.
 */
export async function requireOnline(action: string): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable !== false) return true;
  } catch {
    /* treat as offline */
  }
  Alert.alert(
    'No internet connection',
    `${action} was not started — nothing was charged. Reconnect and try again; your details are saved.`,
    [{ text: 'OK' }],
  );
  return false;
}

/** Failed-transaction explainer (webhook is truth: pending != charged). */
export function failedTransactionAlert(reference: string, retry: () => void): void {
  Alert.alert(
    'Payment not completed',
    `Reference ${reference}.\nNothing was charged. If money left your account, it will reverse automatically or appear after verification.`,
    [{ text: 'Retry', onPress: retry }, { text: 'Close', style: 'cancel' }],
  );
}
