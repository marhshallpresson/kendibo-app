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

const defaultUyoAddress: Address = {
  id: 'addr-uyo-default',
  userId: 'user-current',
  label: 'Home',
  street: '14 Ewet Housing Estate',
  houseNumber: '14',
  estate: 'Ewet Housing Estate',
  landmark: 'Near Ibom Hall',
  gateInstructions: 'Call host on arrival at the gate',
  contactPhone: '+234 801 234 5678',
  isDefault: true,
  city: 'Uyo',
  state: 'Akwa Ibom',
  coordinates: {
    latitude: 5.0377,
    longitude: 7.9128,
  },
};

export const useLocationStore = create<LocationState>((set, get) => ({
  currentAddress: defaultUyoAddress,
  selectedCity: 'Uyo',
  savedAddresses: [defaultUyoAddress],

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
