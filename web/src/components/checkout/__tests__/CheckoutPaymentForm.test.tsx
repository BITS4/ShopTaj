import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckoutPaymentForm } from '@/components/checkout/CheckoutPaymentForm'
import { useCartStore } from '@/store/cart.store'

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  cardElement: { id: 'card-element' },
  routerPush: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  useElements: vi.fn(),
  useStripe: vi.fn(),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: function MockCardElement({ onReady }: { onReady: () => void }) {
    return (
      <button type="button" onClick={onReady}>
        Card input
      </button>
    )
  },
  useElements: mocks.useElements,
  useStripe: mocks.useStripe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/lib/api', () => ({
  default: { post: mocks.apiPost },
}))

vi.mock('@/store/language.store', () => ({
  useT: () => ({
    checkout: { pay: 'Pay', test_card: 'Use the Stripe test card' },
  }),
}))

const props = {
  clientSecret: 'secret-1',
  total: 120,
  paymentIntentId: 'pi-1',
  addressId: 'address-1',
  shippingAmount: 10,
  discountAmount: 5,
  totalAmount: 120,
}

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('CheckoutPaymentForm', () => {
  beforeEach(() => {
    mocks.useStripe.mockReturnValue(null)
    mocks.useElements.mockReturnValue(null)
    mocks.apiPost.mockResolvedValue({ data: {} })
    useCartStore.setState({ cart: null, isOpen: false })
  })

  it('keeps submit disabled until Stripe, Elements, and the card are ready', async () => {
    const user = userEvent.setup()
    const confirmCardPayment = vi.fn()
    mocks.useStripe.mockReturnValue({ confirmCardPayment })
    mocks.useElements.mockReturnValue({ getElement: vi.fn(() => mocks.cardElement) })

    render(<CheckoutPaymentForm {...props} />, { wrapper: TestProviders })

    const submit = screen.getByRole('button', { name: 'Loading…' })
    expect(submit).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Loading payment form…')

    await user.click(screen.getByRole('button', { name: 'Card input' }))

    expect(submit).toBeEnabled()
    expect(submit).toHaveTextContent(/Pay/)
  })

  it('remains disabled when Stripe has not loaded', () => {
    render(<CheckoutPaymentForm {...props} />, { wrapper: TestProviders })

    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled()
  })

  it('confirms a successful payment, clears the cart, and redirects', async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      paymentIntent: { status: 'succeeded' },
    })
    const getElement = vi.fn(() => mocks.cardElement)
    mocks.useStripe.mockReturnValue({ confirmCardPayment })
    mocks.useElements.mockReturnValue({ getElement })
    useCartStore.setState({
      cart: { id: 'cart-1', items: [], total: 120 },
      isOpen: false,
    })

    render(<CheckoutPaymentForm {...props} />, { wrapper: TestProviders })
    fireEvent.click(screen.getByRole('button', { name: 'Card input' }))
    fireEvent.click(screen.getByRole('button', { name: /Pay/ }))

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/payments/confirm-order', {
        paymentIntentId: 'pi-1',
        addressId: 'address-1',
        shippingAmount: 10,
        discountAmount: 5,
        totalAmount: 120,
      })
    })
    expect(confirmCardPayment).toHaveBeenCalledWith('secret-1', {
      payment_method: { card: mocks.cardElement },
    })
    expect(useCartStore.getState().cart).toEqual({ id: '', items: [], total: 0 })
    expect(mocks.routerPush).toHaveBeenCalledWith('/checkout/success')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Payment successful! 🎉')
  })
})
