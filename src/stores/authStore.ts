import { create } from 'zustand';
import { User } from '../types';
import { apiFetch, ApiError, ACCESS_KEY, REFRESH_KEY } from '../services/api/client';
import { storageGet, storageSet, storageRemove } from '../services/storage';

export type OtpChannel = 'phone' | 'email';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  pin: string | null;
  isBiometricEnabled: boolean;
  hasCompletedOnboarding: boolean;
  isLocked: boolean;
  /** True once the persisted session has been restored (or cleared) on boot. */
  hydrated: boolean;

  // Actions (export names preserved)
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  setPin: (pin: string) => void;
  lockApp: () => void;
  unlockApp: (pin: string) => boolean;
  /** Biometric success path: clears the lock without a PIN match. */
  unlock: () => void;
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
  /** Google SSO: POST /v1/auth/google {idToken} → persists session. Returns isNew flag. */
  loginWithGoogle: (idToken: string) => Promise<{ user: User; isNew: boolean }>;
  /** Persist the post-signup role choice (POST /v1/auth/role) and update the stored user. */
  setRole: (role: 'customer' | 'provider') => Promise<'CUSTOMER' | 'PROVIDER'>;
  /** Restore session on boot: loads tokens → GET /v1/me; 401 clears locally.
   *  Always ends by setting `hydrated: true`, and starts the app LOCKED when
   *  a device PIN exists. Safe to call more than once (runs once). */
  hydrate: () => Promise<void>;
}

const USER_KEY = 'kendibo_user';
const ONBOARDING_KEY = 'kendibo_onboarding';
const PIN_KEY = 'kendibo_pin';
const BIOMETRICS_KEY = 'kendibo_biometrics';

function mapServerUser(raw: any, fallbackIdentity: string, fallbackName?: string): User {
  const phone = String(raw?.phone ?? (fallbackIdentity.includes('@') ? '' : fallbackIdentity));
  const email = String(raw?.email ?? (fallbackIdentity.includes('@') ? fallbackIdentity : ''));
  const name =
    String(raw?.name ?? fallbackName ?? email.split('@')[0] ?? phone ?? 'Kendibo User') ||
    'Kendibo User';
  const role = raw?.role ? String(raw.role).toLowerCase() : undefined;
  return {
    id: String(raw?.id ?? ''),
    name,
    nickname: raw?.nickname,
    dob: raw?.dob,
    email,
    phone,
    avatarUrl: raw?.avatarUrl,
    role: role as any,
    hasPin: Boolean(raw?.hasPin),
    isBiometricEnabled: Boolean(raw?.biometric ?? raw?.isBiometricEnabled),
    createdAt: raw?.createdAt ?? raw?.created_at,
    updatedAt: raw?.updatedAt ?? raw?.updated_at,
  };
}

async function persistSession(access: string, refresh: string, user: User): Promise<void> {
  await storageSet(ACCESS_KEY, access);
  if (refresh) await storageSet(REFRESH_KEY, refresh);
  await storageSet(USER_KEY, JSON.stringify(user));
}

/**
 * Post-login side effects — both fire-and-forget (never block/throw the auth
 * flow). Push token upload targets POST /v1/devices so the notification
 * channel router can reach this device. The in-app welcome row seeds the
 * notification inbox for freshly-created accounts.
 */
function afterLoginSideEffects(isNew: boolean, name?: string): void {
  void (async () => {
    try {
      const { uploadStoredPushToken } = await import('../services/push');
      await uploadStoredPushToken();
    } catch {
      /* best-effort */
    }
    if (isNew) {
      try {
        const { useNotificationStore } = await import('./notificationStore');
        useNotificationStore.getState().addNotification({
          kind: 'system',
          title: 'Welcome to KENDIBO 👋',
          body: `Hi ${(name || 'there').split(' ')[0]} — your account is ready. Book a trusted professional in under 60 seconds.`,
          route: '/(tabs)',
        });
      } catch {
        /* best-effort */
      }
    }
  })();
}

async function clearPersistedSession(): Promise<void> {
  // Onboarding stays completed — only the session is torn down.
  for (const key of [ACCESS_KEY, REFRESH_KEY, USER_KEY, PIN_KEY, BIOMETRICS_KEY]) {
    await storageRemove(key);
  }
}

