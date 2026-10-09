import { QueryClient, onlineManager, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiFetch, ApiError } from './api/client';
import { useAuthStore } from '../stores/authStore';
import { JobStatus, Address, Booking, Category, Service, ServiceAddOn } from '../types';

// Setup network status listener for React Query online manager
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

/**
 * Global QueryClient instance configured for offline-first operation
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Never retry auth/permission failures — they need a token refresh
        // (handled in apiFetch) or a re-login, not repeated requests.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
        return failureCount < 2;
      },
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});

/**
 * Offline storage persister backed by AsyncStorage
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'KENDIBO_OFFLINE_CACHE',
});

// ==========================================
// Server → app shape mappers (kobo stays kobo)
// Backend contract: /v1/* with {data}|{error} envelope.
// baseKobo arrives as JSON number or string — always coerced via Number().
// ==========================================

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const o = data as { items?: unknown; addresses?: unknown; bookings?: unknown; services?: unknown; categories?: unknown; txns?: unknown };
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.addresses)) return o.addresses as T[];
    if (Array.isArray(o.bookings)) return o.bookings as T[];
    if (Array.isArray(o.services)) return o.services as T[];
    if (Array.isArray(o.categories)) return o.categories as T[];
  }
  return [];
}

function mapServerCategory(raw: unknown, index = 0): Category {
  if (typeof raw === 'string') {
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `cat_${index}`;
    return {
      id: slug,
      name: raw,
      slug,
      description: '',
      iconName: 'Sparkles',
      serviceCount: undefined,
      sortOrder: index,
      isActive: true,
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    id: String(r?.id ?? r?.slug ?? `cat_${index}`),
    name: String(r?.name ?? r?.title ?? 'Services'),
    slug: String(r?.slug ?? r?.id ?? 'services'),
    description: String(r?.description ?? ''),
    iconName: String(r?.iconName ?? r?.icon ?? 'Sparkles'),
    imageUrl: r?.imageUrl as string | undefined,
    serviceCount: (r?.serviceCount ?? r?.service_count) as number | undefined,
    sortOrder: Number(r?.sortOrder ?? r?.sort_order ?? index),
    isActive: Boolean(r?.isActive ?? r?.is_active ?? true),
  };
}

function mapServerAddOn(raw: unknown, serviceId: string, index = 0): ServiceAddOn {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r?.id ?? `addon_${serviceId}_${index}`),
    serviceId,
    name: String(r?.name ?? r?.title ?? 'Add-on'),
    description: r?.description as string | undefined,
    priceKobo: Number(r?.priceKobo ?? r?.price_kobo ?? 0),
    maxQuantity: Number(r?.maxQuantity ?? r?.max_quantity ?? 1),
  };
}

export function mapServerService(raw: unknown): Service {
  const r = raw as Record<string, unknown>;
  const id = String(r?.id ?? '');
  const category = String(r?.category ?? r?.categoryId ?? r?.categorySlug ?? r?.category_id ?? '');
  const name = String(r?.title ?? r?.name ?? 'Service');
  const imageUrl = String(r?.imageUrl ?? r?.image_url ?? '');
  // Server lacks gallery/provider fields — derive per contract.
  const tagline = (r?.tagline as string | undefined) ?? category;
  const providerName = (r?.providerName ?? r?.provider_name ?? category ?? tagline) as string | undefined;
  const gallery = Array.isArray(r?.gallery)
    ? (r.gallery as unknown[]).map(String)
    : imageUrl
      ? [imageUrl]
      : [];
  const addonsRaw = Array.isArray(r?.addOns)
    ? (r.addOns as unknown[])
    : Array.isArray(r?.addons)
      ? (r.addons as unknown[])
      : [];
  return {
    id,
    categoryId: category,
    name,
    description: String(r?.description ?? ''),
    priceKobo: Number(r?.priceKobo ?? r?.price_kobo ?? r?.baseKobo ?? r?.base_kobo ?? 0),
    durationMinutes: Number(r?.durationMinutes ?? r?.duration_minutes ?? 60),
    rating: Number(r?.rating ?? 0),
    reviewCount: Number(r?.reviews ?? r?.reviewCount ?? r?.review_count ?? 0),
    imageUrl,
    isQuoteBased: Boolean(
      (r?.bookingMode ?? r?.booking_mode) === 'quote' ? true : (r?.isQuoteBased ?? r?.is_quote_based ?? false),
    ),
    addOns: addonsRaw.map((a, i) => mapServerAddOn(a, id, i)),
    tagline: tagline || undefined,
    warrantyDays:
      r?.warrantyDays !== undefined && r?.warrantyDays !== null
        ? Number(r.warrantyDays)
        : (r?.warranty_days !== undefined && r?.warranty_days !== null
            ? Number(r.warranty_days)
            : undefined),
    inclusions: r?.inclusions as string[] | undefined,
    exclusions: r?.exclusions as string[] | undefined,
    faqs: r?.faqs as Array<{ question: string; answer: string }> | undefined,
    isActive: Boolean(r?.isActive ?? r?.is_active ?? true),
    gallery,
    providerName: providerName ? String(providerName) : undefined,
    providerAvatar: (r?.providerAvatar ?? r?.provider_avatar) as string | undefined,
  };
}

function mapServerAddress(raw: unknown): Address {
  const r = raw as Record<string, unknown>;
  const street = String(r?.street ?? r?.address ?? '');
  const lat = Number(r?.latitude ?? (r?.coordinates as { latitude?: unknown } | undefined)?.latitude ?? 0);
  const lng = Number(r?.longitude ?? (r?.coordinates as { longitude?: unknown } | undefined)?.longitude ?? 0);
  return {
    id: String(r?.id ?? ''),
    userId: String(r?.userId ?? r?.user_id ?? ''),
    label: String(r?.label ?? (r?.estate as string) ?? 'Home'),
    street,
    houseNumber: String(r?.houseNumber ?? r?.house_number ?? ''),
    estate: r?.estate as string | undefined,
    buildingName: (r?.buildingName ?? r?.building_name) as string | undefined,
    floor: r?.floor as string | undefined,
    landmark: String(r?.landmark ?? ''),
    gateInstructions: (r?.gateInstructions ?? r?.gate_instructions) as string | undefined,
    contactPhone: String(r?.contactPhone ?? r?.contact_phone ?? r?.phone ?? ''),
    isDefault: Boolean(r?.isDefault ?? r?.is_default ?? false),
    city: r?.city as string | undefined,
    state: r?.state as string | undefined,
    coordinates: {
      latitude: Number.isFinite(lat) ? lat : 0,
      longitude: Number.isFinite(lng) ? lng : 0,
    },
    createdAt: (r?.created_at ?? r?.createdAt) as string | undefined,
  };
}

export function toServerAddressPayload(a: Omit<Address, 'id' | 'createdAt'>) {
  // Matches backend addressSchema (houseNumber, street, city, state, ...).
  return {
    houseNumber: a.houseNumber || '-',
    street: a.street,
    area: a.estate,
    city: a.city || '',
    state: a.state || 'Akwa Ibom',
    estate: a.estate,
    landmark: a.landmark,
    gateInstructions: a.gateInstructions,
    contactPhone: a.contactPhone,
    latitude: a.coordinates?.latitude,
    longitude: a.coordinates?.longitude,
  };
}

export function mapServerBooking(raw: unknown): Booking & { jobId?: string } {
  const r = raw as Record<string, unknown>;
  const status = String(r?.status ?? 'REQUESTED') as JobStatus;
  const scheduledAt = String(
    r?.scheduledAt ?? r?.scheduled_at ?? r?.date ?? new Date().toISOString(),
  );
  const slot = String(r?.slot ?? '');
  const totalKobo = Number(r?.total_kobo ?? r?.totalKobo ?? r?.priceKobo ?? r?.price_kobo ?? 0);
  const providerName =
    (r?.providerName ?? r?.provider_name ?? (r?.provider as Record<string, unknown> | undefined)?.name ?? r?.title) as
      | string
      | undefined;
  const bookingNumber = String(
    r?.number ?? r?.bookingNumber ?? r?.booking_number ?? String(r?.id ?? '').slice(-6) ?? '',
  );
  const datePart = scheduledAt.slice(0, 10);
  const jobId = (r?.jobId ?? r?.job_id ?? r?.jobID) as string | undefined;
  return {
    id: String(r?.id ?? ''),
    bookingNumber,
    customerId: String(r?.customerId ?? r?.customer_id ?? r?.userId ?? r?.user_id ?? ''),
    serviceId: String(r?.serviceId ?? r?.service_id ?? ''),
    addressId: String(r?.addressId ?? r?.address_id ?? ''),
    scheduledAt,
    status,
    priceKobo: Number(r?.priceKobo ?? r?.price_kobo ?? totalKobo),
    vatKobo: Number(r?.vatKobo ?? r?.vat_kobo ?? 0),
    discountKobo: Number(r?.discountKobo ?? r?.discount_kobo ?? 0),
    totalKobo,
    paymentMethod: (r?.paymentMethod ?? r?.payment_method ?? 'CARD') as Booking['paymentMethod'],
    paymentStatus: (r?.paymentStatus ?? r?.payment_status ?? 'PENDING') as Booking['paymentStatus'],
    providerId: (r?.providerId ?? r?.provider_id) as string | undefined,
    provider: providerName
      ? {
          id: String(r?.providerId ?? r?.provider_id ?? 'pro_live'),
          name: String(providerName),
          phone: String(r?.providerPhone ?? r?.provider_phone ?? ''),
          avatarUrl: (r?.providerAvatar ?? r?.provider_avatar) as string | undefined,
          rating: Number(r?.providerRating ?? r?.provider_rating ?? 0),
          reviewCount: 0,
          isVerified: true,
          experienceYears: 0,
          serviceCategoryIds: [],
        }
      : undefined,
    service: r?.serviceId
      ? {
          id: String(r.serviceId),
          categoryId: '',
          name: String(r?.title ?? 'Service'),
          description: '',
          priceKobo: totalKobo,
          durationMinutes: 60,
          rating: 0,
          reviewCount: 0,
          imageUrl: String(r?.imageUrl ?? r?.image_url ?? ''),
          isQuoteBased: false,
          addOns: [],
        }
      : undefined,
    arrivalWindow: slot
      ? {
          date: datePart,
          startTime: slot,
          endTime: slot,
          slotLabel: slot,
        }
      : {
          date: datePart,
          startTime: scheduledAt.slice(11, 16) || '10:00',
          endTime: scheduledAt.slice(11, 16) || '10:00',
          slotLabel: slot || scheduledAt.slice(11, 16) || '10:00',
        },
    selectedAddOns: [],
    specialInstructions: (r?.notes ?? r?.specialInstructions) as string | undefined,
    timeline: [
      {
        status: 'REQUESTED' as JobStatus,
        timestamp: String(r?.created_at ?? r?.createdAt ?? new Date().toISOString()),
        title: 'Booking Requested',
      },
      ...(status !== 'REQUESTED'
        ? [
            {
              status,
              timestamp: String(r?.created_at ?? r?.createdAt ?? new Date().toISOString()),
              title: `Status: ${status}`,
            },
          ]
        : []),
    ],
    createdAt: String(r?.created_at ?? r?.createdAt ?? new Date().toISOString()),
    completedAt: (r?.completed_at ?? r?.completedAt) as string | undefined,
    ...(jobId ? { jobId: String(jobId) } : {}),
  };
}

export interface WalletSummary {
  balanceKobo: number;
  transactions: Array<{
    id: string;
    type: 'credit' | 'debit';
    amountKobo: number;
    description: string;
    reference: string;
    createdAt: string;
    bookingId?: string;
  }>;
}

function mapServerWallet(raw: unknown): WalletSummary {
  const r = raw as Record<string, unknown>;
  const txns = Array.isArray(r?.txns)
    ? (r.txns as unknown[])
    : Array.isArray(r?.transactions)
      ? (r.transactions as unknown[])
      : [];
  return {
    balanceKobo: Number(r?.balanceKobo ?? r?.balance_kobo ?? 0),
    transactions: txns.map((t) => {
      const o = t as Record<string, unknown>;
      const signed = Number(o?.amount_kobo ?? o?.amountKobo ?? 0);
      return {
        id: String(o?.id ?? ''),
        type: signed >= 0 ? ('credit' as const) : ('debit' as const),
        amountKobo: Math.abs(signed),
        description: String(o?.ref ?? o?.reference ?? o?.kind ?? 'Transaction'),
        reference: String(o?.ref ?? o?.reference ?? ''),
        createdAt: String(o?.created_at ?? o?.createdAt ?? new Date().toISOString()),
        bookingId: (o?.booking_id ?? o?.bookingId) as string | undefined,
      };
    }),
  };
}

function toScheduledAt(input: {
  scheduledAt?: string;
  date?: string;
  slot?: string;
}): string {
  if (input.scheduledAt) return input.scheduledAt;
  if (input.date) {
    // date YYYY-MM-DD + slot like "10:00 AM - 12:00 PM" → ISO UTC morning default.
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(input.slot ?? '');
    let hh = 10;
    let mm = 0;
    if (m) {
      hh = Number(m[1]);
      mm = Number(m[2]);
      const ap = (m[3] ?? '').toUpperCase();
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
    }
    const dd = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
    return `${input.date}T${dd}`;
  }
  return new Date().toISOString();
}

// ==========================================
// TanStack Query Hooks (live backend /v1)
// ==========================================

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await apiFetch<string[] | Record<string, unknown>[]>('/v1/categories');
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map((c, i) => mapServerCategory(c, i));
    },
  });
}

export function useServices(categoryId?: string) {
  return useQuery({
    queryKey: ['services', categoryId],
    queryFn: async () => {
      const qs = categoryId ? `?category=${encodeURIComponent(categoryId)}` : '';
      const data = await apiFetch<unknown[]>(`/v1/services${qs}`);
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map(mapServerService);
    },
  });
}

export interface ApprovedProvider {
  id: string;
  name: string;
  rating: number;
  lat?: number | null;
  lng?: number | null;
}

/** KYC-verified, active providers — the home "providers in your area" strip. Empty until real providers exist. */
export function useApprovedProviders() {
  return useQuery({
    queryKey: ['approved-providers'],
    queryFn: async () => {
      const data = await apiFetch<unknown>('/v1/providers/approved');
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map((raw) => {
        const r = (raw ?? {}) as Record<string, unknown>;
        return {
          id: String(r.id ?? ''),
          name: String(r.name ?? 'Provider'),
          rating: Number(r.rating ?? 5),
          lat: (r.lat as number | null) ?? null,
          lng: (r.lng as number | null) ?? null,
        } satisfies ApprovedProvider;
      });
    },
  });
}

