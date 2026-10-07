import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { apiFetch, ApiError, ACCESS_KEY, REFRESH_KEY } from '../services/api/client';

export type OtpChannel = 'phone' | 'email';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  pin: string | null;
  isBiometricEnabled: boolean;
  hasCompletedOnboarding: boolean;

  // Actions (export names preserved)
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  setPin: (pin: string) => void;
  enableBiometrics: (enabled?: boolean) => void;
  updateUser: (partial: Partial<User>) => void;
  /** Persist profile fields to the backend (Fill/Edit Profile). */
  saveProfile: (partial: Partial<User>) => Promise<User>;
  setOnboardingCompleted: (completed: boolean) => void;

  // Live session actions (OTP backend, no mock fallback)
  /** Request a one-time code. Returns backend devCode in dev only. */
  requestOtp: (channel: OtpChannel, identity: string) => Promise<{ devCode?: string }>;
  /** Verify OTP → persists access+refresh+user in SecureStore. Throws on failure. */
  verifyOtp: (channel: OtpChannel, identity: string, code: string, name?: string, role?: string) => Promise<User>;
  /** Restore session on boot: loads tokens → GET /v1/me; 401 clears locally. */
  hydrate: () => Promise<void>;
}

const USER_KEY = 'kendibo_user';

function mapServerUser(raw: any, fallbackIdentity: string, fallbackName?: string): User {
  const phone = String(raw?.phone ?? (fallbackIdentity.includes('@') ? '' : fallbackIdentity));
  const email = String(raw?.email ?? (fallbackIdentity.includes('@') ? fallbackIdentity : ''));
  const name =
    String(raw?.name ?? fallbackName ?? email.split('@')[0] ?? phone ?? 'Kendibo User') ||
    'Kendibo User';
  return {
    id: String(raw?.id ?? ''),
    name,
    nickname: raw?.nickname,
    dob: raw?.dob,
    email,
    phone,
    avatarUrl: raw?.avatarUrl,
    role: raw?.role,
    hasPin: Boolean(raw?.hasPin),
    isBiometricEnabled: Boolean(raw?.biometric ?? raw?.isBiometricEnabled),
    createdAt: raw?.createdAt ?? raw?.created_at,
    updatedAt: raw?.updatedAt ?? raw?.updated_at,
  };
}

async function persistSession(access: string, refresh: string, user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
  } catch {
    /* SecureStore unavailable (e.g. web) — session stays in memory only. */
  }
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  } catch {
    /* non-fatal */
  }
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch {
    /* non-fatal: user refetch via /me covers this */
  }
}

