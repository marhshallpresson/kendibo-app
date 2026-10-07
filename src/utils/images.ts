import * as ImagePicker from 'expo-image-picker';
import { ensureCamera, ensurePhotos } from '../services/permissions';

export interface EvidencePick {
  uri: string;
  mime: string;
  width: number;
  height: number;
}

/**
 * Compressed evidence capture (PRD §48: compression + metadata mandatory).
 * - quality 0.6 keeps a 12MP photo under ~400KB for weak networks (§60)
 * - exif stripped client-side (privacy §43); server re-validates magic
 *   bytes + SHA-256 in the quarantine pipeline before promotion
 */
export async function pickEvidence(source: 'camera' | 'library'): Promise<EvidencePick | null> {
  const perm = source === 'camera' ? await ensureCamera() : await ensurePhotos();
  if (perm !== 'granted') return null;
  const base = { quality: 0.6, exif: false as const, allowsMultipleSelection: false as const };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(base)
      : await ImagePicker.launchImageLibraryAsync({ ...base, mediaTypes: ImagePicker.MediaTypeOptions.Images });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType ?? 'image/jpeg', width: a.width, height: a.height };
}

export async function uriToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('ENCODE_FAILED'));
    r.readAsDataURL(blob);
  });
}