export function useService(serviceId: string) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const data = await apiFetch<unknown>(`/v1/services/${encodeURIComponent(serviceId)}`);
      if (!data) return null;
      // Single-service endpoint embeds addOns with String(priceKobo) — coerce in mapper.
      return mapServerService(data);
    },
    enabled: Boolean(serviceId),
  });
}

export function useSearchServices(query: string) {
  return useQuery({
    queryKey: ['searchServices', query],
    queryFn: async () => {
      const data = await apiFetch<unknown[]>(
        `/v1/services?q=${encodeURIComponent(query)}`,
      );
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map(mapServerService);
    },
    enabled: query.trim().length > 0,
  });
}

export function useBookings(statusFilter?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  return useQuery({
    queryKey: ['bookings', statusFilter],
    enabled: hydrated && isAuthenticated,
    queryFn: async () => {
      const qs =
        statusFilter && statusFilter !== 'all'
          ? `?status=${encodeURIComponent(statusFilter)}`
          : '';
      const data = await apiFetch<unknown>(`/v1/bookings${qs}`);
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      const mapped = list.map(mapServerBooking);
      if (!statusFilter || statusFilter === 'all') return mapped;
      const s = statusFilter.toUpperCase();
      const filtered = mapped.filter((b) => b.status === s);
      return filtered.length > 0 ? filtered : mapped;
    },
  });
}

