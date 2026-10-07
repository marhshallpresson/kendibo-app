import { apiFetch } from './client';

export const providerApi = {
  onboard: async (userId: string): Promise<{ id: string }> => {
    const res = await apiFetch<{ data: { id: string } }>(`/v1/provider/onboarding`, {
      method: 'POST',
      body: { userId },
    });
    return res.data;
  },
  submitKyc: async (providerId: string, kycData: any): Promise<any> => {
    const res = await apiFetch<{ data: any }>(`/v1/provider/kyc`, {
      method: 'POST',
      body: { providerId, ...kycData },
    });
    return res.data;
  },
  getEarnings: async (providerId: string): Promise<any> => {
    const res = await apiFetch<{ data: any }>(`/v1/provider/earnings?providerId=${providerId}`);
    return res.data;
  },
};
