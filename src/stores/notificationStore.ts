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

const SEED: AppNotification[] = [
  {
    id: 'seed-enroute',
    kind: 'booking',
    title: 'Technician is on the way',
    body: 'Babatunde is nearby and will arrive in ~15 minutes for KB-8821.',
    route: '/tracking/job_kb_8821',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 18,
  },
  {
    id: 'seed-promo',
    kind: 'promo',
    title: '30% off your first deep clean',
    body: 'Use code KENDIBO30 at checkout. Valid this week in Uyo.',
    route: '/search',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: 'seed-system',
    kind: 'system',
    title: 'Welcome to Kendibo',
    body: 'Verified cleaners, plumbers and more — booked in minutes.',
    read: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
  },
];

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
        set((s) => {
          const seeded = s.seeded ? s.items : [...SEED, ...s.items];
          return { items: [item, ...seeded].slice(0, 100), seeded: true, lastAddedAt: Date.now() };
        });
        return true;
      },

      markRead: (id) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),

      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),

      ensureSeeded: () =>
        set((s) => (s.seeded ? s : { items: [...SEED, ...s.items], seeded: true })),

      removeNotification: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      setPref: (key, value) => set((s) => ({ prefs: { ...s.prefs, [key]: value } })),

      unreadCount: () => get().items.filter((i) => !i.read).length,
    }),
    {
      name: 'KENDIBO_NOTIFICATIONS',
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