export function useBooking(bookingId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  return useQuery({
    queryKey: ['booking', bookingId],
    enabled: Boolean(bookingId) && hydrated && isAuthenticated,
    queryFn: async () => {
      const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}`);
      return mapServerBooking(data);
    },
  });
}

export interface CreateBookingInput {
  serviceId: string;
  addressId?: string;
  scheduledAt?: string;
  addOnIds?: string[];
  // Legacy wizard fields (mapped to scheduledAt for the live body).
  date?: string;
  slot?: string;
  notes?: string;
  frequency?: string;
}

export function useCreateBooking() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      if (!input.serviceId) throw new Error('Select a service first.');
      if (!input.addressId && !input.date) {
        // addressId is required by POST /v1/bookings zod schema.
        if (!input.addressId) throw new Error('Select a service address first.');
      }
      const scheduledAt = toScheduledAt(input);
      const body = {
        serviceId: input.serviceId,
        addressId: input.addressId ?? '',
        scheduledAt,
        ...(input.addOnIds ? { addOnIds: input.addOnIds } : {}),
      };
      const data = await apiFetch<unknown>('/v1/bookings', {
        method: 'POST',
        body,
      });
      return mapServerBooking(data);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      description,
      date,
      slot,
    }: {
      bookingId: string;
      status: JobStatus;
      description?: string;
      date?: string;
      slot?: string;
    }) => {
      const s = String(status).toUpperCase();
      if (s === 'CANCELLED' || s === 'CANCELED') {
        const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
          method: 'POST',
          body: description ? { reason: description } : {},
        });
        return mapServerBooking(data);
      }
      if (date || slot) {
        const to = toScheduledAt({ date, slot });
        // Backend zod schema for reschedule is {from, to}; map date/slot → to.
        const data = await apiFetch<unknown>(
          `/v1/bookings/${encodeURIComponent(bookingId)}/reschedule`,
          { method: 'POST', body: { from: '', to } },
        );
        return mapServerBooking(data ?? { id: bookingId, status, scheduledAt: to });
      }
      throw new Error('unsupported transition');
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['bookings'] });
      if (data?.id) client.invalidateQueries({ queryKey: ['booking', data.id] });
    },
  });
}

export function useRescheduleBooking() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      date,
      slot,
      from,
      to,
    }: {
      bookingId: string;
      date?: string;
      slot?: string;
      from?: string;
      to?: string;
    }) => {
      const toSlot = to ?? toScheduledAt({ date, slot });
      const fromSlot = from ?? '';
      const data = await apiFetch<unknown>(
        `/v1/bookings/${encodeURIComponent(bookingId)}/reschedule`,
        { method: 'POST', body: { from: fromSlot, to: toSlot } },
      );
      // Reschedule endpoint returns history list; refetch booking for fresh state.
      if (data && typeof data === 'object' && 'id' in (data as object)) {
        return mapServerBooking(data);
      }
      const fresh = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}`);
      return mapServerBooking(fresh);
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['bookings'] });
      if (data?.id) client.invalidateQueries({ queryKey: ['booking', data.id] });
    },
  });
}

