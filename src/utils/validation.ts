/**
 * KENDIBO Validation Utilities
 * Includes Nigerian phone, email, PIN, and address validations.
 */

/**
 * Validates Nigerian phone numbers.
 * Supports:
 * - "+2348012345678"
 * - "2348012345678"
 * - "08012345678"
 * - "07012345678"
 * - "09012345678"
 * - "09112345678"
 */
export function isValidNigerianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches +234 followed by 10 digits (70, 80, 81, 90, 91, etc.) or 0 followed by 10 digits
  const intlRegex = /^\+?234[789][01]\d{8}$/;
  const localRegex = /^0[789][01]\d{8}$/;
  return intlRegex.test(cleaned) || localRegex.test(cleaned);
}

/**
 * Normalizes a Nigerian phone number to +234 format
 */
export function normalizeNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('+234') && cleaned.length === 14) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Validates standard email addresses
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Validates 4-digit security / completion PIN
 */
export function isValidPin(pin: string): boolean {
  if (!pin) return false;
  return /^\d{4}$/.test(pin.trim());
}

/**
 * Validates 6-digit OTP
 */
export function isValidOtp(otp: string): boolean {
  if (!otp) return false;
  return /^\d{6}$/.test(otp.trim());
}

/**
 * Validates Nigerian address input ensuring minimum landmark and street data
 */
export interface AddressValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateAddress(address: {
  street?: string;
  landmark?: string;
  contactPhone?: string;
  city?: string;
}): AddressValidationResult {
  const errors: Record<string, string> = {};

  if (!address.street || address.street.trim().length < 3) {
    errors.street = 'Street or road name is required';
  }

  if (!address.landmark || address.landmark.trim().length < 3) {
    errors.landmark = 'Landmark is required to assist dispatch';
  }

  if (!address.contactPhone || !isValidNigerianPhone(address.contactPhone)) {
    errors.contactPhone = 'Valid Nigerian contact phone number is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