/** Coalesces concurrent boot calls so hydrate() runs exactly once. */
let hydrateInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  pin: null,
  isBiometricEnabled: false,
  hasCompletedOnboarding: false,
  isLocked: false,
  hydrated: false,

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
      isLocked: false,
    });
  },

  setPin: (pin: string) => {
    // PIN stays device-local by design — never sent to the backend.
    const currentUser = get().user;
    storageSet(PIN_KEY, pin);
    set({
      pin,
      user: currentUser ? { ...currentUser, hasPin: true } : null,
    });
  },

  lockApp: () => { if (get().isAuthenticated && get().pin) set({ isLocked: true }); },

  unlockApp: (pinInput) => { if (get().pin && pinInput === get().pin) { set({ isLocked: false }); return true; } return false; },

  unlock: () => { if (get().isAuthenticated) set({ isLocked: false }); },

  enableBiometrics: (enabled = true) => {
    const currentUser = get().user;
    if (enabled) storageSet(BIOMETRICS_KEY, '1');
    else storageRemove(BIOMETRICS_KEY);
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
      storageSet(USER_KEY, JSON.stringify(next));
    }
  },

  /** Persist profile to backend PATCH /v1/me (optimistic local update first). */
  saveProfile: async (partial: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const next = { ...currentUser, ...partial };
      set({ user: next });
      storageSet(USER_KEY, JSON.stringify(next));
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
      const mapped = mapServerUser(saved, (saved as User)?.email || (saved as User)?.phone || (get().user?.email || get().user?.phone || ''), (saved as User)?.name);
      const merged = { ...(get().user ?? {}), ...mapped } as User;
      // mapServerUser always emits a role key (possibly undefined) — never let
      // a PATCH response without role wipe a provider back to customer.
      if (!merged.role && get().user?.role) merged.role = get().user!.role;
      set({ user: merged });
      storageSet(USER_KEY, JSON.stringify(merged));
      return merged;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw err;
    }
  },

  setOnboardingCompleted: (completed: boolean) => {
    if (completed) storageSet(ONBOARDING_KEY, '1');
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
        isNew?: boolean;
      }>('/v1/auth/otp/verify', {
        method: 'POST',
        body: { channel, identity: id, code: c, name: name?.trim(), role },
        auth: false,
      });
      if (!data?.access || !data?.user) throw new Error('Invalid verification response.');
      const user = mapServerUser(data.user, id, name?.trim());
      // The backend persists role at verify, but never let a missing echo drop
      // a freshly-registered provider into the customer tabs.
      if (!user.role && role) {
        const r = String(role).toLowerCase();
        if (r === 'provider' || r === 'customer') user.role = r as User['role'];
      }
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
      afterLoginSideEffects(Boolean(data.isNew), user.name);
      return user;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      if (err instanceof Error) throw err;
      throw new Error('Verification failed. Try again.');
    }
  },

  loginWithGoogle: async (idToken: string) => {
    const token = idToken.trim();
    if (!token) throw new Error('Google sign-in failed. Try again.');
    try {
      const data = await apiFetch<{
        user: any;
        access: string;
        refresh: string;
        deviceId?: string;
        isNew?: boolean;
      }>('/v1/auth/google', {
        method: 'POST',
        body: { idToken: token },
        auth: false,
      });
      if (!data?.access || !data?.user) throw new Error('Google sign-in failed. Try again.');
      const fallbackIdentity = String(data.user?.email ?? '');
      const user = mapServerUser(data.user, fallbackIdentity, data.user?.name);
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
        watchup.track('auth.google_verified', { isNew: Boolean(data.isNew) });
      } catch {
        /* ignore */
      }
      afterLoginSideEffects(Boolean(data.isNew), user.name);
      return { user, isNew: Boolean(data.isNew) };
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      if (err instanceof Error) throw err;
      throw new Error('Google sign-in failed. Try again.');
    }
  },

  setRole: async (role: 'customer' | 'provider') => {
    try {
      const data = await apiFetch<{ role: string }>('/v1/auth/role', {
        method: 'POST',
        body: { role },
      });
      const normalized = (data?.role ?? role.toUpperCase()) as 'CUSTOMER' | 'PROVIDER';
      const current = get().user;
      if (current) {
        const merged = { ...current, role: normalized.toLowerCase() as User['role'] };
        set({ user: merged });
        try {
          await storageSet(USER_KEY, JSON.stringify(merged));
        } catch {
          /* best-effort persist */
        }
      }
      return normalized;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      if (err instanceof Error) throw err;
      throw new Error('Could not save your role. Try again.');
    }
  },

  hydrate: async () => {
    // Runs exactly once — a second call while booting waits on the first.
    if (get().hydrated) return;
    if (hydrateInFlight) return hydrateInFlight;
    hydrateInFlight = (async () => {
      // 1. Device-local flags first: prevents an onboarding flash and lets the
      //    lock decision be made before the network answers.
      const [access, onboardingFlag, pinValue, bioFlag] = await Promise.all([
        storageGet(ACCESS_KEY),
        storageGet(ONBOARDING_KEY),
        storageGet(PIN_KEY),
        storageGet(BIOMETRICS_KEY),
      ]);
      const cachedUser = await readCachedUser();

      const baseFlags: BootFlags = {
        hasCompletedOnboarding: onboardingFlag === '1',
        pin: pinValue,
        isBiometricEnabled: bioFlag === '1',
      };

      // Fire-and-forget: (re)register this device's push token on every boot
      // so the backend can reach it (no-op when signed out / never registered).
      if (access) afterLoginSideEffects(false);

      if (!access) {
        set({ ...baseFlags, user: null, token: null, isAuthenticated: false, isLocked: false });
        return;
      }

      if (cachedUser) {
        // Instant restore: render behind the lock screen, verify below.
        set({
          ...baseFlags,
          hasCompletedOnboarding: true,
          user: cachedUser,
          token: access,
          isAuthenticated: true,
          isLocked: Boolean(pinValue),
        });
        await validateSession(access, baseFlags, cachedUser);
        return;
      }

      // No cached profile (first boot on a new device): we have nothing
      // meaningful to render until the backend answers, so wait for it.
      try {
        const user = await fetchMe(access, null);
        set({
          ...baseFlags,
          hasCompletedOnboarding: true,
          user,
          token: access,
          isAuthenticated: true,
          isLocked: Boolean(pinValue),
        });
        watchupIdentify(user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearPersistedSession();
          set({
            ...baseFlags,
            pin: null,
            isBiometricEnabled: false,
            user: null,
            token: null,
            isAuthenticated: false,
            isLocked: false,
          });
        } else {
          // Offline with no cache → treat as signed out (login, not onboarding).
          set({ ...baseFlags, user: null, token: null, isAuthenticated: false, isLocked: false });
        }
      }
    })().finally(() => {
      hydrateInFlight = null;
      set({ hydrated: true });
    });
    return hydrateInFlight;
  },
}));