export function useCancelBooking() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        body: reason ? { reason } : {},
      });
      const booking = mapServerBooking(data);
      const refundKobo = Number((data as Record<string, unknown>)?.refundKobo ?? 0);
      return { booking, refundKobo };
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['bookings'] });
      if (data?.booking?.id) client.invalidateQueries({ queryKey: ['booking', data.booking.id] });
      client.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useBookingTimeline(bookingId: string) {
  return useQuery({
    queryKey: ['bookingTimeline', bookingId],
    queryFn: async () => {
      const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}/timeline`);
      return Array.isArray(data) ? data : unwrapList<unknown>(data);
    },
    enabled: Boolean(bookingId),
  });
}

export function useBookingEta(bookingId: string) {
  return useQuery({
    queryKey: ['bookingEta', bookingId],
    queryFn: async () => {
      const data = await apiFetch<{ minutes?: number }>(
        `/v1/bookings/${encodeURIComponent(bookingId)}/eta`,
      );
      return data;
    },
    enabled: Boolean(bookingId),
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: async ({
      bookingId,
      amountKobo,
      email,
    }: {
      bookingId: string;
      amountKobo: number | string;
      email: string;
    }) => {
      // Backend zod schema: {amountKobo: string, email: string} + Idempotency-Key.
      const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}/payments`, {
        method: 'POST',
        body: { amountKobo: String(amountKobo), email },
      });
      return data;
    },
  });
}

