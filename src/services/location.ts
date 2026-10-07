import * as Location from 'expo-location';
import { api } from './api';

let locationSubscription: Location.LocationSubscription | null = null;

export async function requestLocationPermissions() {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return false;
  }
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return bgStatus === 'granted' || fgStatus === 'granted';
}

export async function getCurrentLocation() {
  const hasPerm = await requestLocationPermissions();
  if (!hasPerm) return null;
  return await Location.getCurrentPositionAsync({});
}

export async function startTracking(providerId: string) {
  if (locationSubscription) return; // already tracking

  const hasPerm = await requestLocationPermissions();
  if (!hasPerm) return;

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // update every 10 meters
      timeInterval: 5000,   // or every 5 seconds
    },
    async (loc) => {
      // Symbiotic Integration: push to backend immediately
      try {
        await api('/v1/provider/location', {
          method: 'POST',
          body: {
            providerId,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          }
        });
      } catch (err) {
        console.warn('Failed to sync live location:', err);
      }
    }
  );
}

export function stopTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}
