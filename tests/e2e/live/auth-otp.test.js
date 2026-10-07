/**
 * Live contract: OTP auth flow.
 * Requires ALLOW_OTP_DEBUG on the backend (reads debugCode from the response).
 */

const { describe, it, expect, beforeEach } = require('../harness/testFramework');
const { request, isBackendReachable } = require('./helper');

describe('Live — auth-otp contract', () => {
  let reachable = false;
  const target = `e2e-${Date.now()}@kendibo.test`;
  let debugCode = null;
  let token = null;

  beforeEach(async () => {
    reachable = await isBackendReachable();
  });

  it('POST /api/auth/otp/request returns {ok} (+debugCode when allowed)', async () => {
    if (!reachable) return;
    const { status, json } = await request('/api/auth/otp/request', {
      method: 'POST',
      body: { target },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    if (json.debugCode) {
      debugCode = json.debugCode;
      expect(String(debugCode).length).toBeGreaterThan(0);
    }
  });

  it('POST /api/auth/otp/verify exchanges code for user + token', async () => {
    if (!reachable || !debugCode) return;
    const { status, json } = await request('/api/auth/otp/verify', {
      method: 'POST',
      body: { target, code: debugCode, name: 'E2E Runner' },
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.user).toBeDefined();
    expect(json.user.id).toBeDefined();
    expect(json.token).toBeDefined();
    token = json.token;
  });

  it('GET /api/auth/me returns the session user', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/auth/me', { token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.user).toBeDefined();
  });

  it('POST /api/auth/logout invalidates the session', async () => {
    if (!reachable || !token) return;
    const { status, json } = await request('/api/auth/logout', {
      method: 'POST',
      token,
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('GET /api/auth/me with a bad token is 401 {ok:false}', async () => {
    if (!reachable) return;
    const { status, json } = await request('/api/auth/me', { token: 'bad-token' });
    expect(status).toBe(401);
    expect(json.ok).toBe(false);
  });
});
