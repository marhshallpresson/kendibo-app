import { useEffect, useRef } from 'react';
import { watchup } from '../services/watchup';

/** Screen trace: route name + visible duration. Call at the top of a screen. */
export function useWatchupScreen(route: string): void {
  const start = useRef<number>(0);
  useEffect(() => {
    start.current = Date.now();
    return () => {
      try {
        watchup.traceScreen(route, Date.now() - start.current, 'ok');
      } catch {
        /* fail open */
      }
    };
  }, [route]);
}
