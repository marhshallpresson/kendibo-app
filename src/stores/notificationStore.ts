import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationKind = 'booking' | 'promo' | 'chat' | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  route?: string;
  params?: Record<string, string>;
  read: boolean;
  createdAt: number;
}

export interface NotificationPrefs {
  order: boolean;
  chat: boolean;
  maint: boolean;
  promo: boolean;
  cashback: boolean;
  push: boolean;
  sms: boolean;
  wa: boolean;
  email: boolean;
  tips: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  order: true,
  chat: true,
  maint: false,
  promo: true,
  cashback: false,
  push: true,
  sms: false,
  wa: true,
  email: false,
  tips: false,
};

interface NotificationState {
  items: AppNotification[];
  prefs: NotificationPrefs;
  lastAddedAt: number;
  seeded: boolean;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  ensureSeeded: () => void;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
  unreadCount: () => number;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      prefs: DEFAULT_PREFS,
      lastAddedAt: 0,
      seeded: false,

      addNotification: (n) => {
        // Respect user gates: booking→order, promo→promo, chat→chat.
        const { prefs } = get();
        if (n.kind === 'booking' && !prefs.order) return false;
        if (n.kind === 'promo' && !prefs.promo) return false;
        if (n.kind === 'chat' && !prefs.chat) return false;
        const item: AppNotification = {
          ...n,
          id: `n_${Date.now()}_${counter++}`,
          read: false,
          createdAt: Date.now(),
        };
        set((s) => ({
          items: [item, ...s.items].slice(0, 100),
          seeded: true,
          lastAddedAt: Date.now(),
        }));
        return true;
      },

      markRead: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),

      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),

      // No demo seeds — notifications come from live events only.
      ensureSeeded: () => set((s) => (s.seeded ? s : { seeded: true })),

      removeNotification: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      setPref: (key, value) => set((s) => ({ prefs: { ...s.prefs, [key]: value } })),

      unreadCount: () => get().items.filter((i) => !i.read).length,
    }),
    {
      name: 'KENDIBO_NOTIFICATIONS',
      version: 1,
      // v1: strip legacy demo seed notifications on upgrade.
      migrate: (persisted) => {
        const p = persisted as { items?: AppNotification[] } | undefined;
        if (!p) return p as never;
        return {
          ...p,
          items: (p.items ?? []).filter((i) => !String(i.id).startsWith('seed-')),
        };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items, prefs: s.prefs, seeded: s.seeded }),
    }
  )
);

export function timeAgo(ts: number): string {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
