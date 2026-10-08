import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled image map — every static visual in the app resolves from
 * `assets/images/` (offline-first, zero network, no hotlink risk).
 * Metro requires static `require()` calls, so all images are registered
 * here once and imported by reference elsewhere. Remote URLs must NOT
 * be used for bundled content (map tiles excepted — those are a service).
 */
export const IMAGES = {
  avatar1: require('../../assets/images/avatar-1.jpg'),
  avatar2: require('../../assets/images/avatar-2.jpg'),
  avatar3: require('../../assets/images/avatar-3.jpg'),
  avatar4: require('../../assets/images/avatar-4.jpg'),
  avatar5: require('../../assets/images/avatar-5.jpg'),
  avatar6: require('../../assets/images/avatar-6.jpg'),
  cleaningHero: require('../../assets/images/cleaning-hero.jpg'),
  cleaningSupplies: require('../../assets/images/cleaning-supplies.jpg'),
  disinfection: require('../../assets/images/disinfection.jpg'),
  bathroom: require('../../assets/images/bathroom.jpg'),
  livingRoom: require('../../assets/images/living-room.jpg'),
  homeExterior: require('../../assets/images/home-exterior.jpg'),
  electricalWork: require('../../assets/images/electrical-work.jpg'),
  electrician: require('../../assets/images/electrician.jpg'),
  handyman: require('../../assets/images/handyman.jpg'),
  painting: require('../../assets/images/painting.jpg'),
  plumbing: require('../../assets/images/plumbing.jpg'),
  appliance: require('../../assets/images/appliance.jpg'),
  reviewPhoto: require('../../assets/images/review-photo.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export const AVATARS = [
  IMAGES.avatar1,
  IMAGES.avatar2,
  IMAGES.avatar3,
  IMAGES.avatar4,
  IMAGES.avatar5,
  IMAGES.avatar6,
] as const;

/** Deterministic avatar for an id (stable per user/provider). */
export function avatarFor(id: string | number): ImageSourcePropType {
  const s = String(id);
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export type ImageKey = keyof typeof IMAGES;

const URL_TO_KEY: Array<[RegExp, ImageKey]> = [
  [/1581578731548-c64695cc6952/, 'cleaningHero'],
  [/1528740561666-dc2479dc08ab/, 'cleaningSupplies'],
  [/1584820927498-cfe5211fd8bf/, 'disinfection'],
  [/1555041469-a586c61ea9bc/, 'livingRoom'],
  [/1600585154340-be6161a56a0c/, 'homeExterior'],
  [/1607472586893-edb57bdc0e39/, 'plumbing'],
  [/1621905251189-08b45d6a269e/, 'electrician'],
  [/1621905252507-b35492cc74b4/, 'electricalWork'],
  [/1513836279014-a89f7a76ae86/, 'painting'],
  [/1584622650111-993a426fbf0a/, 'bathroom'],
  [/1589939705384-5185137a7f0f/, 'appliance'],
  [/1504307651254-35680f356dfd/, 'handyman'],
  [/1507003211169-0a1dd7228f2d/, 'avatar1'],
  [/1500648767791-00dcc994a43e/, 'avatar2'],
  [/1573496359142-b8d87734a5a2/, 'avatar3'],
  [/1506794778202-cad84cf45f1d/, 'avatar4'],
  [/1534528741775-53994a69daeb/, 'avatar5'],
  [/1535713875002-d1d0cf377fde/, 'avatar6'],
  [/1544717305-2782549b5136/, 'reviewPhoto'],
];

/** blob: URIs are session-only and break after reload (ERR_FILE_NOT_FOUND). */
function isDeadUri(ref?: string | null): boolean {
  return !!ref && ref.startsWith('blob:');
}

/** Resolve anything image-ish to an <Image> source: bundled first, remote fallback. */
export function resolveImage(ref?: string | number | null): ImageSourcePropType {
  if (typeof ref === 'number') return ref;
  if (!ref || isDeadUri(ref)) return IMAGES.cleaningHero;
  if (ref in IMAGES) return IMAGES[ref as ImageKey];
  for (const [re, key] of URL_TO_KEY) {
    if (re.test(ref)) return IMAGES[key];
  }
  // Local device files (camera/gallery picks), data URIs, and any other
  // remote URL pass straight through to <Image>.
  return { uri: ref };
}

/** All bundled keys (for galleries / seeding). */
export const IMAGE_KEYS = Object.keys(IMAGES) as ImageKey[];

/** Remote/asset avatar URL wins; bundled default otherwise (never hotlink). */
export function avatarSource(url?: string | null): ImageSourcePropType {
  return url && !isDeadUri(url) ? { uri: url } : IMAGES.avatar1;
}

/** Server service image wins; bundled default otherwise (never hotlink). */
export function serviceImageSource(url?: string | null): ImageSourcePropType {
  return url ? resolveImage(url) : IMAGES.cleaningHero;
}
