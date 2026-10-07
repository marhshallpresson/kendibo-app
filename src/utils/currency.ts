/**
 * KENDIBO Currency & Financial Utilities
 * Enforces integer kobo calculations (1 Naira = 100 kobo).
 * Never use floating-point for storing or calculating amounts.
 */

export const VAT_RATE = 0.075; // 7.5% Nigerian statutory VAT

/**
 * Converts integer kobo to Naira value (float)
 */
export function koboToNaira(kobo: number): number {
  return Math.floor(kobo) / 100;
}

/**
 * Converts Naira value to integer kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Calculates 7.5% Nigerian statutory VAT in integer kobo
 */
export function calculateVatKobo(subtotalKobo: number): number {
  return Math.round(subtotalKobo * VAT_RATE);
}

/**
 * Formats integer kobo to Nigerian Naira display string with symbol (₦).
 * e.g. 2500000 -> "₦25,000" or 2500050 -> "₦25,000.50"
 */
export function formatKoboToNaira(kobo: number, options?: { showKoboIfZero?: boolean }): string {
  if (kobo === undefined || kobo === null || isNaN(kobo)) {
    return '₦0';
  }

  const naira = Math.floor(kobo) / 100;
  const hasDecimals = kobo % 100 !== 0;

  if (hasDecimals || options?.showKoboIfZero) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(naira).replace('NGN', '₦');
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira).replace('NGN', '₦');
}

/**
 * Computes full price breakdown in integer kobo
 */
export function calculateBookingTotalKobo(
  subtotalKobo: number,
  discountKobo: number = 0,
  calloutFeeKobo: number = 0,
  platformFeeKobo: number = 0
): {
  subtotalKobo: number;
  discountKobo: number;
  calloutFeeKobo: number;
  platformFeeKobo: number;
  vatKobo: number;
  totalKobo: number;
} {
  const taxableBase = Math.max(0, subtotalKobo - discountKobo);
  const vatKobo = calculateVatKobo(taxableBase);
  const totalKobo = Math.max(0, taxableBase + vatKobo + calloutFeeKobo + platformFeeKobo);

  return {
    subtotalKobo,
    discountKobo,
    calloutFeeKobo,
    platformFeeKobo,
    vatKobo,
    totalKobo,
  };
}
