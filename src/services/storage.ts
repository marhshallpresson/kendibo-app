import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Single persistence boundary for the live session and device-local auth
 * flags (onboarding, PIN, biometrics).
 *
 * - Native: expo-secure-store (Keystore / Keychain backed).
 * - Web: expo-secure-store is unsupported and throws, which used to leave the
 *   session in memory only — a reload lost the login. Web therefore falls
 *   back to AsyncStorage (localStorage-backed), which is already a dependency.
 *
 * Reads/writes never throw: a storage failure degrades to "value missing"
 * rather than breaking boot.
 */
const WEB_STORE_KEYS = new Set([
  'kendibo_access',
  'kendibo_refresh',
  'kendibo_user',
  'kendibo_onboarding',
  'kendibo_pin',
  'kendibo_biometrics',
]);

function isWebSafe(key: string): boolean {
  return WEB_STORE_KEYS.has(key);
}

export async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (!isWebSafe(key)) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return (await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (!isWebSafe(key)) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* non-fatal */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* non-fatal */
  }
}

export async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (!isWebSafe(key)) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* non-fatal */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* non-fatal */
  }
}
