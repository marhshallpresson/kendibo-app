import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores';

export default function EntryRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isAuthenticated) {
    if (user?.role === 'provider') {
      return <Redirect href="/(provider)" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/splash" />;
}
