import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled image pack (assets/images) — every image the app renders.
 * No remote image URLs: the app works fully offline and never depends on
 * third-party CDNs at render time. Photos are Unsplash-licensed
 * (free commercial use), downloaded once at build time.
 *
 * Data layers store KEYS (e.g. 'cleaningHero'); live API payloads may still
 * carry remote URLs — resolveImage() handles both, plus numeric requires.
 */
export const IMAGES = {
  cleaningHero: require('../../assets/images/cleaning-hero.jpg'),
  cleaningSupplies: require('../../assets/images/cleaning-supplies.jpg'),
  disinfection: require('../../assets/images/disinfection.jpg'),
  livingRoom: require('../../assets/images/living-room.jpg'),
  homeExterior: require('../../assets/images/home-exterior.jpg'),
  plumbing: require('../../assets/images/plumbing.jpg'),
  electrician: require('../../assets/images/electrician.jpg'),
  electricalWork: require('../../assets/images/electrical-work.jpg'),
  painting: require('../../assets/images/painting.jpg'),
  bathroom: require('../../assets/images/bathroom.jpg'),
  appliance: require('../../assets/images/appliance.jpg'),
  handyman: require('../../assets/images/handyman.jpg'),
  avatar1: require('../../assets/images/avatar-1.jpg'),
  avatar2: require('../../assets/images/avatar-2.jpg'),
  avatar3: require('../../assets/images/avatar-3.jpg'),
  avatar4: require('../../assets/images/avatar-4.jpg'),
  avatar5: require('../../assets/images/avatar-5.jpg'),
  avatar6: require('../../assets/images/avatar-6.jpg'),
  reviewPhoto: require('../../assets/images/review-photo.jpg'),
} as const;

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

/** Resolve anything image-ish to an <Image> source: bundled first, remote fallback. */
export function resolveImage(ref?: string | number | null): ImageSourcePropType {
  if (typeof ref === 'number') return ref;
  if (!ref) return IMAGES.cleaningHero;
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
