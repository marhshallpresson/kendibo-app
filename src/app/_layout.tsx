import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Brand fonts are bundled natively in assets/fonts (no device fonts, no
// runtime downloads). Borscha (display) is licensed with no app file —
// Nunito ExtraBold/Black stand in (see fonts.display token).
import { queryClient } from '../services/queryClient';
import {
  ThemeProvider,
  useAppTheme,
  ThemeContext,
  ThemeContextType,
} from '../constants/ThemeContext';
import { useStartupPermissions } from '../hooks/useStartupPermissions';
import { registerForPushAsync } from '../services/push';
import { initWatchup, watchup } from '../services/watchup';
import { NetworkBanner } from '../components/ui/NetworkBanner';
import { WatchupErrorBoundary } from '../components/WatchupErrorBoundary';
import { WebDownloadModal } from '../components/WebDownloadModal';

export { ThemeContext, useAppTheme };
export type { ThemeContextType };

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular: require('../../assets/fonts/Nunito_400Regular.ttf'),
    Nunito_600SemiBold: require('../../assets/fonts/Nunito_600SemiBold.ttf'),
    Nunito_700Bold: require('../../assets/fonts/Nunito_700Bold.ttf'),
    Nunito_800ExtraBold: require('../../assets/fonts/Nunito_800ExtraBold.ttf'),
    Nunito_900Black: require('../../assets/fonts/Nunito_900Black.ttf'),
  });
  const { requestAll } = useStartupPermissions();

  const { useAuthStore } = require('../stores/authStore');
  const hydrated = useAuthStore((s: any) => s.hydrated);

  // Restore the persisted session once per boot (in-flight coalesced in the
  // store). Redirects wait on `hydrated` so a reload lands on the session —
  // lock screen, tabs or login — instead of onboarding.
  useEffect(() => {
    useAuthStore.getState().hydrate().catch(() => {});
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !hydrated) return;
    SplashScreen.hideAsync().catch(() => {});
    // WatchUp first: global crash handler + offline-durable telemetry queue.
    initWatchup();
    watchup.track('app.opened', {});
    // All launch permissions (notifications, location, camera, contacts,
    // photos) are requested once here, non-blocking.
    requestAll();
    // Push token registration is fire-and-forget alongside permissions.
    // No backend upload yet — token is persisted locally (secure-store)
    // and logged. Expo Go / denied permission resolves null.
    registerForPushAsync().catch(() => {});
  }, [fontsLoaded, requestAll, hydrated]);

  // Hook up inactivity timer
  const { useInactivity } = require('../hooks/useInactivity');
  useInactivity();

  const isLocked = useAuthStore((s: any) => s.isLocked);
  const { PinLockScreen } = require('../components/PinLockScreen');

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WatchupErrorBoundary screen="RootLayout">
          <View style={Platform.OS === 'web' ? { flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', backgroundColor: '#fff', boxShadow: '0 0 20px rgba(0,0,0,0.1)' } : { flex: 1 }}>
<NetworkBanner />
            {isLocked && <PinLockScreen />}
            <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
            {Platform.OS === 'web' && <WebDownloadModal />}
          </View>
          </WatchupErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}