/** Device-local flags read during boot, replayed by the background validator. */
type BootFlags = {
  hasCompletedOnboarding: boolean;
  pin: string | null;
  isBiometricEnabled: boolean;
};

/**
 * Validate the restored access token against /v1/me without blocking boot.
 * `apiFetch` already auto-refreshes once on 401, so a 401 here means the
 * refresh was rejected too: the session is genuinely over.
 */
async function validateSession(access: string, flags: BootFlags, cachedUser: User): Promise<void> {
  try {
    const user = await fetchMe(access, cachedUser);
    await storageSet(USER_KEY, JSON.stringify(user));
    useAuthStore.setState({
      ...flags,
      hasCompletedOnboarding: true,
      user,
      token: access,
      isAuthenticated: true,
      isLocked: Boolean(flags.pin),
    });
    watchupIdentify(user);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearPersistedSession();
      useAuthStore.setState({
        ...flags,
        pin: null,
        isBiometricEnabled: false,
        user: null,
        token: null,
        isAuthenticated: false,
        isLocked: false,
      });
      return;
    }
    // Offline / transient: keep the last-known session (still locked).
    useAuthStore.setState({
      ...flags,
      hasCompletedOnboarding: true,
      user: cachedUser,
      token: access,
      isAuthenticated: true,
      isLocked: Boolean(flags.pin),
    });
  }
}

async function fetchMe(access: string, cachedUser: User | null): Promise<User> {
  const me = await apiFetch<any>('/v1/me', { method: 'GET', timeoutMs: 8000 });
  const user = mapServerUser(me, cachedUser?.email || cachedUser?.phone || '', cachedUser?.name);
  // Preserve the friendly name cached at verify-time when the server lacks one.
  if (cachedUser?.name && (!me?.name || me.name === 'Kendibo User')) user.name = cachedUser.name;
  if (cachedUser?.email && !me?.email) user.email = cachedUser.email;
  if (cachedUser?.phone && !me?.phone) user.phone = cachedUser.phone;
  // Preserve role from cached user if /v1/me doesn't return it
  if (!user.role && cachedUser?.role) {
    user.role = cachedUser.role.toLowerCase() as User['role'];
  }
  return user;
}

function watchupIdentify(user: User): void {
  try {
    const { watchup } = require('../services/watchup') as typeof import('../services/watchup');
    watchup.setUser({ id: user.id, email: user.email, name: user.name });
  } catch {
    /* telemetry must never break boot */
  }
}

async function readCachedUser(): Promise<User | null> {
  try {
    const raw = await storageGet(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