export function usePayment(reference: string) {
  return useQuery({
    queryKey: ['payment', reference],
    queryFn: async () => {
      const data = await apiFetch<unknown>(`/v1/payments/${encodeURIComponent(reference)}`);
      return data;
    },
    enabled: Boolean(reference),
  });
}

export interface JobMessage {
  id: string;
  jobId: string;
  from: string;
  body: string;
  at: string;
}

function mapServerMessage(raw: unknown, fallbackJobId: string): JobMessage {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r?.id ?? ''),
    jobId: String(r?.jobId ?? r?.job_id ?? fallbackJobId),
    from: String(r?.from ?? ''),
    body: String(r?.body ?? r?.text ?? ''),
    at: String(r?.at ?? r?.created_at ?? r?.createdAt ?? new Date().toISOString()),
  };
}

export function useJobMessages(jobId?: string) {
  return useQuery({
    queryKey: ['jobMessages', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const data = await apiFetch<unknown>(`/v1/jobs/${encodeURIComponent(jobId)}/messages`);
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map((m) => mapServerMessage(m, jobId));
    },
    enabled: Boolean(jobId),
  });
}

export function useSendJobMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, from, body }: { jobId: string; from: string; body: string }) => {
      const data = await apiFetch<unknown>(`/v1/jobs/${encodeURIComponent(jobId)}/messages`, {
        method: 'POST',
        body: { from, body },
      });
      return mapServerMessage(data, jobId);
    },
    onSuccess: (_d, v) => {
      client.invalidateQueries({ queryKey: ['jobMessages', v.jobId] });
    },
  });
}

