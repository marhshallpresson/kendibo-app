import { create } from 'zustand';
import { Address } from '../types';

export interface LocationState {
  currentAddress: Address | null;
  selectedCity: string;
  savedAddresses: Address[];

  // Actions
  setAddress: (address: Address | null) => void;
  setSelectedCity: (city: string) => void;
  addSavedAddress: (address: Address) => void;
  removeSavedAddress: (addressId: string) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentAddress: null,
  // Neutral until real GPS/coverage/reverse-geocode determines a city.
  selectedCity: '',
  savedAddresses: [],

  setAddress: (address) => {
    set({
      currentAddress: address,
      selectedCity: address?.city || get().selectedCity,
    });
  },

  setSelectedCity: (city) => {
    set({ selectedCity: city });
  },

  addSavedAddress: (address) => {
    const existing = get().savedAddresses.filter((a) => a.id !== address.id);
    const updated = [address, ...existing];
    set({
      savedAddresses: updated,
      currentAddress: address.isDefault ? address : get().currentAddress,
    });
  },

  removeSavedAddress: (addressId) => {
    const updated = get().savedAddresses.filter((a) => a.id !== addressId);
    set({
      savedAddresses: updated,
      currentAddress:
        get().currentAddress?.id === addressId
          ? updated[0] || null
          : get().currentAddress,
    });
  },
}));
