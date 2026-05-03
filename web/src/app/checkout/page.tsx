'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CheckCircle, Lock, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useT } from '@/store/language.store'
import { useCartStore } from '@/store/cart.store'
import api from '@/lib/api'
import { toast } from 'sonner'
import type { MapLocation } from '@/components/map/DeliveryMap'

// Dynamic import — Leaflet cannot run on server
const DeliveryMap = dynamic(() => import('@/components/map/DeliveryMap'), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-xl bg-muted flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
})

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || '')

// ─── Payment form ────────────────────────────────────────────────────────────
function CheckoutForm({
  clientSecret, total, paymentIntentId, addressId, shippingAmount, discountAmount, totalAmount,
}: {
  clientSecret: string; total: number; paymentIntentId: string
  addressId: string; shippingAmount: number; discountAmount: number; totalAmount: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const t = useT()
  const qc = useQueryClient()
  const { setCart } = useCartStore()
  const [paying, setPaying] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [status, setStatus] = useState<'idle' | 'paying' | 'creating' | 'done'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !cardReady) return
    setPaying(true)
    try {
      const cardEl = elements.getElement(CardElement)
      if (!cardEl) { toast.error('Card element not ready'); setPaying(false); return }

      setStatus('paying')
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardEl },
      })

      if (error) { toast.error(error.message); setPaying(false); setStatus('idle'); return }

      if (paymentIntent?.status === 'succeeded') {
        setStatus('creating')
        await api.post('/payments/confirm-order', {
          paymentIntentId,
          addressId,
          shippingAmount: Number(shippingAmount),
          discountAmount: Number(discountAmount),
          totalAmount: Number(totalAmount),
        })
        setCart({ id: '', items: [], total: 0 })
        qc.removeQueries({ queryKey: ['cart'] })
        qc.invalidateQueries({ queryKey: ['orders'] })
        setStatus('done')
        toast.success('Payment successful! 🎉')
        router.push('/checkout/success')
      }
    } catch (err: any) {
      console.error('Checkout error:', err?.response?.data || err?.message || err)
      toast.error(err?.response?.data?.message || 'Order creation failed. Please contact support.', { duration: 8000 })
      setStatus('idle')
      setPaying(false)
    }
  }

  const btnLabel = { idle: `${t.checkout.pay} ${formatPrice(total)}`, paying: 'Verifying payment…', creating: 'Creating your order…', done: 'Redirecting…' }[status]
  const isReady = !!stripe && !!elements && cardReady

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-md p-4 bg-white min-h-[44px]">
        <CardElement
          onReady={() => setCardReady(true)}
          options={{ style: { base: { fontSize: '16px', color: '#374151', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } }}
        />
      </div>
      {!cardReady && <p className="text-xs text-center text-muted-foreground">Loading payment form…</p>}
      <Button type="submit" className="w-full" size="lg" disabled={paying || !isReady}>
        {!isReady ? 'Loading…' : btnLabel}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        {process.env.NODE_ENV === 'production'
          ? '🔒 Secured by Stripe'
          : t.checkout.test_card}
      </p>
    </form>
  )
}

