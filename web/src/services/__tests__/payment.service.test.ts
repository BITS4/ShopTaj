import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmCardPayment,
  confirmOrder,
  createBankTransferOrder,
  createPaymentIntent,
} from '@/services/payment.service'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  default: { post: mocks.post },
}))

describe('payment service', () => {
  beforeEach(() => {
    mocks.post.mockReset()
  })

  it('uses typed API operations for payment intent and bank-transfer orders', async () => {
    const request = {
      addressId: 'address-1',
      shippingMethod: 'standard',
      couponCode: 'SAVE10',
    }
    const intent = { clientSecret: 'secret', paymentIntentId: 'pi-1' }
    mocks.post
      .mockResolvedValueOnce({ data: intent })
      .mockResolvedValueOnce({ data: { orderId: 'order-1' } })

    await expect(createPaymentIntent(request)).resolves.toBe(intent)
    await expect(createBankTransferOrder(request)).resolves.toEqual({
      orderId: 'order-1',
    })
    expect(mocks.post).toHaveBeenNthCalledWith(1, '/payments/create-intent', request)
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/payments/bank-transfer-order', request)
  })

  it('confirms an order using numeric totals', async () => {
    mocks.post.mockResolvedValue({ data: {} })
    const request = {
      paymentIntentId: 'pi-1',
      addressId: 'address-1',
      shippingAmount: 10,
      discountAmount: 5,
      totalAmount: 105,
    }

    await confirmOrder(request)
    expect(mocks.post).toHaveBeenCalledWith('/payments/confirm-order', request)
  })

  it('confirms a ready card and returns a stable success result', async () => {
    const card = { id: 'card-element' }
    const elements = {
      getElement: vi.fn().mockReturnValue(card),
    } as unknown as Pick<StripeElements, 'getElement'>
    const stripe = {
      confirmCardPayment: vi.fn().mockResolvedValue({
        paymentIntent: { status: 'succeeded' },
      }),
    } as unknown as Pick<Stripe, 'confirmCardPayment'>

    await expect(confirmCardPayment(stripe, elements, 'secret-1')).resolves.toEqual({
      status: 'succeeded',
    })
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith('secret-1', {
      payment_method: { card },
    })
  })

  it.each([
    {
      response: { error: { message: 'Card declined' } },
      message: 'Card declined',
    },
    {
      response: { paymentIntent: { status: 'processing' } },
      message: 'Payment is still pending. Please try again.',
    },
  ])('normalises an unsuccessful Stripe response', async ({ response, message }) => {
    const elements = {
      getElement: vi.fn().mockReturnValue({ id: 'card-element' }),
    } as unknown as Pick<StripeElements, 'getElement'>
    const stripe = {
      confirmCardPayment: vi.fn().mockResolvedValue(response),
    } as unknown as Pick<Stripe, 'confirmCardPayment'>

    await expect(confirmCardPayment(stripe, elements, 'secret-1')).resolves.toEqual({
      status: 'failed',
      message,
    })
  })

  it('does not call Stripe before the card element is ready', async () => {
    const elements = {
      getElement: vi.fn().mockReturnValue(null),
    } as unknown as Pick<StripeElements, 'getElement'>
    const stripe = {
      confirmCardPayment: vi.fn(),
    } as unknown as Pick<Stripe, 'confirmCardPayment'>

    await expect(confirmCardPayment(stripe, elements, 'secret-1')).resolves.toEqual({
      status: 'failed',
      message: 'Card element not ready',
    })
    expect(stripe.confirmCardPayment).not.toHaveBeenCalled()
  })
})
