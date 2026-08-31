'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckoutPaymentForm } from '@/components/checkout/CheckoutPaymentForm'
import {
  DeliveryAddressCard,
  type CheckoutAddressForm,
} from '@/components/checkout/DeliveryAddressCard'
import { OrderSummaryCard } from '@/components/checkout/OrderSummaryCard'
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector'
import { ShippingMethodCard, type ShippingMethod } from '@/components/checkout/ShippingMethodCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatPrice } from '@/lib/utils'
import {
  buildMapAddressInput,
  createAddress,
  getAddresses,
  getCart,
  InvalidMapAddressError,
} from '@/services/checkout.service'
import type { MapLocation } from '@/services/geocoding.service'
import { createBankTransferOrder, createPaymentIntent } from '@/services/payment.service'
import { useT } from '@/store/language.store'
import type { Address, Cart, CheckoutPaymentData, PaymentMethod } from '@/types'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PK
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const initialAddressForm: CheckoutAddressForm = {
  label: 'Home',
  street: '',
  city: '',
  country: 'Tajikistan',
  zip: '',
  houseNumber: '',
}

function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const couponCode = searchParams.get('coupon') ?? ''
  const t = useT()

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [addressForm, setAddressForm] = useState(initialAddressForm)
  const [savingAddress, setSavingAddress] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')
  const [paymentData, setPaymentData] = useState<CheckoutPaymentData | null>(null)
  const [paymentAddressId, setPaymentAddressId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const locked = Boolean(paymentData)

  const { data: addresses = [], refetch: refetchAddresses } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: getAddresses,
  })

  const { data: cart, isLoading: cartLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: getCart,
    staleTime: 0,
    refetchOnMount: true,
  })

  const handleMapSelect = (location: MapLocation) => {
    setSelectedAddress(null)
    setMapLocation(location)
    setAddressForm((current) => ({
      ...current,
      street: location.street || location.address || '',
      city: location.city || 'Dushanbe',
      country: 'Tajikistan',
      houseNumber: location.houseNumber || current.houseNumber,
    }))
  }

  const updateAddressForm = (field: keyof CheckoutAddressForm, value: string) => {
    setAddressForm((current) => ({ ...current, [field]: value }))
  }

  const createMapAddress = async () => {
    if (!mapLocation) return null
    setSavingAddress(true)
    try {
      const newAddress = await createAddress(buildMapAddressInput(mapLocation, addressForm))
      await refetchAddresses()
      setSelectedAddress(newAddress.id)
      return newAddress.id
    } catch (error: unknown) {
      toast.error(
        error instanceof InvalidMapAddressError ? error.message : 'Failed to save address',
      )
      return null
    } finally {
      setSavingAddress(false)
    }
  }

  const saveMapAddress = async () => {
    if (!mapLocation) {
      toast.error('Please select a location on the map')
      return
    }
    if (await createMapAddress()) {
      setShowMap(false)
      toast.success('Address saved!')
    }
  }

  const selectSavedAddress = (addressId: string) => {
    setSelectedAddress(addressId)
    setMapLocation(null)
  }

  const handleBankTransfer = async () => {
    if (!cartLoading && cart && !cart.items.length) {
      toast.error('Your cart is empty. Please add items before checking out.')
      return
    }
    if (!selectedAddress && !mapLocation) {
      toast.error('Please select a delivery address')
      return
    }

    const addressId = mapLocation ? await createMapAddress() : selectedAddress
    if (!addressId) return

    setLoading(true)
    try {
      const data = await createBankTransferOrder({
        addressId,
        shippingMethod,
        couponCode: couponCode || undefined,
      })
      router.push(`/checkout/success?orderId=${data.orderId}&method=${paymentMethod}`)
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to place order'))
      setLoading(false)
    }
  }

  const createIntent = async () => {
    if (!cartLoading && cart && !cart.items.length) {
      toast.error('Your cart is empty. Please add items before checking out.')
      return
    }
    if (!selectedAddress && !mapLocation) {
      toast.error('Please select or add a delivery address')
      return
    }
    if (!stripePromise) {
      toast.error('Card payments are not configured. Please choose a bank payment method.')
      return
    }

    const addressId = mapLocation ? await createMapAddress() : selectedAddress
    if (!addressId) return
    if (!selectedAddress) setSelectedAddress(addressId)

    setLoading(true)
    try {
      const data = await createPaymentIntent({
        addressId,
        couponCode: couponCode || undefined,
        shippingMethod,
      })
      setPaymentAddressId(addressId)
      setPaymentData(data)
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t.common.error))
    }
    setLoading(false)
  }

  if (!cartLoading && cart && cart.items.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-4 text-2xl">🛒</p>
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-6 text-muted-foreground">Add some products before checking out.</p>
        <Button onClick={() => router.push('/products')}>Browse Products</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">{t.checkout.title}</h1>
      <div className="space-y-6">
        <DeliveryAddressCard
          addresses={addresses}
          selectedAddress={selectedAddress}
          onSelectAddress={selectSavedAddress}
          locked={locked}
          showMap={showMap}
          onToggleMap={() => setShowMap((visible) => !visible)}
          mapLocation={mapLocation}
          onMapSelect={handleMapSelect}
          form={addressForm}
          onFormChange={updateAddressForm}
          onSaveAddress={saveMapAddress}
          savingAddress={savingAddress}
          copy={{
            title: t.checkout.delivery_address,
            hideMap: t.checkout.hide_map,
            pickOnMap: t.checkout.pick_on_map,
            noAddress: t.checkout.no_address,
            noAddressHint: t.checkout.no_address_hint,
          }}
        />

        <ShippingMethodCard
          value={shippingMethod}
          onChange={setShippingMethod}
          locked={locked}
          copy={{
            title: t.checkout.shipping_method,
            standard: t.checkout.standard,
            standardDays: t.checkout.standard_days,
            express: t.checkout.express,
            expressDays: t.checkout.express_days,
          }}
        />

        {cart && (
          <OrderSummaryCard
            cart={cart}
            title={t.checkout.order_summary}
            subtotalLabel={t.cart.subtotal}
          />
        )}

        {!locked && <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />}

        {!paymentData ? (
          <Button
            className="w-full"
            size="lg"
            onClick={
              paymentMethod === 'korti_milli' || paymentMethod === 'dc_bank'
                ? handleBankTransfer
                : createIntent
            }
            disabled={
              loading ||
              savingAddress ||
              cartLoading ||
              (!selectedAddress && !mapLocation) ||
              (paymentMethod === 'card' && !stripePromise)
            }
          >
            {cartLoading
              ? 'Loading cart…'
              : paymentMethod === 'card' && !stripePromise
                ? 'Card payments unavailable'
                : loading || savingAddress
                  ? t.checkout.loading
                  : paymentMethod === 'korti_milli'
                    ? 'Place Order — Alif Bank'
                    : paymentMethod === 'dc_bank'
                      ? 'Place Order — DC Bank'
                      : t.checkout.continue_payment}
          </Button>
        ) : paymentMethod === 'korti_milli' || !paymentAddressId ? null : (
          <Card>
            <CardHeader>
              <CardTitle>{t.checkout.payment_details}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-1 rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>{t.cart.subtotal}</span>
                  <span>{formatPrice(paymentData.subtotal)}</span>
                </div>
                {paymentData.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t.cart.discount}</span>
                    <span>-{formatPrice(paymentData.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t.checkout.shipping}</span>
                  <span>{formatPrice(paymentData.shippingAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>{t.cart.total}</span>
                  <span>{formatPrice(paymentData.totalAmount)}</span>
                </div>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
                <CheckoutPaymentForm
                  clientSecret={paymentData.clientSecret}
                  total={paymentData.totalAmount}
                  paymentIntentId={paymentData.paymentIntentId}
                  addressId={paymentAddressId}
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

export default function CheckoutPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <CheckoutPage />
    </Suspense>
  )
}
