import * as WebBrowser from 'expo-web-browser';
import { apiFetch } from './api/client';

WebBrowser.maybeCompleteAuthSession();

const CALLBACK_SCHEME = 'kendibo://payment/callback';

export type CheckoutOutcome = 'callback' | 'dismissed';

/**
 * Opens Bachs hosted checkout and waits for the kendibo:// deep-link return
 * when the OS honors it. Banks that block custom schemes just leave the
 * browser open — the user closes it manually ('dismissed') and the caller
 * falls back to webhook verification. The redirect is NEVER trusted alone;
 * always confirm with verifyPaymentStatus.
 */
export async function openCheckoutBrowser(checkoutUrl: string): Promise<CheckoutOutcome> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, CALLBACK_SCHEME);
    if (result.type === 'success' && typeof result.url === 'string' && result.url.startsWith('kendibo://')) {
      return 'callback';
    }
    return 'dismissed';
  } catch {
    return 'dismissed';
  }
}

/**
 * Webhook-truth check: GET /v1/payments/:reference. Returns the uppercase
 * status ('PAID', 'PENDING', ...) or 'UNKNOWN' when the lookup failed.
 */
export async function verifyPaymentStatus(reference: string): Promise<string> {
  if (!reference) return 'UNKNOWN';
  try {
    const data = await apiFetch<{ status?: string }>(
      `/v1/payments/${encodeURIComponent(reference)}`,
    );
    return String(data?.status ?? 'UNKNOWN').toUpperCase();
  } catch {
    return 'UNKNOWN';
  }
}
