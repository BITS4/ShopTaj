'use client'

import { useState, type FormEvent } from 'react'
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatPrice } from '@/lib/utils'
import {
  confirmCardPayment as confirmStripeCardPayment,
  confirmOrder,
} from '@/services/payment.service'
import { useCartStore } from '@/store/cart.store'
import { useT } from '@/store/language.store'

export interface CheckoutPaymentFormProps {
  clientSecret: string
  total: number
  paymentIntentId: string
  addressId: string
  shippingAmount: number
  discountAmount: number
  totalAmount: number
}

type PaymentStatus = 'idle' | 'paying' | 'creating' | 'done'

export function CheckoutPaymentForm({
  clientSecret,
  total,
  paymentIntentId,
  addressId,
  shippingAmount,
  discountAmount,
  totalAmount,
}: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const t = useT()
  const queryClient = useQueryClient()
  const setCart = useCartStore((state) => state.setCart)
  const [cardReady, setCardReady] = useState(false)
  const [status, setStatus] = useState<PaymentStatus>('idle')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements || !cardReady || status !== 'idle') return

    setStatus('paying')
    try {
      const confirmation = await confirmStripeCardPayment(stripe, elements, clientSecret)
      if (confirmation.status === 'failed') {
        toast.error(confirmation.message)
        setStatus('idle')
        return
      }

      setStatus('creating')
      await confirmOrder({
        paymentIntentId,
        addressId,
        shippingAmount: Number(shippingAmount),
        discountAmount: Number(discountAmount),
        totalAmount: Number(totalAmount),
      })
      setCart({ id: '', items: [], total: 0 })
      queryClient.removeQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      setStatus('done')
      toast.success('Payment successful! 🎉')
      router.push('/checkout/success')
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Order creation failed. Please contact support.'), {
        duration: 8000,
      })
      setStatus('idle')
    }
  }

  const buttonLabel: Record<PaymentStatus, string> = {
    idle: `${t.checkout.pay} ${formatPrice(total)}`,
    paying: 'Verifying payment…',
    creating: 'Creating your order…',
    done: 'Redirecting…',
  }
  const isReady = Boolean(stripe && elements && cardReady)
  const isSubmitting = status !== 'idle'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="min-h-[44px] rounded-md border bg-white p-4">
        <CardElement
          onReady={() => setCardReady(true)}
          options={{
            style: {
              base: {
                color: '#374151',
                fontSize: '16px',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      {!cardReady && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Loading payment form…
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isReady}>
        {!isReady ? 'Loading…' : buttonLabel[status]}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {process.env.NODE_ENV === 'production' ? '🔒 Secured by Stripe' : t.checkout.test_card}
      </p>
    </form>
  )
}
