/**
 * Live contract: wallet read + top-up.
 */

const { describe, it, expect, beforeEach } = require('../harness/testFramework');
const { request, isBackendReachable } = require('./helper');

describe('Live — wallet-topup contract', () => {
  let reachable = false;
  let token = null;

  beforeEach(async () => {
    if (token) return;
    reachable = await isBackendReachable();
    if (!reachable) return;
    const target = `e2e-wal-${Date.now()}@kendibo.test`;
    const req = await request('/api/auth/otp/request', {
      method: 'POST',
      body: { target },
    });
    if (!req.json.debugCode) return;
    const ver = await request('/api/auth/otp/verify', {
      method: 'POST',
      body: { target, code: req.json.debugCode, name: 'E2E Wallet' },
    });
    token = ver.json.token;
  });

  it('GET /api/wallet returns balanceKobo + txns', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/wallet', { token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Number.isInteger(json.balanceKobo)).toBe(true);
    expect(Array.isArray(json.txns)).toBe(true);
  });

  it('POST /api/wallet/topup credits amountKobo', async () => {
    if (!reachable || !token) return;
    const before = await request('/api/wallet', { token });
    const { status, json } = await request('/api/wallet/topup', {
      method: 'POST',
      token,
      body: { amountKobo: 500000 },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const after = await request('/api/wallet', { token });
    expect(after.json.balanceKobo).toBe(before.json.balanceKobo + 500000);
  });
});
