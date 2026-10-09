import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

/** Sentinel thrown when the user dismisses the Google popup — callers exit silently. */
export const GOOGLE_CANCELLED = 'GOOGLE_CANCELLED';

/**
 * Shared Google sign-in for every auth entry point (login, register,
 * onboarding). Runs the expo-auth-session idToken popup, then hands the token
 * to authStore.loginWithGoogle (POST /v1/auth/google).
 */
export function useGoogleAuth() {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const googleConfigured =
    Platform.OS === 'android'
      ? Boolean(GOOGLE_ANDROID_CLIENT_ID)
      : Platform.OS === 'ios'
        ? Boolean(GOOGLE_IOS_CLIENT_ID)
        : Boolean(GOOGLE_WEB_CLIENT_ID);

  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || 'dummy-client-id-for-web',
    iosClientId: GOOGLE_IOS_CLIENT_ID || 'dummy-client-id-for-ios',
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || 'dummy-client-id-for-android',
  });

  const signIn = async (): Promise<{ user: User; isNew: boolean }> => {
    if (!googleConfigured) throw new Error('Google sign-in is not set up yet');
    const response = await promptAsync();
    if (response?.type !== 'success') throw new Error(GOOGLE_CANCELLED);
    const idToken =
      (response.params as { id_token?: string } | undefined)?.id_token ?? '';
    if (!idToken) throw new Error('Google sign-in failed. Try again.');
    return loginWithGoogle(idToken);
  };

  return { googleConfigured, signIn };
}
