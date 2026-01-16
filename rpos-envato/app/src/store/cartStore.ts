import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Product, Customer, Coupon, CartItem, OrderPayment } from '@/types';
import { useSettingsStore } from './settingsStore';

interface CartStore {
  // State
  items: CartItem[];
  customer: Customer | null;
  coupon: Coupon | null;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setCoupon: (coupon: Coupon | null) => void;
  clear: () => void;
  clearCart: () => void; // Alias for clear()

  // Computed values (matching original POS logic exactly)
  getSubTotal: () => number;
  getDiscount: () => number;
  getVat: () => number;
  getTotal: () => number;
  getPayment: () => OrderPayment;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  immer((set, get) => ({
    // Initial state
    items: [],
    customer: null,
    coupon: null,

    // Add item - if exists, increment quantity
    addItem: (product, quantity = 1) =>
      set((state) => {
        const existingIndex = state.items.findIndex(
          (item) => item.product.id === product.id
        );

        if (existingIndex !== -1) {
          // Product exists - increment quantity
          state.items[existingIndex].quantity += quantity;
        } else {
          // New product - add to cart
          state.items.push({ product, quantity });
        }
      }),

    // Remove item from cart
    removeItem: (productId) =>
      set((state) => {
        state.items = state.items.filter(
          (item) => item.product.id !== productId
        );
      }),

    // Update item quantity
    updateQuantity: (productId, quantity) =>
      set((state) => {
        const item = state.items.find((i) => i.product.id === productId);
        if (item) {
          if (quantity <= 0) {
            state.items = state.items.filter(
              (i) => i.product.id !== productId
            );
          } else {
            item.quantity = quantity;
          }
        }
      }),

    // Increment quantity by 1
    incrementQuantity: (productId) =>
      set((state) => {
        const item = state.items.find((i) => i.product.id === productId);
        if (item) {
          item.quantity += 1;
        }
      }),

    // Decrement quantity by 1
    decrementQuantity: (productId) =>
      set((state) => {
        const item = state.items.find((i) => i.product.id === productId);
        if (item) {
          if (item.quantity <= 1) {
            state.items = state.items.filter(
              (i) => i.product.id !== productId
            );
          } else {
            item.quantity -= 1;
          }
        }
      }),

    // Set customer
    setCustomer: (customer) =>
      set((state) => {
        state.customer = customer;
      }),

    // Set coupon
    setCoupon: (coupon) =>
      set((state) => {
        state.coupon = coupon;
      }),

    // Clear cart
    clear: () =>
      set((state) => {
        state.items = [];
        state.customer = null;
        state.coupon = null;
      }),

    // Alias for clear()
    clearCart: () =>
      set((state) => {
        state.items = [];
        state.customer = null;
        state.coupon = null;
      }),

    // ============================================
    // CRITICAL: Order Calculation Logic
    // Preserved from original POS/index.js
    // ============================================

    // Calculate subtotal with rounding
    getSubTotal: () => {
      const { items } = get();
      const subTotal = items.reduce(
        (sum, item) => sum + item.product.sellingPrice * item.quantity,
        0
      );
      // Preserve original rounding: Math.round(subTotal * 10) / 10
      return Math.round(subTotal * 10) / 10;
    },

    // Calculate discount based on coupon type
    getDiscount: () => {
      const { coupon } = get();
      const subTotal = get().getSubTotal();

      if (!coupon) return 0;

      // Preserve original logic: percentage or fixed amount
      const discount =
        coupon.type === 'percentage'
          ? (subTotal * coupon.amount) / 100
          : coupon.amount;

      // Preserve original rounding: Math.round(discount)
      return Math.round(discount);
    },

    // Calculate VAT from settings
    getVat: () => {
      const settings = useSettingsStore.getState().settings;
      const subTotal = get().getSubTotal();

      // Preserve original logic: VAT > 0 ? Math.round(VAT * subTotal) / 100 : 0
      return settings.tax > 0
        ? Math.round(settings.tax * subTotal) / 100
        : 0;
    },

    // Calculate total
    getTotal: () => {
      const subTotal = get().getSubTotal();
      const discount = get().getDiscount();
      const vat = get().getVat();

      // Preserve original rounding: Math.round((subTotal - discount + vat) * 10) / 10
      return Math.round((subTotal - discount + vat) * 10) / 10;
    },

    // Get full payment object for order
    getPayment: () => ({
      subTotal: get().getSubTotal(),
      discount: get().getDiscount(),
      vat: get().getVat(),
      total: get().getTotal(),
    }),

    // Get total item count
    getItemCount: () => {
      const { items } = get();
      return items.reduce((count, item) => count + item.quantity, 0);
    },
  }))
);

// Selectors
export const selectCartItems = (state: CartStore) => state.items;
export const selectCartCustomer = (state: CartStore) => state.customer;
export const selectCartCoupon = (state: CartStore) => state.coupon;
export const selectCartItemCount = (state: CartStore) => state.getItemCount();
