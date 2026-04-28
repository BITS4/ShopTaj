'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useT } from '@/store/language.store'
import api from '@/lib/api'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || '')

function CheckoutForm({ clientSecret, total }: { clientSecret: string; total: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const t = useT()
  const [paying, setPaying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    const cardEl = elements.getElement(CardElement)!
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardEl },
    })
    if (error) {
      toast.error(error.message)
    } else if (paymentIntent?.status === 'succeeded') {
      toast.success('Payment successful! 🎉')
      router.push('/checkout/success')
    }
    setPaying(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-md p-3">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={paying}>
        {paying ? t.checkout.processing : `${t.checkout.pay} ${formatPrice(total)}`}
      </Button>
      <p className="text-xs text-center text-muted-foreground">{t.checkout.test_card}</p>
    </form>
  )
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const couponCode = searchParams.get('coupon') ?? ''
  const t = useT()
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get('/users/me/addresses'); return data },
  })

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const { data } = await api.get('/cart'); return data },
  })

  const createIntent = async () => {
    if (!selectedAddress) { toast.error(t.checkout.delivery_address); return }
    setLoading(true)
    try {
      const { data } = await api.post('/payments/create-intent', {
        addressId: selectedAddress,
        couponCode: couponCode || undefined,
        shippingMethod,
      })
      setPaymentData(data)
    } catch {
      toast.error(t.common.error)
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.checkout.title}</h1>
      <div className="space-y-6">
        {/* Address */}
        <Card>
          <CardHeader><CardTitle>{t.checkout.delivery_address}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!addresses?.length ? (
              <p className="text-sm text-muted-foreground">
                {t.checkout.no_address} <a href="/profile" className="text-primary underline">{t.checkout.add_in_profile}</a>.
              </p>
            ) : (
              addresses.map((addr: any) => (
                <label key={addr.id} className={`flex gap-3 border rounded-lg p-3 cursor-pointer transition ${selectedAddress === addr.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}>
                  <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1" />
                  <div className="text-sm">
                    <p className="font-semibold">{addr.label}</p>
                    <p className="text-muted-foreground">{addr.street}, {addr.city}, {addr.country} {addr.zip}</p>
                  </div>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader><CardTitle>{t.checkout.shipping_method}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'standard', label: t.checkout.standard, price: '$5.00', days: t.checkout.standard_days },
              { id: 'express', label: t.checkout.express, price: '$15.00', days: t.checkout.express_days },
            ].map((m) => (
              <label key={m.id} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition ${shippingMethod === m.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}>
                <input type="radio" name="shipping" value={m.id} checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} />
                <div className="flex-1 text-sm"><p className="font-semibold">{m.label}</p><p className="text-muted-foreground">{m.days}</p></div>
                <span className="font-semibold">{m.price}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Summary */}
        {cart && (
          <Card>
            <CardHeader><CardTitle>{t.checkout.order_summary}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {cart.items.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>{formatPrice(Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price) * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>{t.cart.subtotal}</span><span>{formatPrice(cart.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment */}
        {!paymentData ? (
          <Button className="w-full" size="lg" onClick={createIntent} disabled={loading}>
            {loading ? t.checkout.loading : t.checkout.continue_payment}
          </Button>
        ) : (
          <Card>
            <CardHeader><CardTitle>{t.checkout.payment_details}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 mb-4 bg-muted rounded-md p-3">
                <div className="flex justify-between"><span>{t.cart.subtotal}</span><span>{formatPrice(paymentData.subtotal)}</span></div>
                {paymentData.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>{t.cart.discount}</span><span>-{formatPrice(paymentData.discountAmount)}</span></div>}
                <div className="flex justify-between"><span>{t.checkout.shipping}</span><span>{formatPrice(paymentData.shippingAmount)}</span></div>
                <div className="flex justify-between font-bold pt-1 border-t"><span>{t.cart.total}</span><span>{formatPrice(paymentData.totalAmount)}</span></div>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
                <CheckoutForm clientSecret={paymentData.clientSecret} total={paymentData.totalAmount} />
              </Elements>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
