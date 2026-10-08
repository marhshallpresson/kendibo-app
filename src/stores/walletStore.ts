import { create } from 'zustand';
import { apiFetch } from '../services/api/client';

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
  isLoading: boolean;

  // Actions
  toggleBalanceVisibility: () => void;
  refresh: () => Promise<void>;
  topUp: (amountKobo: number, methodTitle?: string) => Promise<{ success: boolean; reference: string }>;
  debit: (amountKobo: number, description: string, reference: string, bookingId?: string) => boolean;
  addRefundCredit: (amountKobo: number, bookingNumber: string, serviceName: string, reason: string) => void;
}

interface ServerTxn {
  id: string;
  kind: 'topup' | 'payment' | 'refund' | 'payout';
  amountKobo: number;
  ref: string;
  bookingId?: string;
  createdAt: string;
}

function mapServerTxn(t: ServerTxn): WalletTransaction {
  const type: 'credit' | 'debit' = t.kind === 'topup' || t.kind === 'refund' ? 'credit' : 'debit';
  const category: WalletTransaction['category'] =
    t.kind === 'topup' ? 'top_up' : t.kind === 'refund' ? 'refund' : t.kind === 'payout' ? 'withdrawal' : 'booking_payment';
  const titles: Record<ServerTxn['kind'], string> = {
    topup: 'Wallet Top-Up',
    payment: 'Booking Payment',
    refund: 'Refund',
    payout: 'Withdrawal',
  };
  return {
    id: t.id,
    type,
    category,
    amountKobo: t.amountKobo,
    title: titles[t.kind],
    description: t.ref,
    reference: t.ref,
    createdAt: t.createdAt,
    status: 'SUCCESS',
    bookingId: t.bookingId,
  };
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balanceKobo: 0,
  isBalanceHidden: false,
  transactions: [],
  refundCredits: [],
  isLoading: false,

  toggleBalanceVisibility: () => {
    set((state) => ({ isBalanceHidden: !state.isBalanceHidden }));
  },

  refresh: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ balanceKobo: number; txns: ServerTxn[] }>('/v1/wallet');
      const txns = Array.isArray(data?.txns) ? [...data.txns].reverse().map(mapServerTxn) : [];
      const refundCredits: RefundCredit[] = txns
        .filter((t) => t.category === 'refund')
        .map((t) => ({
          id: t.id,
          bookingNumber: t.bookingId ?? t.reference,
          serviceName: t.description,
          amountKobo: t.amountKobo,
          reason: 'Refund credited to wallet',
          date: t.createdAt,
          status: 'available' as const,
        }));
      set({ balanceKobo: data?.balanceKobo ?? 0, transactions: txns, refundCredits });
    } catch {
      // Leave previous state; the wallet screen shows a refresh affordance.
    } finally {
      set({ isLoading: false });
    }
  },

  topUp: async (amountKobo: number, _methodTitle: string = 'Bachs Checkout') => {
    try {
      const session = await apiFetch<{ checkoutUrl?: string; reference?: string }>('/v1/wallet/topup', {
        method: 'POST',
        body: { amountKobo },
      });

      if (session?.checkoutUrl) {
        const WebBrowser = require('expo-web-browser');
        const result = await WebBrowser.openBrowserAsync(session.checkoutUrl);
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { success: false, reference: session.reference ?? '' };
        }
      }

      // Webhook is the source of truth — refresh from the backend.
      await get().refresh();
      return { success: true, reference: session?.reference || '' };
    } catch (err) {
      console.warn('TopUp Error:', err);
      return { success: false, reference: '' };
    }
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
    };

    set((state) => ({
      balanceKobo: state.balanceKobo - amountKobo,
      transactions: [newTx, ...state.transactions],
    }));

    return true;
  },

  addRefundCredit: (amountKobo: number, bookingNumber: string, serviceName: string, reason: string) => {
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
      reference: `REF-${bookingNumber}`,
      createdAt: new Date().toISOString(),
      status: 'SUCCESS',
    };

    set((state) => ({
      balanceKobo: state.balanceKobo + amountKobo,
      refundCredits: [newRefund, ...state.refundCredits],
      transactions: [newTx, ...state.transactions],
    }));
  },
}));
