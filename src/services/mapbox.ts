import { Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { mapboxToken } from './maps';

let initialized = false;

/**
 * Native-only Mapbox bootstrap. Returns true when a token is configured and
 * the SDK is usable. Web screens use the Leaflet variants instead.
 */
export function initMapbox(): boolean {
  if (Platform.OS === 'web') return false;
  const token = mapboxToken();
  if (!token) return false;
  if (!initialized) {
    Mapbox.setAccessToken(token);
    initialized = true;
  }
  return true;
}

/** Approximate circle polygon (GeoJSON) for radius overlays — meters. */
export function circlePolygon(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = (dy / earthRadius) * (180 / Math.PI);
    const dLng = (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export { Mapbox };
