import { apiFetch } from './client';

export interface KycSubmitPayload {
  nin?: string;
  bvn?: string;
  businessName?: string;
  skills?: string[];
  bank?: {
    accountNumber: string;
    bankCode: string;
    bankName?: string;
    accountName?: string;
  };
  location?: { lat: number; lng: number };
}

export const providerApi = {
  /** Submit KYC onboarding data (session-scoped — the caller's provider row is used). */
  submitKyc: async (payload: KycSubmitPayload): Promise<{ status: string }> =>
    apiFetch('/v1/provider/kyc', { method: 'POST', body: payload }),
};
