import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

// Inactivity timeout in milliseconds (e.g., 5 minutes = 5 * 60 * 1000)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export function useInactivity() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only set up inactivity timer if user is authenticated and has a PIN
    const authSub = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated && state.pin && !state.isLocked) {
        resetTimeout();
      } else {
        clearTimeout(timeoutRef.current!);
      }
    });

    const lockApp = () => {
      useAuthStore.getState().lockApp();
    };

    const resetTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const state = useAuthStore.getState();
      // Only start timer if logged in, has a PIN, and not already locked
      if (state.isAuthenticated && state.pin && !state.isLocked) {
        timeoutRef.current = setTimeout(lockApp, INACTIVITY_TIMEOUT);
      }
    };

    if (Platform.OS === 'web') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      const handleActivity = () => {
        resetTimeout();
      };

      events.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      // Initial start
      resetTimeout();

      return () => {
        authSub();
        events.forEach((event) => {
          window.removeEventListener(event, handleActivity);
        });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    } else {
      // For mobile, you might wrap the root view in a PanResponder 
      // but for now, we just initialize the sub
      resetTimeout();
      return () => {
        authSub();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, []);
}
