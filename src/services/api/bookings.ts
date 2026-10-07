import { apiFetch } from './client';

export const bookingApi = {
  getMyBookings: async (): Promise<any[]> => {
    const res = await apiFetch<{ data: { items: any[] } }>(`/v1/bookings`);
    return res.data.items;
  },
  getBookingTimeline: async (bookingId: string): Promise<any> => {
    const res = await apiFetch<{ data: any }>(`/v1/bookings/${bookingId}/timeline`);
    return res.data;
  },
  confirmCompletion: async (bookingId: string): Promise<any> => {
    const res = await apiFetch<{ data: any }>(`/v1/bookings/${bookingId}/confirm`, { method: 'POST' });
    return res.data;
  },
};