export function useCreateReview() {
  return useMutation({
    mutationFn: async ({
      bookingId,
      rating,
      tags,
      comment,
    }: {
      bookingId: string;
      rating: number;
      tags: string[];
      comment?: string;
    }) => {
      const data = await apiFetch<unknown>('/v1/reviews', {
        method: 'POST',
        body: { bookingId, rating, tags, ...(comment ? { comment } : {}) },
      });
      return data;
    },
  });
}

export function useCreateWarranty() {
  return useMutation({
    mutationFn: async ({ bookingId, days }: { bookingId: string; days: number }) => {
      const data = await apiFetch<unknown>('/v1/warranties', {
        method: 'POST',
        body: { bookingId, days },
      });
      return data;
    },
  });
}

export function useClaimWarranty() {
  return useMutation({
    mutationFn: async ({
      warrantyId,
      reason,
      description,
      evidence,
    }: {
      warrantyId: string;
      reason: string;
      description: string;
      evidence?: string[];
    }) => {
      const data = await apiFetch<unknown>(`/v1/warranties/${encodeURIComponent(warrantyId)}/claims`, {
        method: 'POST',
        body: { reason, description, ...(evidence ? { evidence } : {}) },
      });
      return data;
    },
  });
}

export function useAddresses(_userId?: string) {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const data = await apiFetch<unknown>('/v1/addresses');
      const list = Array.isArray(data) ? data : unwrapList<unknown>(data);
      return list.map(mapServerAddress);
    },
  });
}

export function useAddAddress() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (newAddress: Omit<Address, 'id' | 'createdAt'>) => {
      const data = await apiFetch<unknown>('/v1/addresses', {
        method: 'POST',
        body: toServerAddressPayload(newAddress),
      });
      return mapServerAddress(data);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useUpdateAddress() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      addressId,
      patch,
    }: {
      addressId: string;
      patch: Partial<Omit<Address, 'id' | 'createdAt'>>;
    }) => {
      const body: Record<string, unknown> = {};
      if (patch.houseNumber !== undefined) body.houseNumber = patch.houseNumber;
      if (patch.street !== undefined) body.street = patch.street;
      if (patch.estate !== undefined) body.area = patch.estate;
      if (patch.city !== undefined) body.city = patch.city;
      if (patch.state !== undefined) body.state = patch.state;
      if (patch.landmark !== undefined) body.landmark = patch.landmark;
      if (patch.gateInstructions !== undefined) body.gateInstructions = patch.gateInstructions;
      if (patch.contactPhone !== undefined) body.contactPhone = patch.contactPhone;
      if (patch.coordinates?.latitude !== undefined) body.latitude = patch.coordinates.latitude;
      if (patch.coordinates?.longitude !== undefined) body.longitude = patch.coordinates.longitude;

      const data = await apiFetch<unknown>(`/v1/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PATCH',
        body,
      });
      return mapServerAddress(data);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useSetDefaultAddress() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      const data = await apiFetch<unknown>(
        `/v1/addresses/${encodeURIComponent(addressId)}/default`,
        { method: 'POST' },
      );
      return mapServerAddress(data);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      await apiFetch<unknown>(`/v1/addresses/${encodeURIComponent(addressId)}`, {
        method: 'DELETE',
      });
      return true;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

// Live wallet routes: GET /v1/wallet and POST /v1/wallet/topup return
// {balanceKobo, txns}; these hooks read that contract directly.
export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const data = await apiFetch<unknown>('/v1/wallet');
      return mapServerWallet(data);
    },
  });
}

export function useTopup() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (amountKobo: number) => {
      const data = await apiFetch<unknown>(`/v1/wallet/topup`, {
        method: 'POST',
        body: { amountKobo },
      });
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
