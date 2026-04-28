import { create } from 'zustand'
import type { Cart, CartItem } from '@/types'

interface CartState {
  cart: Cart | null
  isOpen: boolean
  setCart: (cart: Cart) => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  itemCount: () => number
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isOpen: false,
  setCart: (cart) => set({ cart }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
  itemCount: () => get().cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
}))
