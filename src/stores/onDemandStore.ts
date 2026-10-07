import { create } from 'zustand';

export interface OnDemandState {
  serviceId: string | null;
  serviceNotes: string;
  urgency: 'standard' | 'asap';
  addressId: string | null;
  scheduledAt: string | null;
  contactConfirmed: boolean;
  
  setService: (id: string, notes: string) => void;
  setUrgencyAndAddress: (urgency: 'standard' | 'asap', addressId: string) => void;
  setSchedule: (scheduledAt: string) => void;
  confirmContact: () => void;
  reset: () => void;
}

export const useOnDemandStore = create<OnDemandState>((set) => ({
  serviceId: null,
  serviceNotes: '',
  urgency: 'standard',
  addressId: null,
  scheduledAt: null,
  contactConfirmed: false,

  setService: (id, notes) => set({ serviceId: id, serviceNotes: notes }),
  setUrgencyAndAddress: (urgency, addressId) => set({ urgency, addressId }),
  setSchedule: (scheduledAt) => set({ scheduledAt }),
  confirmContact: () => set({ contactConfirmed: true }),
  reset: () => set({ serviceId: null, serviceNotes: '', urgency: 'standard', addressId: null, scheduledAt: null, contactConfirmed: false }),
}));
