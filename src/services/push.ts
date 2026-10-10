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
 * - uploadStoredPushToken() sends it to POST /v1/devices once a user
 *   session exists (called from the auth store after login/hydrate)
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
    console.log('[push] FCM push token stored:', pushToken);
    return pushToken;
  } catch (e) {
    console.log('[push] registerForPushAsync failed — returning null', e);
    return null;
  }
}

/**
 * Uploads the locally stored FCM token to POST /v1/devices so the backend
 * channel router can target this device. Best-effort: requires a stored token
 * and a logged-in user; failures are swallowed (never breaks boot/login).
 */
export async function uploadStoredPushToken(): Promise<void> {
  try {
    const token = await getStoredPushToken();
    if (!token) return;
    const { useAuthStore } = require('../stores/authStore') as typeof import('../stores/authStore');
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { apiFetch } = require('./api/client') as typeof import('./api/client');
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await apiFetch('/v1/devices', {
      method: 'POST',
      body: { userId, platform, pushToken: token, channel: ANDROID_CHANNEL },
    });
    console.log('[push] token uploaded to backend for user', userId);
  } catch (e) {
    console.log('[push] token upload failed (best-effort)', e);
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

