import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export type PermState = 'granted' | 'denied' | 'blocked';

type NotificationsModule = typeof import('expo-notifications');
let mod: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  try { const Constants = require('expo-constants'); if (Constants.default?.appOwnership === 'expo' || Constants.appOwnership === 'expo') { mod = null; } else { mod = require('expo-notifications') as NotificationsModule; } } catch { mod = null; }
  return mod;
}

function toState(granted: boolean, canAskAgain: boolean | undefined): PermState {
  if (granted) return 'granted';
  return canAskAgain === false ? 'blocked' : 'denied';
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

/**
 * FOREGROUND location — requested in context (address picker, home feed,
 * provider online toggle). Never at cold start: keeps startup ≤3s (NFR-003)
 * and complies with Play policy (in-context request + feature rationale UI).
 */
export async function ensureForegroundLocation(): Promise<PermState> {
  const cur = await Location.getForegroundPermissionsAsync();
  if (cur.granted) return 'granted';
  if (!cur.canAskAgain) return 'blocked';
  const req = await Location.requestForegroundPermissionsAsync();
  return toState(req.granted, req.canAskAgain);
}

/**
 * BACKGROUND location — provider role only, requested AFTER foreground is
 * granted (Android 11+ enforces the two-step flow) and only when the
 * provider toggles online. Feeds backend journey-gated tracking
 * (POST /v1/provider/location/batch); server drops points outside an
 * active EN_ROUTE..IN_PROGRESS journey.
 */
export async function ensureBackgroundLocation(): Promise<PermState> {
  const fg = await ensureForegroundLocation();
  if (fg !== 'granted') return fg;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return 'denied';
  const cur = await Location.getBackgroundPermissionsAsync();
  if (cur.granted) return 'granted';
  if (!cur.canAskAgain) return 'blocked';
  const req = await Location.requestBackgroundPermissionsAsync();
  return toState(req.granted, req.canAskAgain);
}

/** Camera — requested from evidence capture / inspection screens only. */
export async function ensureCamera(): Promise<PermState> {
  const cur = await Camera.getCameraPermissionsAsync();
  if (cur.granted) return 'granted';
  if (!cur.canAskAgain) return 'blocked';
  const req = await Camera.requestCameraPermissionsAsync();
  return toState(req.granted, req.canAskAgain);
}

/**
 * Notifications — Android 13+ (API 33) requires runtime POST_NOTIFICATIONS;
 * expo-notifications handles the version gate internally. Requested after
 * first booking intent (user) / onboarding (provider), never at launch.
 * Blocked users get a Settings deep-link via openAppSettings().
 */
export async function ensureNotifications(): Promise<PermState> {
  if (Platform.OS !== 'android') return 'granted';
  const N = notifications();
  if (!N) return 'denied'; // Expo Go stub (SDK 53+): push unavailable
  const cur = await N.getPermissionsAsync();
  if (cur.granted) return 'granted';
  if (!cur.canAskAgain) return 'blocked';
  const req = await N.requestPermissionsAsync();
  return toState(req.granted, req.canAskAgain);
}

/** Photo library — evidence upload / review photos / avatar. */
export async function ensurePhotos(): Promise<PermState> {
  const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (cur.granted) return 'granted';
  if (!cur.canAskAgain) return 'blocked';
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return toState(req.granted, req.canAskAgain);
}

