/**
 * Live contract test helper — thin fetch wrapper for the Kendibo backend.
 * Base URL: process.env.KENDIBO_API_URL || http://localhost:3001
 */

const BASE = (process.env.KENDIBO_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

async function isBackendReachable() {
  try {
    const { status } = await request('/api/health');
    return status < 500;
  } catch {
    return false;
  }
}

module.exports = { BASE, request, isBackendReachable };
