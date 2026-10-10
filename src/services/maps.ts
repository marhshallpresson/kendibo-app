import Constants from 'expo-constants';

/**
 * Map placement (single decision point):
 * - Mapbox is used wherever a token is configured (EXPO_PUBLIC_MAPBOX_TOKEN).
 * - No token -> map screens render their fallback views; web always uses
 *   OpenStreetMap/Leaflet tiles. The app never breaks for missing config.
 * - Expo Go has no Mapbox native code: Mapbox renders only in dev-client
 *   / production builds (isExpoGo() === false).
 */
export function mapboxToken(): string {
  return process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
}

export function isMapboxEnabled(): boolean {
  return mapboxToken().length > 0;
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** Mapbox raster style URL for web Leaflet tiles (token embedded). */
export function mapboxWebTileUrl(): string {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken()}`;
}

export const MAPBOX_ATTRIBUTION =
  '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/">OSM</a>';
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/">OSM</a>';
