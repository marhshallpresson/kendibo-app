import { create } from 'zustand';

export type OnDemandUrgency = 'emergency' | 'today' | 'this_week';

export interface OnDemandState {
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  photoUrls: string[];
  urgency: OnDemandUrgency;
  addressId: string | null;
  scheduledDate: string | null;
  timeWindow: string | null;
  requestId: string | null;

  setCategory: (id: string, name: string) => void;
  setDescription: (description: string, photoUrls: string[]) => void;
  setUrgency: (urgency: OnDemandUrgency) => void;
  setAddress: (addressId: string) => void;
  setWindow: (scheduledDate: string, timeWindow: string) => void;
  setRequestId: (requestId: string) => void;
  reset: () => void;
}

const initial = {
  categoryId: null,
  categoryName: null,
  description: '',
  photoUrls: [] as string[],
  urgency: 'this_week' as OnDemandUrgency,
  addressId: null,
  scheduledDate: null,
  timeWindow: null,
  requestId: null,
};

export const useOnDemandStore = create<OnDemandState>((set) => ({
  ...initial,

  setCategory: (id, name) => set({ categoryId: id, categoryName: name }),
  setDescription: (description, photoUrls) => set({ description, photoUrls }),
  setUrgency: (urgency) => set({ urgency }),
  setAddress: (addressId) => set({ addressId }),
  setWindow: (scheduledDate, timeWindow) => set({ scheduledDate, timeWindow }),
  setRequestId: (requestId) => set({ requestId }),
  reset: () => set({ ...initial }),
}));
