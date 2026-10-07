import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores';

export default function EntryRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/splash" />;
}
