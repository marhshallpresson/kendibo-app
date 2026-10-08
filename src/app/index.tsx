import React, { useEffect } from 'react';
import { API_BASE_URL } from '../constants/config';
import { watchup } from '../services/watchup';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores';

export default function EntryRedirect() {
  useEffect(() => {
    fetch(`${API_BASE_URL}/v1/config/flags`)
      .then(res => res.json())
      .then(flags => {
        // try { watchup.setContext({ live_flags: flags }); } catch {}
      })
      .catch(() => {});
  }, []);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  // Wait for the persisted session to be restored — otherwise a reload
  // redirects to the splash/onboarding path before auth state exists.
  if (!hydrated) return null;


  if (isAuthenticated) {
    if (user?.role?.toLowerCase() === 'provider') {
      return <Redirect href="/(provider)" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/splash" />;
}
