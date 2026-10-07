/**
 * Live contract: addresses CRUD.
 */

const { describe, it, expect, beforeEach } = require('../harness/testFramework');
const { request, isBackendReachable } = require('./helper');

describe('Live — addresses-crud contract', () => {
  let reachable = false;
  let token = null;
  let addressId = null;

  beforeEach(async () => {
    if (token) return;
    reachable = await isBackendReachable();
    if (!reachable) return;
    const target = `e2e-addr-${Date.now()}@kendibo.test`;
    const req = await request('/api/auth/otp/request', {
      method: 'POST',
      body: { target },
    });
    if (!req.json.debugCode) return;
    const ver = await request('/api/auth/otp/verify', {
      method: 'POST',
      body: { target, code: req.json.debugCode, name: 'E2E Address' },
    });
    token = ver.json.token;
  });

  it('POST /api/addresses creates an address', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/addresses', {
      method: 'POST',
      token,
      body: {
        label: 'E2E Home',
        address: '14 Oron Road, Ewet Housing Estate',
        landmark: 'Opposite Ibom Plaza',
        city: 'Uyo',
        phone: '+2348012345678',
        is_default: true,
      },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.address).toBeDefined();
    expect(json.address.id).toBeDefined();
    addressId = json.address.id;
  });

  it('GET /api/addresses lists addresses', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/addresses', { token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.addresses)).toBe(true);
  });

  it('DELETE /api/addresses/:id removes the address', async () => {
    if (!reachable || !token || !addressId) return;
    const { status, json } = await request(`/api/addresses/${addressId}`, {
      method: 'DELETE',
      token,
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
