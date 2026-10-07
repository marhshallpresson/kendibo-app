/**
 * Live contract: read-only catalog endpoints.
 */

const { describe, it, expect, beforeEach } = require('../harness/testFramework');
const { request, isBackendReachable } = require('./helper');

describe('Live — catalog-read contract', () => {
  let reachable = false;
  let firstServiceId = null;
  let firstCategorySlug = null;

  beforeEach(async () => {
    reachable = await isBackendReachable();
  });

  it('GET /api/catalog/categories returns a list', async () => {
    if (!reachable) return;
    const { status, json } = await request('/api/catalog/categories');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const list = json.categories || [];
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) firstCategorySlug = list[0].slug || list[0].id;
  });

  it('GET /api/catalog/services returns services with kobo pricing', async () => {
    if (!reachable) return;
    const { status, json } = await request('/api/catalog/services');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const list = json.services || [];
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      firstServiceId = list[0].id;
      expect(Number.isInteger(list[0].priceKobo)).toBe(true);
    }
  });

  it('GET /api/catalog/services?category= filters by category', async () => {
    if (!reachable || !firstCategorySlug) return;
    const { status, json } = await request(
      `/api/catalog/services?category=${encodeURIComponent(firstCategorySlug)}`
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.services)).toBe(true);
  });

  it('GET /api/catalog/services?q= searches the catalog', async () => {
    if (!reachable) return;
    const { status, json } = await request('/api/catalog/services?q=clean');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.services)).toBe(true);
  });

  it('GET /api/catalog/services/:id returns one service', async () => {
    if (!reachable || !firstServiceId) return;
    const { status, json } = await request(
      `/api/catalog/services/${encodeURIComponent(firstServiceId)}`
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.service).toBeDefined();
    expect(json.service.id).toBe(firstServiceId);
  });
});
