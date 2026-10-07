import { apiFetch } from './client';

export interface JobOffer {
  id: string;
  jobId: string;
  providerId: string;
  status: 'offered' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

export const jobApi = {
  getOffers: async (providerId: string): Promise<JobOffer[]> => {
    const res = await apiFetch<{ data: JobOffer[] }>(`/v1/provider/offers?providerId=${providerId}`);
    return res.data;
  },
  respondToOffer: async (offerId: string, accept: boolean): Promise<JobOffer> => {
    const res = await apiFetch<{ data: JobOffer }>(`/v1/provider/offers/${offerId}/respond`, {
      method: 'POST',
      body: { accept },
    });
    return res.data;
  },
  transitionState: async (jobId: string, toStatus: string): Promise<any> => {
    const res = await apiFetch<{ data: any }>(`/v1/jobs/${jobId}/transition`, {
      method: 'POST',
      body: { to: toStatus },
    });
    return res.data;
  },
};
