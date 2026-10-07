import { create } from 'zustand';
import { CartItem, Service, ServiceAddOn } from '../types';

export interface CartState {
  items: CartItem[];
  promoCode: string | null;
  subtotal: number; // in integer kobo
  discount: number; // in integer kobo
  vat: number; // in integer kobo (7.5%)
  total: number; // in integer kobo

  // Actions
  addItem: (
    service: Service,
    selectedAddOns?: Array<{ addOn: ServiceAddOn; quantity: number }>
  ) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  applyPromo: (code: string, discountKobo: number) => void;
  removePromo: () => void;
  getSubtotal: () => number;
  getVat: () => number;
  getTotal: () => number;
}

const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((acc, item) => acc + item.subtotalKobo, 0);
};

const calculateVat = (subtotalKobo: number): number => {
  return Math.round(subtotalKobo * 0.075);
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promoCode: null,
  subtotal: 0,
  discount: 0,
  vat: 0,
  total: 0,

  addItem: (service, selectedAddOns = []) => {
    const addOnsTotal = selectedAddOns.reduce(
      (sum, item) => sum + item.addOn.priceKobo * item.quantity,
      0
    );
    const itemSubtotal = service.priceKobo + addOnsTotal;

    const newItem: CartItem = {
      service,
      selectedAddOns,
      subtotalKobo: itemSubtotal,
    };

    const currentItems = get().items;
    const existingIndex = currentItems.findIndex(
      (i) => i.service.id === service.id
    );

    let updatedItems: CartItem[];
    if (existingIndex >= 0) {
      updatedItems = [...currentItems];
      updatedItems[existingIndex] = newItem;
    } else {
      updatedItems = [...currentItems, newItem];
    }

    const subtotal = calculateSubtotal(updatedItems);
    const discount = get().discount;
    const vat = calculateVat(subtotal);
    const total = Math.max(0, subtotal - discount + vat);

    set({
      items: updatedItems,
      subtotal,
      vat,
      total,
    });
  },

  removeItem: (serviceId: string) => {
    const updatedItems = get().items.filter(
      (item) => item.service.id !== serviceId
    );
    const subtotal = calculateSubtotal(updatedItems);
    const discount = updatedItems.length === 0 ? 0 : get().discount;
    const vat = calculateVat(subtotal);
    const total = Math.max(0, subtotal - discount + vat);

    set({
      items: updatedItems,
      subtotal,
      discount,
      promoCode: updatedItems.length === 0 ? null : get().promoCode,
      vat,
      total,
    });
  },

  clearCart: () => {
    set({
      items: [],
      promoCode: null,
      subtotal: 0,
      discount: 0,
      vat: 0,
      total: 0,
    });
  },

  applyPromo: (code: string, discountKobo: number) => {
    const subtotal = get().subtotal;
    const discount = Math.min(discountKobo, subtotal);
    const vat = get().vat;
    const total = Math.max(0, subtotal - discount + vat);

    set({
      promoCode: code,
      discount,
      total,
    });
  },

  removePromo: () => {
    const subtotal = get().subtotal;
    const vat = get().vat;
    const total = subtotal + vat;

    set({
      promoCode: null,
      discount: 0,
      total,
    });
  },

  getSubtotal: () => get().subtotal,
  getVat: () => get().vat,
  getTotal: () => get().total,
}));
