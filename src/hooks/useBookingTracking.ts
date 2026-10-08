import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from '../services/api/client';

export interface TrackingLocation {
  lat: number;
  lng: number;
  at: string | null;
}

export interface TrackingDestination {
  lat: number;
  lng: number;
  label: string | null;
}

export interface TrackingProvider {
  id: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
}

export interface BookingTracking {
  status: string;
  provider: TrackingProvider | null;
  location: TrackingLocation | null;
  destination: TrackingDestination | null;
  etaMinutes: number | null;
  distanceKm: number | null;
}

export interface MatchCandidate {
  providerId: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  rateKobo: number;
  offered: boolean;
  declined: boolean;
}

export interface MatchCandidatesResponse {
  slaExhausted: boolean;
  candidates: MatchCandidate[];
}

export interface PickProviderInput {
  providerId: string;
}

export interface PickProviderResponse {
  offerId: string;
  status: string;
}

export function useBookingTracking(
  bookingId: string,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  return useQuery({
    queryKey: ['bookingTracking', bookingId],
    enabled: Boolean(bookingId) && hydrated && isAuthenticated && enabled,
    queryFn: async () => {
      const data = await apiFetch<BookingTracking>(`/v1/bookings/${encodeURIComponent(bookingId)}/tracking`);
      return data;
    },
    refetchInterval: (query) => {
      const status = String(query.state.data?.status ?? '').toUpperCase();
      const pollingStatuses = ['EN_ROUTE', 'IN_PROGRESS', 'PROVIDER_ACCEPTED'];
      return pollingStatuses.includes(status) ? 10000 : false;
    },
  });
}

export function useMatchCandidates(
  bookingId: string,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  return useQuery({
    queryKey: ['matchCandidates', bookingId],
    enabled: Boolean(bookingId) && hydrated && isAuthenticated && enabled,
    queryFn: async () => {
      const data = await apiFetch<MatchCandidatesResponse>(
        `/v1/bookings/${encodeURIComponent(bookingId)}/match/candidates`
      );
      return data;
    },
    refetchInterval: 8000,
  });
}

export function usePickProvider(bookingId: string) {
  return useMutation({
    mutationFn: async ({ providerId }: PickProviderInput) => {
      const data = await apiFetch<PickProviderResponse>(
        `/v1/bookings/${encodeURIComponent(bookingId)}/match/pick`,
        {
          method: 'POST',
          body: { providerId },
        }
      );
      return data;
    },
  });
}
