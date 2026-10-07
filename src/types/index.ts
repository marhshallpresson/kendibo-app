/**
 * KENDIBO Core Domain Models & Interface Contracts
 * Adheres to:
 * - PROJECT.md § Interface Contracts
 * - PRD § Data Model & Entity Specifications
 * - Financial Rule: All monetary calculations in integer kobo (NGN 1 = 100 kobo)
 * - Regional Rule: WAT (UTC+1) timezone presentation, Nigerian address hierarchy
 */

// ==========================================
// 1. User & Authentication
// ==========================================
export type UserRole = 'customer' | 'provider' | 'admin' | 'dispatcher';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role?: UserRole;
  hasPin: boolean;
  isBiometricEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  defaultAddressId?: string;
  lowDataMode?: boolean;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface AuthSession {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ==========================================
// 2. Nigerian Address & Location
// ==========================================
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  userId: string;
  label: string; // 'Home' | 'Office' | 'Apartment' | 'Other'
  street: string;
  houseNumber: string;
  estate?: string;
  buildingName?: string;
  floor?: string;
  landmark: string;
  gateInstructions?: string;
  contactPhone: string;
  isDefault: boolean;
  city?: string;
  state?: string;
  coordinates: GeoCoordinates;
  createdAt?: string;
}

// ==========================================
// 3. Service Catalog & Categories
// ==========================================
export type ServiceVertical =
  | 'cleaning'
  | 'ac_repair'
  | 'plumbing'
  | 'electrical'
  | 'generator'
  | 'appliance'
  | 'painting_handyman';

export interface Category {
  id: string;
  name: string;
  slug: ServiceVertical | string;
  description: string;
  iconName: string;
  imageUrl?: string;
  serviceCount?: number;
  sortOrder: number;
  isActive: boolean;
}

export type ServiceCategory = Category;

export interface ServiceAddOn {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  priceKobo: number;
  maxQuantity: number;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceKobo: number;
  durationMinutes: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isQuoteBased: boolean;
  addOns: ServiceAddOn[];
  tagline?: string;
  warrantyDays?: number;
  inclusions?: string[];
  exclusions?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  isActive?: boolean;
  gallery?: string[];
  providerName?: string;
  providerAvatar?: string;
}

// ==========================================
// 4. Provider
// ==========================================
export type ProviderKycStatus = 'pending' | 'verified' | 'rejected';
export type ProviderOperationalStatus = 'online' | 'offline' | 'busy' | 'suspended';

export interface Provider {
  id: string;
  name: string;
  businessName?: string;
  phone: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  experienceYears: number;
  serviceCategoryIds: string[];
  skills?: string[];
  kycStatus?: ProviderKycStatus;
  operationalStatus?: ProviderOperationalStatus;
  coordinates?: GeoCoordinates;
}

// ==========================================
// 5. Booking & 19-Stage State Machine
// ==========================================
export type JobStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'MATCHING'
  | 'PROVIDER_ASSIGNED'
  | 'PROVIDER_ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'CHECK_IN'
  | 'INSPECTION'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'CUSTOMER_CONFIRMATION'
  | 'SETTLEMENT'
  | 'WARRANTY_ACTIVE'
  | 'CLOSED'
  | 'CANCELLED';

export interface JobTimelineEntry {
  status: JobStatus;
  timestamp: string;
  title: string;
  description?: string;
  updatedBy?: string;
}

export type PaymentMethod =
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'USSD'
  | 'WALLET'
  | 'CASH_ON_DELIVERY';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export interface BookingArrivalWindow {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotLabel: string; // "Morning (08:00 - 11:00)"
}

export interface BookingSelectedAddOn {
  addonId: string;
  quantity: number;
  unitPriceKobo: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  serviceId: string;
  addressId: string;
  scheduledAt: string; // ISO 8601 UTC
  status: JobStatus;
  priceKobo: number; // Base service + addons
  vatKobo: number; // Statutory 7.5% VAT in integer kobo
  discountKobo?: number;
  totalKobo: number; // Final payable in integer kobo
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  providerId?: string;
  provider?: Provider;
  service?: Service;
  address?: Address;
  arrivalWindow?: BookingArrivalWindow;
  selectedAddOns?: BookingSelectedAddOn[];
  specialInstructions?: string;
  completionPin?: string;
  checklistCompleted?: boolean;
  beforeEvidenceUrls?: string[];
  afterEvidenceUrls?: string[];
  timeline: JobTimelineEntry[];
  createdAt: string;
  completedAt?: string;
}

// ==========================================
// 6. Payment & Transactions
// ==========================================
export interface PaymentTransaction {
  id: string;
  bookingId: string;
  customerId: string;
  amountKobo: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  paidAt?: string;
  receiptNumber?: string;
}

export interface Wallet {
  userId: string;
  balanceKobo: number;
  ledger: Array<{
    id: string;
    type: 'credit' | 'debit';
    amountKobo: number;
    description: string;
    reference: string;
    createdAt: string;
  }>;
}

// ==========================================
// 7. Diagnostic Quotes & Change Orders
// ==========================================
export type QuoteStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface QuoteItem {
  id: string;
  description: string;
  type: 'labour' | 'parts' | 'callout' | 'fee';
  amountKobo: number;
}

export interface ChangeOrder {
  id: string;
  quoteId: string;
  bookingId: string;
  reason: string;
  evidenceUrls: string[];
  additionalCostKobo: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  resolvedAt?: string;
}

export interface Quote {
  id: string;
  bookingId: string;
  providerId: string;
  diagnosisSummary: string;
  items: QuoteItem[];
  totalKobo: number;
  warrantyDays: number;
  validUntil: string;
  status: QuoteStatus;
  changeOrders?: ChangeOrder[];
  createdAt: string;
}

// ==========================================
// 8. Reviews & Ratings
// ==========================================
export interface Review {
  id: string;
  bookingId: string;
  serviceId: string;
  providerId?: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  tags?: string[]; // 'Punctual', 'Clean', 'Professional'
  comment: string;
  tipKobo?: number;
  createdAt: string;
}

// ==========================================
// 9. Notifications
// ==========================================
export type NotificationType =
  | 'BOOKING_UPDATE'
  | 'PAYMENT_RECEIPT'
  | 'REMINDER'
  | 'PROMOTION'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: {
    bookingId?: string;
    serviceId?: string;
    url?: string;
  };
  createdAt: string;
}

// ==========================================
// 10. Property Assets (Equipment)
// ==========================================
export interface PropertyAsset {
  id: string;
  propertyAddressId: string;
  category: 'ac' | 'generator' | 'refrigerator' | 'water_pump' | 'inverter' | 'other';
  brand: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  serviceIntervalDays: number;
  lastServiceDate?: string;
  status: 'operational' | 'needs_service' | 'faulty';
}

// ==========================================
// 11. Cart & Booking Wizard State
// ==========================================
export interface CartItem {
  service: Service;
  selectedAddOns: Array<{
    addOn: ServiceAddOn;
    quantity: number;
  }>;
  subtotalKobo: number;
}

export interface BookingDraft {
  serviceId: string;
  addressId?: string;
  arrivalWindow?: BookingArrivalWindow;
  selectedAddOns: Array<{
    addonId: string;
    quantity: number;
    unitPriceKobo: number;
  }>;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  discountKobo: number;
}
