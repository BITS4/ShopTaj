import { afterEach, describe, expect, it } from 'vitest'
import { useCartStore } from '@/store/cart.store'
import type { Cart } from '@/types'

const cart: Cart = {
  id: 'cart-1',
  total: 65,
  items: [
    {
      id: 'item-1',
      quantity: 2,
      product: {
        id: 'product-1',
        name: 'Tea',
        slug: 'tea',
        price: 25,
        stock: 10,
        isFeatured: false,
        tags: [],
        category: { id: 'category-1', name: 'Food', slug: 'food' },
        images: [],
        variants: [],
      },
    },
    {
      id: 'item-2',
      quantity: 3,
      product: {
        id: 'product-2',
        name: 'Honey',
        slug: 'honey',
        price: 5,
        stock: 10,
        isFeatured: false,
        tags: [],
        category: { id: 'category-1', name: 'Food', slug: 'food' },
        images: [],
        variants: [],
      },
    },
  ],
}

afterEach(() => {
  useCartStore.setState({ cart: null, isOpen: false })
})

describe('cart store', () => {
  it('counts quantities across all cart lines', () => {
    useCartStore.getState().setCart(cart)

    expect(useCartStore.getState().itemCount()).toBe(5)
  })

  it('returns zero before a cart has loaded', () => {
    expect(useCartStore.getState().itemCount()).toBe(0)
  })

  it('opens, closes, and toggles the cart drawer', () => {
    useCartStore.getState().openCart()
    expect(useCartStore.getState().isOpen).toBe(true)

    useCartStore.getState().toggleCart()
    expect(useCartStore.getState().isOpen).toBe(false)

    useCartStore.getState().openCart()
    useCartStore.getState().closeCart()
    expect(useCartStore.getState().isOpen).toBe(false)
  })
})
