import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

type NotificationsModule = typeof import('expo-notifications');
let mod: NotificationsModule | null | undefined;
function N(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  try { const C = require('expo-constants'); if (C.default?.appOwnership === 'expo' || C.appOwnership === 'expo') { mod = null; } else { mod = require('expo-notifications') as NotificationsModule; } } catch { mod = null; }
  return mod;
}

const PUSH_TOKEN_KEY = 'kendibo_push_token';
const ANDROID_CHANNEL = 'kendibo-jobs';

/**
 * Push registration (Android) — lazy-requires expo-notifications so
 * Expo Go doesn't crash on static import (same try/require pattern
 * as src/services/permissions.ts).
 *
 * - requests notification permission
 * - creates the high-importance Android job channel
 * - gets the FCM push token, persists it in expo-secure-store
 *   under 'kendibo_push_token', and returns it
 * - does NOT upload the token anywhere (no backend push endpoint yet —
 *   token is only logged)
 * - Expo Go / missing FCM config / denied permission: returns null
 */
export async function registerForPushAsync(): Promise<string | null> {
  // Web push needs a VAPID key (notification.vapidPublicKey in app.json),
  // which is not configured — skip on web to avoid console errors.
  if (Platform.OS === 'web') {
    console.log('[push] web push not configured (no VAPID key) — skipping');
    return null;
  }
  const notifications = N();
  if (!notifications) {
    console.log('[push] expo-notifications unavailable (Expo Go?) — skipping');
    return null;
  }
  try {
    if (Platform.OS === 'android') {
      try {
        await notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
          name: 'Job updates',
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch {
        /* channel setup is best-effort */
      }
    }

    const cur = await notifications.getPermissionsAsync();
    if (!cur.granted) {
      if (cur.canAskAgain === false) {
        console.log('[push] notification permission blocked — skipping token fetch');
        return null;
      }
      const req = await notifications.requestPermissionsAsync();
      if (!req.granted) {
        console.log('[push] notification permission denied — skipping token fetch');
        return null;
      }
    }

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId;
    const pushToken = (await notifications.getDevicePushTokenAsync()).data;

    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, pushToken);
    // No backend push endpoint yet — log only, do not upload.
    console.log('[push] FCM push token (stored locally, not uploaded):', pushToken);
    return pushToken;
  } catch (e) {
    console.log('[push] registerForPushAsync failed — returning null', e);
    return null;
  }
}

/** Read the locally persisted push token (null if never registered). */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Best-effort local cleanup on logout — no backend call. */
export async function clearStoredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    /* best-effort */
  }
}

