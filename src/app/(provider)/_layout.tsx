import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { LayoutDashboard, Calendar, Store, CircleDollarSign } from 'lucide-react-native';
import { useAppTheme } from '../_layout';

import { GeofenceGuard } from '@/components/GeofenceGuard';
import { useAuthStore } from '@/stores/authStore';

export default function ProviderLayout() {
  const { colors } = useAppTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = useAuthStore((s) => s.user?.role);

  // Route guard: only provider accounts live in this group. Customers (and
  // logged-out deep links) bounce back to their own stack.
  if (hydrated && (!isAuthenticated || role?.toLowerCase() !== 'provider')) {
    return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/splash'} />;
  }

  return (
    <GeofenceGuard>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="storefront"
        options={{
          title: 'Storefront',
          tabBarIcon: ({ color, size }) => (
            <Store color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <CircleDollarSign color={color} size={size} />
          ),
        }}
      />
    </Tabs>
    </GeofenceGuard>
  );
}