async function clearPersistedSession(): Promise<void> {
  for (const key of [ACCESS_KEY, REFRESH_KEY, USER_KEY]) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* best-effort cleanup */
    }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  pin: null,
  isBiometricEnabled: false,
  hasCompletedOnboarding: false,

  login: (user: User, token = '') => {
    set({
      user,
      token,
      isAuthenticated: true,
      hasCompletedOnboarding: true,
    });
    try {
      const { watchup } = require('../services/watchup') as typeof import('../services/watchup');
      watchup.setUser({ id: user.id, email: user.email, name: user.name });
      watchup.track('auth.login', {});
    } catch {
      /* telemetry must never break login */
    }
  },

  logout: async () => {
    // Best-effort server invalidation; local state clears regardless.
    try {
      await apiFetch('/v1/auth/logout-all', { method: 'POST' });
    } catch {
      /* best-effort */
    }
    await clearPersistedSession();
    try {
      const { watchup } = require('../services/watchup') as typeof import('../services/watchup');
      watchup.setUser(null);
    } catch {
      /* ignore */
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      pin: null,
      isBiometricEnabled: false,
    });
  },

  setPin: (pin: string) => {
    // PIN stays device-local by design — never sent to the backend.
    const currentUser = get().user;
    set({
      pin,
      user: currentUser ? { ...currentUser, hasPin: true } : null,
    });
  },

  enableBiometrics: (enabled = true) => {
    const currentUser = get().user;
    set({
      isBiometricEnabled: enabled,
      user: currentUser ? { ...currentUser, isBiometricEnabled: enabled } : null,
    });
  },

  updateUser: (partial: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const next = { ...currentUser, ...partial };
      set({ user: next });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(next)).catch(() => {});
    }
  },

  /** Persist profile to backend PATCH /v1/me (optimistic local update first). */
  saveProfile: async (partial: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const next = { ...currentUser, ...partial };
      set({ user: next });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(next)).catch(() => {});
    }
    try {
      const saved = await apiFetch<User>('/v1/me', {
        method: 'PATCH',
        body: {
          ...(partial.name !== undefined ? { name: partial.name } : {}),
          ...(partial.nickname !== undefined ? { nickname: partial.nickname } : {}),
          ...(partial.dob !== undefined ? { dob: partial.dob } : {}),
          ...(partial.avatarUrl !== undefined ? { avatarUrl: partial.avatarUrl } : {}),
        },
      });
      const merged = { ...(get().user ?? {}), ...mapServerUser(saved, '', (saved as User)?.name) } as User;
      set({ user: merged });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  },

  setOnboardingCompleted: (completed: boolean) => {
    set({ hasCompletedOnboarding: completed });
  },

  requestOtp: async (channel: OtpChannel, identity: string) => {
    const id = identity.trim();
    if (!id) throw new Error('Enter an email or phone number first.');
    if (channel !== 'phone' && channel !== 'email') throw new Error('Invalid channel.');
    try {
      const data = await apiFetch<{ sent: boolean; devCode?: string }>(
        '/v1/auth/otp/request',
        { method: 'POST', body: { channel, identity: id }, auth: false },
      );
      return { devCode: data?.devCode };
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  },

  verifyOtp: async (channel: OtpChannel, identity: string, code: string, name?: string, role?: string) => {
    const id = identity.trim();
    const c = code.trim();
    if (!id || !c) throw new Error('Enter the verification code sent to you.');
    try {
      const data = await apiFetch<{
        user: any;
        access: string;
        refresh: string;
        deviceId?: string;
      }>('/v1/auth/otp/verify', {
        method: 'POST',
        body: { channel, identity: id, code: c, name: name?.trim(), role },
        auth: false,
      });
      if (!data?.access || !data?.user) throw new Error('Invalid verification response.');
      const user = mapServerUser(data.user, id, name?.trim());
      await persistSession(data.access, data.refresh ?? '', user);
      set({
        user,
        token: data.access,
        isAuthenticated: true,
        hasCompletedOnboarding: true,
      });
      try {
        const { watchup } = require('../services/watchup') as typeof import('../services/watchup');
        watchup.setUser({ id: user.id, email: user.email, name: user.name });
        watchup.track('auth.otp_verified', { channel });
      } catch {
        /* ignore */
      }
      return user;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      if (err instanceof Error) throw err;
      throw new Error('Verification failed. Try again.');
    }
  },

  hydrate: async () => {
    let access: string | null = null;
    let cachedUser: User | null = null;
    try {
      access = await SecureStore.getItemAsync(ACCESS_KEY);
    } catch {
      access = null;
    }
    if (!access) return;
    try {
      cachedUser = await (async () => {
        try {
          const raw = await SecureStore.getItemAsync(USER_KEY);
          return raw ? (JSON.parse(raw) as User) : null;
        } catch {
          return null;
        }
      })();
    } catch {
      cachedUser = null;
    }
    try {
      const me = await apiFetch<any>('/v1/me', { method: 'GET' });
      const user = mapServerUser(me, cachedUser?.email || cachedUser?.phone || '', cachedUser?.name);
      // Preserve friendly name cached at verify-time when server lacks it.
      if (cachedUser?.name && (!me?.name || me.name === 'Kendibo User')) {
        user.name = cachedUser.name;
      }
      if (cachedUser?.email && !me?.email) user.email = cachedUser.email;
      if (cachedUser?.phone && !me?.phone) user.phone = cachedUser.phone;
      try {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      } catch {
        /* ignore */
      }
      set({
        user,
        token: access,
        isAuthenticated: true,
        hasCompletedOnboarding: true,
      });
      try {
        const { watchup } = require('../services/watchup') as typeof import('../services/watchup');
        watchup.setUser({ id: user.id, email: user.email, name: user.name });
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await clearPersistedSession();
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }
      // Offline / transient: keep last-known local session if we have one.
      if (cachedUser) {
        set({ user: cachedUser, token: access, isAuthenticated: true });
      }
    }
  },
}));

