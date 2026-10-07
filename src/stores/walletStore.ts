import { create } from 'zustand';
import { PaymentMethod } from '../types';

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  category: 'top_up' | 'booking_payment' | 'refund' | 'withdrawal' | 'promo';
  amountKobo: number;
  title: string;
  description: string;
  reference: string;
  createdAt: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  bookingId?: string;
  paymentMethod?: string;
}

export interface RefundCredit {
  id: string;
  bookingNumber: string;
  serviceName: string;
  amountKobo: number;
  reason: string;
  date: string;
  status: 'available' | 'used';
}

export interface WalletState {
  balanceKobo: number;
  isBalanceHidden: boolean;
  transactions: WalletTransaction[];
  refundCredits: RefundCredit[];

  // Actions
  toggleBalanceVisibility: () => void;
  topUp: (amountKobo: number, methodTitle?: string) => Promise<{ success: boolean; reference: string }>;
  debit: (amountKobo: number, description: string, reference: string, bookingId?: string) => boolean;
  addRefundCredit: (amountKobo: number, bookingNumber: string, serviceName: string, reason: string) => void;
}

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx_wal_001',
    type: 'credit',
    category: 'refund',
    amountKobo: 1250000, // ₦12,500
    title: 'Refund: Cancelled Booking',
    description: 'Instant refund for cancelled AC Installation (KB-8789)',
    reference: 'REF-KB8789-9941',
    createdAt: '2026-10-04T11:20:00.000Z',
    status: 'SUCCESS',
    bookingId: 'job_kb_8789',
    paymentMethod: 'Instant Wallet Refund',
  },
  {
    id: 'tx_wal_002',
    type: 'debit',
    category: 'booking_payment',
    amountKobo: 1075000, // ₦10,750
    title: 'Payment: Pipe Leak Repair',
    description: 'Settled for Booking #KB-8790 with Tunde Adebayo',
    reference: 'PAY-KB8790-3321',
    createdAt: '2026-09-28T10:45:00.000Z',
    status: 'SUCCESS',
    bookingId: 'job_kb_8790',
    paymentMethod: 'Kendibo Wallet',
  },
  {
    id: 'tx_wal_003',
    type: 'credit',
    category: 'top_up',
    amountKobo: 3000000, // ₦30,000
    title: 'Wallet Top-Up: Bachs',
    description: 'Online card payment funded into wallet',
    reference: 'TOP-BACHS-882194',
    createdAt: '2026-09-25T14:10:00.000Z',
    status: 'SUCCESS',
    paymentMethod: 'Mastercard •••• 4242',
  },
  {
    id: 'tx_wal_004',
    type: 'debit',
    category: 'booking_payment',
    amountKobo: 1538700, // ₦15,387
    title: 'Payment: Home Deep Cleaning',
    description: 'Settled for Booking #KB-8810 with Amaka Eze',
    reference: 'PAY-KB8810-1092',
    createdAt: '2026-09-20T09:15:00.000Z',
    status: 'SUCCESS',
    bookingId: 'job_kb_8810',
    paymentMethod: 'Kendibo Wallet',
  },
  {
    id: 'tx_wal_005',
    type: 'credit',
    category: 'promo',
    amountKobo: 500000, // ₦5,000
    title: 'Welcome Bonus Credit',
    description: 'Promo credit granted on account creation',
    reference: 'PROMO-WELCOME-01',
    createdAt: '2026-09-01T08:00:00.000Z',
    status: 'SUCCESS',
    paymentMethod: 'Kendibo Rewards',
  },
];

const INITIAL_REFUND_CREDITS: RefundCredit[] = [
  {
    id: 'ref_001',
    bookingNumber: 'KB-8789',
    serviceName: 'AC Installation & Ducting',
    amountKobo: 1250000,
    reason: 'Cancelled before provider dispatch (100% full refund policy)',
    date: 'Oct 4, 2026',
    status: 'available',
  },
];

export const useWalletStore = create<WalletState>((set, get) => ({
  balanceKobo: 4500000, // ₦45,000
  isBalanceHidden: false,
  transactions: INITIAL_TRANSACTIONS,
  refundCredits: INITIAL_REFUND_CREDITS,

  toggleBalanceVisibility: () => {
    set((state) => ({ isBalanceHidden: !state.isBalanceHidden }));
  },

  topUp: async (amountKobo: number, methodTitle: string = 'Bachs Checkout') => {
    // Simulate real gateway confirmation
    await new Promise((resolve) => setTimeout(resolve, 600));

    const refSuffix = Math.floor(100000 + Math.random() * 900000);
    const reference = `TOP-BACHS-${refSuffix}`;

    const newTx: WalletTransaction = {
      id: `tx_wal_${Date.now()}`,
      type: 'credit',
      category: 'top_up',
      amountKobo,
      title: 'Wallet Top-Up Successful',
      description: `Funded via ${methodTitle}`,
      reference,
      createdAt: new Date().toISOString(),
      status: 'SUCCESS',
      paymentMethod: methodTitle,
    };

    set((state) => ({
      balanceKobo: state.balanceKobo + amountKobo,
      transactions: [newTx, ...state.transactions],
    }));

    return { success: true, reference };
  },

  debit: (amountKobo: number, description: string, reference: string, bookingId?: string) => {
    const currentBalance = get().balanceKobo;
    if (currentBalance < amountKobo) {
      return false;
    }

    const newTx: WalletTransaction = {
      id: `tx_wal_${Date.now()}`,
      type: 'debit',
      category: 'booking_payment',
      amountKobo,
      title: 'Booking Payment',
      description,
      reference,
      createdAt: new Date().toISOString(),
      status: 'SUCCESS',
      bookingId,
      paymentMethod: 'Kendibo Wallet',
    };

    set((state) => ({
      balanceKobo: state.balanceKobo - amountKobo,
      transactions: [newTx, ...state.transactions],
    }));

    return true;
  },

  addRefundCredit: (amountKobo: number, bookingNumber: string, serviceName: string, reason: string) => {
    const refSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `REF-${bookingNumber}-${refSuffix}`;

    const newRefund: RefundCredit = {
      id: `ref_${Date.now()}`,
      bookingNumber,
      serviceName,
      amountKobo,
      reason,
      date: 'Just now',
      status: 'available',
    };

    const newTx: WalletTransaction = {
      id: `tx_wal_${Date.now()}`,
      type: 'credit',
      category: 'refund',
      amountKobo,
      title: `Refund: ${bookingNumber}`,
      description: `Refund credited for ${serviceName}`,
      reference,
      createdAt: new Date().toISOString(),
      status: 'SUCCESS',
      paymentMethod: 'Instant Wallet Refund',
    };

    set((state) => ({
      balanceKobo: state.balanceKobo + amountKobo,
      refundCredits: [newRefund, ...state.refundCredits],
      transactions: [newTx, ...state.transactions],
    }));
  },
}));
