'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'

export function useCart() {
  const { setCart } = useCartStore()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get('/cart')
      setCart(data)
      return data
    },
    enabled: !!user,
  })

  const addItem = useMutation({
    mutationFn: (body: { productId: string; variantId?: string; quantity: number }) =>
      api.post('/cart/items', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Added to cart')
    },
    onError: () => toast.error('Failed to add to cart'),
  })

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/cart/items/${id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => api.delete(`/cart/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Removed from cart')
    },
  })

  const applyCoupon = useMutation({
    mutationFn: (code: string) => api.post('/cart/apply-coupon', { code }),
    onSuccess: () => toast.success('Coupon applied!'),
    onError: () => toast.error('Invalid coupon'),
  })

  return { cart, isLoading, addItem, updateItem, removeItem, applyCoupon }
}
