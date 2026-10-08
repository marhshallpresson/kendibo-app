import { apiFetch } from './client';

export interface JobOffer {
  id: string;
  jobId: string;
  bookingId?: string;
  providerId: string;
  status: 'offered' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  serviceId?: string;
  serviceTitle?: string;
  customerName?: string;
  address?: string;
  scheduledAt?: string;
  totalKobo?: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  kycStatus: string;
  skills: string[];
  online: boolean;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
  displayName?: string;
}

export interface ProviderBooking {
  id: string;
  bookingNumber?: string;
  serviceId: string;
  status: string;
  scheduledAt?: string;
  totalKobo?: string;
  createdAt?: string;
  jobId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  serviceTitle?: string;
  lat?: number;
  lng?: number;
}

export interface ProviderEarning {
  id: string;
  jobId: string;
  amountKobo: string;
  tipKobo?: string;
  createdAt?: string;
}

// ==========================================
// Defensive normalizers — the provider
// endpoints have returned both camelCase and
// snake_case rows across deployments, so every
// field is read from both spellings.
// ==========================================

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function str(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return undefined;
}

function num(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function listFrom(data: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  const o = asRecord(data);
  for (const k of keys) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  return [];
}

function addressToText(address: unknown): string | undefined {
  if (typeof address === 'string') return address || undefined;
  const a = asRecord(address);
  if (Object.keys(a).length === 0) return undefined;
  const joined = [str(a.houseNumber), str(a.street), str(a.estate ?? a.area), str(a.city), str(a.state)]
    .filter(Boolean)
    .join(', ');
  return joined || undefined;
}

function customerNameFrom(r: Record<string, unknown>): string | undefined {
  return (
    str(r.customerName) ??
    str(r.customer_name) ??
    str(asRecord(r.customer).name) ??
    (typeof r.customer === 'string' && r.customer ? (r.customer as string) : undefined) ??
    str(asRecord(r.customerUser).name) ??
    str(asRecord(r.user).name)
  );
}

function normalizeBooking(raw: unknown): ProviderBooking {
  const outer = asRecord(raw);
  // Some endpoints wrap the row (`{ booking: {...} }` / `{ item: {...} }`).
  const wrapped = asRecord(outer.booking ?? outer.item);
  const r = !outer.id && (wrapped.id || wrapped.bookingId || wrapped.booking_id) ? wrapped : outer;
  const job = asRecord(r.job);
  return {
    id: String(r.id ?? r.bookingId ?? r.booking_id ?? job.id ?? ''),
    bookingNumber: str(r.bookingNumber ?? r.booking_number ?? r.number),
    serviceId: String(r.serviceId ?? r.service_id ?? job.serviceId ?? job.service_id ?? ''),
    status: String(r.status ?? job.status ?? '').toUpperCase() || 'UNKNOWN',
    scheduledAt: str(r.scheduledAt ?? r.scheduled_at ?? r.date ?? job.scheduledAt ?? job.scheduled_at),
    totalKobo: str(r.totalKobo ?? r.total_kobo ?? r.priceKobo ?? r.price_kobo ?? job.totalKobo ?? job.total_kobo),
    createdAt: str(r.createdAt ?? r.created_at),
    jobId: str(r.jobId ?? r.job_id ?? job.jobId ?? job.job_id),
    customerName: customerNameFrom(r),
    customerPhone: str(
      r.customerPhone ?? r.customer_phone ?? r.contactPhone ?? r.contact_phone ?? asRecord(r.customer).phone,
    ),
    address: addressToText(r.address ?? r.addressLine ?? r.address_line ?? r.addressText ?? r.address_text),
    serviceTitle: str(r.title ?? r.serviceTitle ?? r.service_title ?? r.serviceName ?? r.service_name ?? job.title),
    lat: num(r.lat ?? r.latitude ?? asRecord(r.coordinates).latitude),
    lng: num(r.lng ?? r.longitude ?? asRecord(r.coordinates).longitude),
  };
}

function normalizeOffer(raw: unknown): JobOffer {
  const r = asRecord(raw);
  const nested = { ...asRecord(r.job), ...asRecord(r.booking) };
  const rawStatus = String(r.status ?? nested.status ?? 'offered').toLowerCase();
  const status: JobOffer['status'] =
    rawStatus === 'accepted' || rawStatus === 'declined' || rawStatus === 'expired'
      ? rawStatus
      : 'offered';
  return {
    id: String(r.id ?? r.offerId ?? r.offer_id ?? ''),
    jobId: String(r.jobId ?? r.job_id ?? nested.jobId ?? nested.job_id ?? ''),
    bookingId: str(r.bookingId ?? r.booking_id ?? asRecord(r.booking).id),
    providerId: String(r.providerId ?? r.provider_id ?? ''),
    status,
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
    serviceId: str(r.serviceId ?? r.service_id ?? nested.serviceId ?? nested.service_id),
    serviceTitle: str(r.title ?? r.serviceTitle ?? r.service_title ?? r.serviceName ?? r.service_name ?? nested.title),
    customerName: customerNameFrom(r) ?? customerNameFrom(nested),
    address: addressToText(r.address ?? r.addressLine ?? r.address_line ?? nested.address),
    scheduledAt: str(r.scheduledAt ?? r.scheduled_at ?? r.date ?? nested.scheduledAt ?? nested.scheduled_at),
    totalKobo: str(r.totalKobo ?? r.total_kobo ?? r.priceKobo ?? r.price_kobo ?? nested.totalKobo ?? nested.total_kobo),
  };
}

function normalizeProviderProfile(raw: unknown): ProviderProfile | null {
  if (!raw) return null;
  const outer = asRecord(raw);
  const wrapped = asRecord(outer.provider);
  const row = wrapped.id || wrapped.userId || wrapped.user_id ? wrapped : outer;
  const id = str(row.id);
  if (!id) return null;
  const skillsRaw = Array.isArray(row.skills) ? row.skills : [];
  return {
    id,
    userId: String(row.userId ?? row.user_id ?? ''),
    kycStatus: String(row.kycStatus ?? row.kyc_status ?? 'pending').toLowerCase(),
    skills: skillsRaw
      .map((s) => (typeof s === 'string' ? s : str(asRecord(s).name) ?? str(asRecord(s).id) ?? ''))
      .filter(Boolean),
    online: Boolean(row.online ?? row.isOnline ?? row.is_online ?? false),
    lat: num(row.lat ?? row.latitude),
    lng: num(row.lng ?? row.longitude),
    rating: num(row.rating ?? row.avgRating ?? row.avg_rating),
    reviewCount: num(row.reviewCount ?? row.review_count ?? row.reviews),
    displayName: str(row.displayName ?? row.display_name ?? row.name ?? row.businessName ?? row.business_name),
  };
}

async function fetchProviderBookings(providerId: string): Promise<ProviderBooking[]> {
  const data = await apiFetch<unknown>(`/v1/provider/bookings?providerId=${encodeURIComponent(providerId)}`);
  return listFrom(data, 'items', 'bookings').map(normalizeBooking);
}

export const jobApi = {
  getMe: async (): Promise<ProviderProfile | null> => {
    const data = await apiFetch<unknown>('/v1/provider/me');
    return normalizeProviderProfile(data);
  },
  onboard: async (): Promise<ProviderProfile> => {
    const data = await apiFetch<unknown>('/v1/provider/onboarding', { method: 'POST' });
    const profile = normalizeProviderProfile(data);
    if (!profile) throw new Error('Onboarding failed — no provider row was returned.');
    return profile;
  },
  getOffers: async (providerId: string): Promise<JobOffer[]> => {
    const data = await apiFetch<unknown>(`/v1/provider/offers?providerId=${encodeURIComponent(providerId)}`);
    return listFrom(data, 'items', 'offers').map(normalizeOffer);
  },
  respondToOffer: async (offerId: string, accept: boolean): Promise<JobOffer> =>
    apiFetch<JobOffer>(`/v1/provider/offers/${offerId}/respond`, {
      method: 'POST',
      body: { accept },
    }),
  getBookings: fetchProviderBookings,
  /** Direct fetch of a booking via /v1/bookings/:id (may 403 for provider accounts). */
  getBooking: async (bookingId: string): Promise<ProviderBooking> => {
    const data = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}`);
    return normalizeBooking(data);
  },
  /**
   * Booking lookup for the provider app: tries /v1/bookings/:id first and
   * falls back to scanning the provider's own bookings list (matched by
   * booking id or job id) when the direct endpoint rejects the caller.
   */
  getProviderBooking: async (providerId: string, bookingId: string): Promise<ProviderBooking | null> => {
    try {
      const direct = await apiFetch<unknown>(`/v1/bookings/${encodeURIComponent(bookingId)}`);
      const b = normalizeBooking(direct);
      if (b.id) return b;
    } catch {
      // 403/404 for non-owner provider accounts — fall through to the list.
    }
    const rows = await fetchProviderBookings(providerId);
    return rows.find((b) => b.id === bookingId || b.jobId === bookingId) ?? null;
  },
  getEarnings: async (providerId: string): Promise<ProviderEarning[]> =>
    apiFetch<Array<{ id: string; job_id: string; amount_kobo: string; tip_kobo?: string; created_at: string }>>(
      `/v1/provider/earnings?providerId=${providerId}`,
    ).then((rows) =>
      rows.map((r) => ({
        id: String(r.id),
        jobId: String(r.job_id),
        amountKobo: String(r.amount_kobo),
        tipKobo: r.tip_kobo ? String(r.tip_kobo) : undefined,
        createdAt: String(r.created_at),
      })),
    ),
  transitionState: async (jobId: string, toStatus: string): Promise<unknown> =>
    apiFetch<unknown>(`/v1/jobs/${jobId}/transition`, {
      method: 'POST',
      body: { to: toStatus },
    }),
};
