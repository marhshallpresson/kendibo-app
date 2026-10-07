/**
 * Live contract: booking lifecycle (create → read → reschedule → status → cancel).
 */

const { describe, it, expect, beforeEach } = require('../harness/testFramework');
const { request, isBackendReachable } = require('./helper');

describe('Live — booking-lifecycle contract', () => {
  let reachable = false;
  let token = null;
  let serviceId = null;
  let addressId = null;
  let bookingId = null;

  beforeEach(async () => {
    if (token) return;
    reachable = await isBackendReachable();
    if (!reachable) return;

    // Authenticate via debug OTP.
    const target = `e2e-book-${Date.now()}@kendibo.test`;
    const req = await request('/api/auth/otp/request', {
      method: 'POST',
      body: { target },
    });
    if (!req.json.debugCode) return;
    const ver = await request('/api/auth/otp/verify', {
      method: 'POST',
      body: { target, code: req.json.debugCode, name: 'E2E Booking' },
    });
    token = ver.json.token;

    const svc = await request('/api/catalog/services');
    serviceId = (svc.json.services || [])[0]?.id || null;

    const addr = await request('/api/addresses', { token });
    addressId = (addr.json.addresses || [])[0]?.id || null;
  });

  it('POST /api/bookings creates a booking', async () => {
    if (!reachable || !token || !serviceId) return;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { status, json } = await request('/api/bookings', {
      method: 'POST',
      token,
      body: {
        serviceId,
        date: tomorrow,
        slot: '10:00 AM - 12:00 PM',
        ...(addressId ? { addressId } : {}),
        notes: 'E2E contract test',
      },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.booking).toBeDefined();
    expect(json.booking.id).toBeDefined();
    expect(Number.isInteger(json.booking.total_kobo)).toBe(true);
    bookingId = json.booking.id;
  });

  it('GET /api/bookings lists bookings', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/bookings', { token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.bookings)).toBe(true);
  });

  it('GET /api/bookings/:id returns the booking', async () => {
    if (!reachable || !token || !bookingId) return;
    const { status, json } = await request(`/api/bookings/${bookingId}`, { token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.booking.id).toBe(bookingId);
  });

  it('PATCH /api/bookings/:id reschedules date/slot', async () => {
    if (!reachable || !token || !bookingId) return;
    const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const { status, json } = await request(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      token,
      body: { date: dayAfter, slot: '02:00 PM - 04:00 PM' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('PATCH /api/bookings/:id/status transitions status', async () => {
    if (!reachable || !token || !bookingId) return;
    const { status, json } = await request(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'CONFIRMED' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('POST /api/bookings/:id/cancel cancels with refundKobo', async () => {
    if (!reachable || !token || !bookingId) return;
    const { status, json } = await request(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      token,
      body: { reason: 'E2E contract test cleanup' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.booking).toBeDefined();
    expect(Number.isInteger(json.refundKobo)).toBe(true);
  });
});
