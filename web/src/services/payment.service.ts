import type { Stripe, StripeElements } from '@stripe/stripe-js'
import api from '@/lib/api'
import type { CheckoutPaymentData } from '@/types'

export interface PaymentRequest {
  addressId: string
  shippingMethod: string
  couponCode?: string
}

export interface ConfirmOrderRequest {
  paymentIntentId: string
  addressId: string
  shippingAmount: number
  discountAmount: number
  totalAmount: number
}

export type CardConfirmationResult = { status: 'succeeded' } | { status: 'failed'; message: string }

export async function createPaymentIntent(request: PaymentRequest): Promise<CheckoutPaymentData> {
  const { data } = await api.post<CheckoutPaymentData>('/payments/create-intent', request)
  return data
}

export async function createBankTransferOrder(
  request: PaymentRequest,
): Promise<{ orderId: string }> {
  const { data } = await api.post<{ orderId: string }>('/payments/bank-transfer-order', request)
  return data
}

export async function confirmOrder(request: ConfirmOrderRequest): Promise<void> {
  await api.post('/payments/confirm-order', request)
}

export async function confirmCardPayment(
  stripe: Pick<Stripe, 'confirmCardPayment'>,
  elements: Pick<StripeElements, 'getElement'>,
  clientSecret: string,
): Promise<CardConfirmationResult> {
  const card = elements.getElement('card')
  if (!card) {
    return { status: 'failed', message: 'Card element not ready' }
  }

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card },
  })

  if (error) {
    return {
      status: 'failed',
      message: error.message || 'Payment could not be verified',
    }
  }

  if (paymentIntent?.status !== 'succeeded') {
    return {
      status: 'failed',
      message: 'Payment is still pending. Please try again.',
    }
  }

  return { status: 'succeeded' }
}
