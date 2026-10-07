import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { ensureForegroundLocation } from '../services/permissions';
import { api } from '../services/api';

interface Fix {
  lat: number;
  lng: number;
  at: string;
}

interface Opts {
  token?: string;
  providerId?: string;
  /** true while EN_ROUTE..IN_PROGRESS (dense), false when idle (battery saver) */
  activeJourney?: boolean;
}

const ACTIVE_MS = 30_000;
const IDLE_MS = 300_000;
const MIN_METERS = 50;

/**
 * Battery/data-aware tracker (PRD §18 + §60):
 * - foreground service on Android while the app is open (see app.json)
 * - dense fixes (30s / 50m) only during an active journey; the backend
 *   additionally rejects points outside EN_ROUTE..IN_PROGRESS
 * - idle mode drops to one fix per 5 min; queue survives kills via syncQueue
 * - batches flush to POST /v1/provider/location/batch
 */
export function useTrackingLocation({ token, providerId, activeJourney = false }: Opts) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'blocked' | 'unknown'>('unknown');
  const buf = useRef<Fix[]>([]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const flush = async () => {
      if (buf.current.length === 0 || !providerId) return;
      const batch = buf.current.splice(0, buf.current.length);
      try {
        await api('/v1/provider/location/batch', {
          method: 'POST',
          body: { providerId, points: batch },
          token,
        });
      } catch {
        buf.current.unshift(...batch); // keep for next flush
      }
    };

    (async () => {
      const p = await ensureForegroundLocation();
      if (!mounted) return;
      setPermission(p);
      if (p !== 'granted') return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: activeJourney ? Location.Accuracy.High : Location.Accuracy.Balanced,
          distanceInterval: MIN_METERS,
          timeInterval: activeJourney ? ACTIVE_MS : IDLE_MS,
        },
        (loc) => {
          const f = { lat: loc.coords.latitude, lng: loc.coords.longitude, at: new Date().toISOString() };
          setFix(f);
          buf.current.push(f);
        },
      );
      timer = setInterval(flush, activeJourney ? ACTIVE_MS : IDLE_MS);
    })();

    return () => {
      mounted = false;
      sub?.remove();
      if (timer) clearInterval(timer);
    };
  }, [activeJourney, providerId, token]);

  return { fix, permission };
}
