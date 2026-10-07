import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  ensureForegroundLocation,
  ensureCamera,
  ensureNotifications,
  ensurePhotos,
  type PermState,
} from '../services/permissions';

export type StartupPermissionStatus = Record<string, boolean>;

/**
 * Cold-start permission pass — CHECK-ONLY (no prompts), so splash stays
 * under the 3s budget (NFR-003). Prompts fire in-context per feature via
 * src/services/permissions.ts (location on address/track, camera on
 * evidence, notifications on first booking/provider-online).
 * `requestAll` is kept for the splash screen and now routes through the
 * rationale-aware helpers (blocked states surface a Settings deep-link).
 */
export function useStartupPermissions() {
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<StartupPermissionStatus>({});

  const toBool = (s: PermState): boolean => s === 'granted';

  const requestAll = useCallback(async () => {
    if (done) return status;
    const next: StartupPermissionStatus = {};
    const tasks: Array<Promise<void>> = [
      (async () => {
        if (Platform.OS === 'android') next.notifications = toBool(await ensureNotifications());
        else next.notifications = true;
      })(),
      (async () => {
        next.location = toBool(await ensureForegroundLocation());
      })(),
      (async () => {
        next.camera = toBool(await ensureCamera());
      })(),
      (async () => {
        try {
          const ContactsMod = await import('expo-contacts');
          const cur = await ContactsMod.getPermissionsAsync();
          next.contacts = cur.granted
            ? true
            : (await ContactsMod.requestPermissionsAsync()).granted;
        } catch {
          next.contacts = false;
        }
      })(),
      (async () => {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        next.photos = status === 'granted' ? true : toBool(await ensurePhotos());
      })(),
      (async () => {
        const fg = await Location.getForegroundPermissionsAsync();
        next.backgroundLocation =
          Platform.OS === 'android' ? fg.granted && (await Location.getBackgroundPermissionsAsync()).granted : false;
      })(),
    ];
    await Promise.allSettled(tasks);
    setStatus(next);
    setDone(true);
    return next;
  }, [done, status]);

  /** Non-prompting snapshot for conditional UI (e.g. show rationale first). */
  const checkOnly = useCallback(async () => {
    const [loc, cam, photos] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Camera.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
    ]);
    const next = {
      location: loc.granted,
      camera: cam.granted,
      photos: photos.granted,
    };
    setStatus(next);
    setDone(true);
    return next;
  }, []);

  return { requestAll, checkOnly, done, status };
}