// ─── Main checkout page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const couponCode = searchParams.get('coupon') ?? ''
  const t = useT()

  // Address state
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [newAddrForm, setNewAddrForm] = useState({ label: 'Home', street: '', city: '', country: 'Tajikistan', zip: '', houseNumber: '' })
  const [savingAddr, setSavingAddr] = useState(false)

  // Shipping state
  const [shippingMethod, setShippingMethod] = useState('standard')

  // Payment state — once set, address & shipping are LOCKED
  const [paymentData, setPaymentData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [payMethod, setPayMethod] = useState<'card' | 'korti_milli' | 'dc_bank'>('card')

  const locked = !!paymentData // true after "Continue to Payment" is clicked

  const { data: addresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get('/users/me/addresses'); return data },
  })

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const { data } = await api.get('/cart'); return data },
    staleTime: 0,
    refetchOnMount: true,
  })

  // When map location is picked, auto-fill address form with all fields
  const handleMapSelect = (loc: MapLocation) => {
    setMapLocation(loc)
    setNewAddrForm((prev) => ({
      ...prev,
      street: loc.street || loc.address || '',
      city: loc.city || 'Dushanbe',
      country: 'Tajikistan',
      houseNumber: loc.houseNumber || prev.houseNumber,
    }))
  }

  const saveMapAddress = async () => {
    if (!mapLocation) { toast.error('Please select a location on the map'); return }
    setSavingAddr(true)
    try {
      const fullStreet = newAddrForm.houseNumber
        ? `${newAddrForm.street}, д. ${newAddrForm.houseNumber}`
        : newAddrForm.street || mapLocation.address
      const { data: newAddr } = await api.post('/users/me/addresses', {
        label: newAddrForm.label,
        street: fullStreet,
        city: newAddrForm.city || mapLocation.city,
        state: mapLocation.district || mapLocation.neighborhood || undefined,
        country: 'Tajikistan',
        zip: newAddrForm.zip || '000000',
      })
      await refetchAddresses()
      setSelectedAddress(newAddr.id)
      setShowMap(false)
      toast.success('Address saved!')
    } catch {
      toast.error('Failed to save address')
    }
    setSavingAddr(false)
  }

  const handleKortiMilli = async () => {
    if (!cartLoading && cart && !cart.items?.length) {
      toast.error('Your cart is empty. Please add items before checking out.')
      return
    }
    if (!selectedAddress && !mapLocation) { toast.error('Please select a delivery address'); return }
    let addrId = selectedAddress
    if (!addrId && mapLocation) {
      setSavingAddr(true)
      try {
        const { data: newAddr } = await api.post('/users/me/addresses', {
          label: 'Delivery Point', street: mapLocation.address, city: mapLocation.city, country: 'Tajikistan', zip: '000000',
        })
        addrId = newAddr.id
        await refetchAddresses()
      } catch { toast.error('Failed to save address'); setSavingAddr(false); return }
      setSavingAddr(false)
    }
    setLoading(true)
    try {
      const { data } = await api.post('/payments/bank-transfer-order', {
        addressId: addrId,
        shippingMethod,
        couponCode: couponCode || undefined,
      })
      router.push(`/checkout/success?orderId=${data.orderId}&method=${payMethod}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to place order')
      setLoading(false)
    }
  }

  const createIntent = async () => {
    if (!selectedAddress && !mapLocation) {
      toast.error('Please select or add a delivery address')
      return
    }

    // If no address selected but map location exists, save it first
    let addrId = selectedAddress
    if (!addrId && mapLocation) {
      setSavingAddr(true)
      try {
        const { data: newAddr } = await api.post('/users/me/addresses', {
          label: 'Delivery Point',
          street: mapLocation.address,
          city: mapLocation.city,
          country: 'Tajikistan',
          zip: '000000',
        })
        addrId = newAddr.id
        setSelectedAddress(addrId)
        await refetchAddresses()
      } catch {
        toast.error('Failed to save address')
        setSavingAddr(false)
        return
      }
      setSavingAddr(false)
    }

    if (!cartLoading && cart && !cart.items?.length) {
      toast.error('Your cart is empty. Please add items before checking out.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/payments/create-intent', {
        addressId: addrId,
        couponCode: couponCode || undefined,
        shippingMethod,
      })
      setPaymentData(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || t.common.error)
    }
    setLoading(false)
  }

  const selectedAddrData = addresses?.find((a: any) => a.id === selectedAddress)

  if (!cartLoading && cart && cart.items?.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-2xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some products before checking out.</p>
        <Button onClick={() => router.push('/products')}>Browse Products</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.checkout.title}</h1>
      <div className="space-y-6">

        {/* ── Delivery Address ── */}
        <Card className={locked ? 'opacity-75' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                {t.checkout.delivery_address}
              </CardTitle>
              {!locked && (
                <Button size="sm" variant="outline" onClick={() => setShowMap(!showMap)}>
                  <MapPin className="h-4 w-4 mr-2" />
                  {showMap ? 'Hide Map' : 'Pick on Map'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Saved addresses */}
            {addresses?.length > 0 && (
              <div className="space-y-2">
                {addresses.map((addr: any) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 border rounded-lg p-3 transition ${
                      locked
                        ? selectedAddress === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'hidden'
                        : selectedAddress === addr.id
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'hover:border-muted-foreground cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => !locked && setSelectedAddress(addr.id)}
                      disabled={locked}
                      className="mt-1"
                    />
                    <div className="text-sm flex-1">
                      <p className="font-semibold flex items-center gap-2">
                        {addr.label}
                        {selectedAddress === addr.id && locked && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </p>
                      <p className="text-muted-foreground">{addr.street}</p>
                      <p className="text-muted-foreground text-xs">
                        {[addr.state, addr.city, addr.country, addr.zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Map */}
            {!locked && showMap && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Click on the map or use "My Location" to set your delivery point
                </p>
                <DeliveryMap onSelect={handleMapSelect} selected={mapLocation} />

                {mapLocation && (
                  <div className="space-y-3 border rounded-xl p-4 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm Address Details</p>

                    {/* Full address preview */}
                    {mapLocation.fullAddress && (
                      <div className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <p className="font-medium text-primary text-xs mb-1">Detected address</p>
                        <p>{mapLocation.fullAddress}</p>
                        {mapLocation.lat && (
                          <p className="text-xs text-muted-foreground mt-1">
                            GPS: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">Label</label>
                        <Input
                          value={newAddrForm.label}
                          onChange={(e) => setNewAddrForm({ ...newAddrForm, label: e.target.value })}
                          placeholder="Home / Work / Office"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">ZIP / Postcode</label>
                        <Input
                          value={newAddrForm.zip}
                          onChange={(e) => setNewAddrForm({ ...newAddrForm, zip: e.target.value })}
                          placeholder="734000"
                          className="h-9 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium">Street</label>
                        <Input
                          value={newAddrForm.street}
                          onChange={(e) => setNewAddrForm({ ...newAddrForm, street: e.target.value })}
                          placeholder="ул. Рудаки"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          House / Apt №
                          <span className="text-muted-foreground font-normal ml-1 text-red-500">*</span>
                        </label>
                        <Input
                          value={newAddrForm.houseNumber}
                          onChange={(e) => setNewAddrForm({ ...newAddrForm, houseNumber: e.target.value })}
                          placeholder="25 / кв. 3"
                          className="h-9 text-sm"
                        />
                      </div>

                      {mapLocation.neighborhood && (
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-muted-foreground">Neighborhood / District</label>
                          <Input value={mapLocation.neighborhood} disabled className="h-9 text-sm opacity-70" />
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-medium">City</label>
                        <Input
                          value={newAddrForm.city}
                          onChange={(e) => setNewAddrForm({ ...newAddrForm, city: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Country</label>
                        <Input value="Tajikistan 🇹🇯" disabled className="h-9 text-sm opacity-60" />
                      </div>
                    </div>
                  </div>
                )}

                {mapLocation && (
                  <Button size="sm" onClick={saveMapAddress} disabled={savingAddr} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {savingAddr ? 'Saving…' : 'Save & Use This Address'}
                  </Button>
                )}

                {!addresses?.length && !mapLocation && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.checkout.no_address}
                  </p>
                )}
              </div>
            )}

            {!addresses?.length && !showMap && !locked && (
              <p className="text-sm text-muted-foreground">
                No saved addresses. Click <strong>Pick on Map</strong> to set your location.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Shipping Method ── */}
        <Card className={locked ? 'opacity-75' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
              {t.checkout.shipping_method}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'standard', label: t.checkout.standard, price: '$5.00', days: t.checkout.standard_days },
              { id: 'express', label: t.checkout.express, price: '$15.00', days: t.checkout.express_days },
            ].map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 border rounded-lg p-3 transition ${
                  locked
                    ? shippingMethod === m.id
                      ? 'border-primary bg-primary/5'
                      : 'hidden'
                    : shippingMethod === m.id
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : 'hover:border-muted-foreground cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={m.id}
                  checked={shippingMethod === m.id}
                  onChange={() => !locked && setShippingMethod(m.id)}
                  disabled={locked}
                />
                <div className="flex-1 text-sm">
                  <p className="font-semibold flex items-center gap-2">
                    {m.label}
                    {shippingMethod === m.id && locked && <CheckCircle className="h-4 w-4 text-primary" />}
                  </p>
                  <p className="text-muted-foreground">{m.days}</p>
                </div>
                <span className="font-semibold">{m.price}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* ── Order Summary ── */}
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
                <span>{t.cart.subtotal}</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Continue to Payment / Payment form ── */}
        {/* Payment method selector */}
        {!locked && (
          <Card>
            <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard — online card payment', icon: '💳' },
                { id: 'korti_milli', label: 'Корти Миллӣ — Alif Bank', sub: 'Pay via Alif Mobi app or Alif Bank transfer', icon: '🟢' },
                { id: 'dc_bank', label: 'Корти Миллӣ — DC Bank (Dushanbe City)', sub: 'Pay via DC Next app or DC Bank transfer — 1.2% commission', icon: '🔵' },
              ].map((m) => (
                <label key={m.id} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition ${payMethod === m.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}>
                  <input type="radio" name="payMethod" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id as any)} />
                  <span className="text-xl">{m.icon}</span>
                  <div className="text-sm flex-1">
                    <p className="font-semibold">{m.label}</p>
                    <p className="text-muted-foreground text-xs">{m.sub}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {!paymentData ? (
          <Button
            className="w-full"
            size="lg"
            onClick={payMethod === 'korti_milli' || payMethod === 'dc_bank' ? handleKortiMilli : createIntent}
            disabled={loading || savingAddr || cartLoading || (!selectedAddress && !mapLocation)}
          >
            {cartLoading
              ? 'Loading cart…'
              : loading || savingAddr
              ? t.checkout.loading
              : payMethod === 'korti_milli'
              ? 'Place Order — Alif Bank'
              : payMethod === 'dc_bank'
              ? 'Place Order — DC Bank'
              : t.checkout.continue_payment}
          </Button>
        ) : payMethod === 'korti_milli' ? null : (
          <Card>
            <CardHeader><CardTitle>{t.checkout.payment_details}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 mb-4 bg-muted rounded-md p-3">
                <div className="flex justify-between"><span>{t.cart.subtotal}</span><span>{formatPrice(paymentData.subtotal)}</span></div>
                {paymentData.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t.cart.discount}</span>
                    <span>-{formatPrice(paymentData.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>{t.checkout.shipping}</span><span>{formatPrice(paymentData.shippingAmount)}</span></div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>{t.cart.total}</span>
                  <span>{formatPrice(paymentData.totalAmount)}</span>
                </div>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
                <CheckoutForm
                  clientSecret={paymentData.clientSecret}
                  total={paymentData.totalAmount}
                  paymentIntentId={paymentData.paymentIntentId}
                  addressId={selectedAddress!}
                  shippingAmount={paymentData.shippingAmount}
                  discountAmount={paymentData.discountAmount}
                  totalAmount={paymentData.totalAmount}
                />
              </Elements>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
