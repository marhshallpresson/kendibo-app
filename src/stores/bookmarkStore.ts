import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookmarkState {
  savedServiceIds: string[];

  toggleBookmark: (serviceId: string) => void;
  isBookmarked: (serviceId: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      savedServiceIds: [],

      toggleBookmark: (serviceId) => {
        const current = get().savedServiceIds;
        const next = current.includes(serviceId)
          ? current.filter((id) => id !== serviceId)
          : [...current, serviceId];
        set({ savedServiceIds: next });
      },

      isBookmarked: (serviceId) => get().savedServiceIds.includes(serviceId),
    }),
    {
      name: 'kendibo_bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
