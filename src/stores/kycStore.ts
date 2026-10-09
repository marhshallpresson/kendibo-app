import { create } from 'zustand';

interface KYCState {
  basicInfo: {
    businessName: string;
    contactPhone: string;
    email: string;
  };
  services: string[];
  documents: {
    idFrontUri?: string;
    idBackUri?: string;
    selfieUri?: string;
  };
  location: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  payout: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };

  setBasicInfo: (info: Partial<KYCState['basicInfo']>) => void;
  setServices: (services: string[]) => void;
  setDocuments: (docs: Partial<KYCState['documents']>) => void;
  setLocation: (loc: Partial<KYCState['location']>) => void;
  setPayout: (payout: Partial<KYCState['payout']>) => void;
  resetKYC: () => void;
}

const initialState = {
  basicInfo: {
    businessName: '',
    contactPhone: '',
    email: '',
  },
  services: [],
  documents: {},
  location: {
    latitude: 0,
    longitude: 0,
    radiusKm: 10,
  },
  payout: {
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
  },
};

export const useKycStore = create<KYCState>((set) => ({
  ...initialState,

  setBasicInfo: (info) =>
    set((state) => ({ basicInfo: { ...state.basicInfo, ...info } })),
    
  setServices: (services) => set({ services }),
  
  setDocuments: (docs) =>
    set((state) => ({ documents: { ...state.documents, ...docs } })),
    
  setLocation: (loc) =>
    set((state) => ({ location: { ...state.location, ...loc } })),
    
  setPayout: (payout) =>
    set((state) => ({ payout: { ...state.payout, ...payout } })),

  resetKYC: () => set(initialState),
}));
