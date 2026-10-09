import { create } from 'zustand';
import { Address, GeoCoordinates } from '../types';

/** Real coordinates only — (0,0) means "no fix yet", never a city default. */
function isRealCoord(c?: GeoCoordinates | null): c is GeoCoordinates {
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.latitude) <= 90 &&
    Math.abs(c.longitude) <= 180 &&
    !(c.latitude === 0 && c.longitude === 0)
  );
}

export interface LocationState {
  currentAddress: Address | null;
  /** Last verified coordinates (device GPS or coverage check) shared by booking/geo flows. */
  currentCoordinates: GeoCoordinates | null;
  selectedCity: string;
  savedAddresses: Address[];

  // Actions
  setAddress: (address: Address | null) => void;
  setCoordinates: (coordinates: GeoCoordinates | null) => void;
  setSelectedCity: (city: string) => void;
  addSavedAddress: (address: Address) => void;
  removeSavedAddress: (addressId: string) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentAddress: null,
  currentCoordinates: null,
  // Neutral until real GPS/coverage/reverse-geocode determines a city.
  selectedCity: '',
  savedAddresses: [],

  setAddress: (address) => {
    set((state) => ({
      currentAddress: address,
      selectedCity: address?.city || state.selectedCity,
      currentCoordinates: isRealCoord(address?.coordinates)
        ? address.coordinates
        : state.currentCoordinates,
    }));
  },

  setCoordinates: (coordinates) => {
    set({ currentCoordinates: isRealCoord(coordinates) ? coordinates : null });
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
