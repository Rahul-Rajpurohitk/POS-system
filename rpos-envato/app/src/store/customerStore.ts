import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, Customer, Coupon, Order, Delivery } from '@/types';

// ============================================
// Types
// ============================================

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface DeliveryAddress {
  id?: string;
  label: string; // "Home", "Work", etc.
  address: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  isDefault?: boolean;
}

export interface CustomerState {
  // Cart
  cartItems: CartItem[];
  cartNotes: string;

  // Delivery
  deliveryAddress: DeliveryAddress | null;
  savedAddresses: DeliveryAddress[];
  deliveryInstructions: string;

  // Coupon
  appliedCoupon: Coupon | null;

  // Active order tracking
  activeOrder: Order | null;
  activeDelivery: Delivery | null;

  // Store info (for the customer to see)
  storeInfo: {
    name: string;
    address: string;
    phone?: string;
    hours?: string;
    isOpen: boolean;
  } | null;

  // Actions
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  updateCartItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setCartNotes: (notes: string) => void;

  setDeliveryAddress: (address: DeliveryAddress | null) => void;
  addSavedAddress: (address: DeliveryAddress) => void;
  removeSavedAddress: (addressId: string) => void;
  setDeliveryInstructions: (instructions: string) => void;

  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;

  setActiveOrder: (order: Order | null) => void;
  setActiveDelivery: (delivery: Delivery | null) => void;
  setStoreInfo: (info: CustomerState['storeInfo']) => void;

  // Computed
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getDiscountAmount: () => number;
}

// ============================================
// Store
// ============================================

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      // Initial state
      cartItems: [],
      cartNotes: '',
      deliveryAddress: null,
      savedAddresses: [],
      deliveryInstructions: '',
      appliedCoupon: null,
      activeOrder: null,
      activeDelivery: null,
      storeInfo: null,

      // Cart actions
      addToCart: (product, quantity = 1, notes) => {
        set((state) => {
          const existingIndex = state.cartItems.findIndex(
            (item) => item.product.id === product.id
          );

          if (existingIndex >= 0) {
            // Update existing item
            const newItems = [...state.cartItems];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + quantity,
              notes: notes || newItems[existingIndex].notes,
            };
            return { cartItems: newItems };
          }

          // Add new item
          return {
            cartItems: [...state.cartItems, { product, quantity, notes }],
          };
        });
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cartItems: state.cartItems.filter(
            (item) => item.product.id !== productId
          ),
        }));
      },

      updateCartItemQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      updateCartItemNotes: (productId, notes) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.product.id === productId ? { ...item, notes } : item
          ),
        }));
      },

      clearCart: () => {
        set({
          cartItems: [],
          cartNotes: '',
          appliedCoupon: null,
        });
      },

      setCartNotes: (notes) => {
        set({ cartNotes: notes });
      },

      // Delivery address actions
      setDeliveryAddress: (address) => {
        set({ deliveryAddress: address });
      },

      addSavedAddress: (address) => {
        set((state) => {
          const newAddress = {
            ...address,
            id: address.id || `addr-${Date.now()}`,
          };

          // If this is the first address or marked as default, set it as delivery address
          if (state.savedAddresses.length === 0 || address.isDefault) {
            return {
              savedAddresses: [...state.savedAddresses, newAddress],
              deliveryAddress: newAddress,
            };
          }

          return {
            savedAddresses: [...state.savedAddresses, newAddress],
          };
        });
      },

      removeSavedAddress: (addressId) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((a) => a.id !== addressId),
          deliveryAddress:
            state.deliveryAddress?.id === addressId
              ? null
              : state.deliveryAddress,
        }));
      },

      setDeliveryInstructions: (instructions) => {
        set({ deliveryInstructions: instructions });
      },

      // Coupon actions
      applyCoupon: (coupon) => {
        set({ appliedCoupon: coupon });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null });
      },

      // Order tracking actions
      setActiveOrder: (order) => {
        set({ activeOrder: order });
      },

      setActiveDelivery: (delivery) => {
        set({ activeDelivery: delivery });
      },

      setStoreInfo: (info) => {
        set({ storeInfo: info });
      },

      // Computed values
      getCartTotal: () => {
        const { cartItems } = get();
        return cartItems.reduce(
          (total, item) => total + item.product.sellingPrice * item.quantity,
          0
        );
      },

      getCartItemCount: () => {
        const { cartItems } = get();
        return cartItems.reduce((count, item) => count + item.quantity, 0);
      },

      getDiscountAmount: () => {
        const { appliedCoupon } = get();
        if (!appliedCoupon) return 0;

        const subtotal = get().getCartTotal();

        if (appliedCoupon.type === 'percentage') {
          return (subtotal * appliedCoupon.amount) / 100;
        }

        return Math.min(appliedCoupon.amount, subtotal);
      },
    }),
    {
      name: 'customer-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cartItems: state.cartItems,
        cartNotes: state.cartNotes,
        deliveryAddress: state.deliveryAddress,
        savedAddresses: state.savedAddresses,
        deliveryInstructions: state.deliveryInstructions,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const selectCartItems = (state: CustomerState) => state.cartItems;
export const selectCartItemCount = (state: CustomerState) => state.getCartItemCount();
export const selectCartTotal = (state: CustomerState) => state.getCartTotal();
export const selectDeliveryAddress = (state: CustomerState) => state.deliveryAddress;
export const selectSavedAddresses = (state: CustomerState) => state.savedAddresses;
export const selectAppliedCoupon = (state: CustomerState) => state.appliedCoupon;
export const selectActiveOrder = (state: CustomerState) => state.activeOrder;
export const selectActiveDelivery = (state: CustomerState) => state.activeDelivery;
export const selectStoreInfo = (state: CustomerState) => state.storeInfo;

export default useCustomerStore;
