'use client'

import { useId } from 'react'
import dynamicImport from 'next/dynamic'
import { CheckCircle, Lock, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { MapLocation } from '@/services/geocoding.service'
import type { Address } from '@/types'

const DeliveryMap = dynamicImport(() => import('@/components/map/DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export interface CheckoutAddressForm {
  label: string
  street: string
  city: string
  country: string
  zip: string
  houseNumber: string
}

interface DeliveryAddressCopy {
  title: string
  hideMap: string
  pickOnMap: string
  noAddress: string
  noAddressHint: string
}

interface DeliveryAddressCardProps {
  addresses: Address[]
  selectedAddress: string | null
  onSelectAddress: (addressId: string) => void
  locked: boolean
  showMap: boolean
  onToggleMap: () => void
  mapLocation: MapLocation | null
  onMapSelect: (location: MapLocation) => void
  form: CheckoutAddressForm
  onFormChange: (field: keyof CheckoutAddressForm, value: string) => void
  onSaveAddress: () => void
  savingAddress: boolean
  copy: DeliveryAddressCopy
}

function addressOptionClass(selected: boolean, locked: boolean) {
  if (locked) {
    return selected ? 'border-primary bg-primary/5' : 'hidden'
  }

  return selected
    ? 'border-primary bg-primary/5 cursor-pointer'
    : 'hover:border-muted-foreground cursor-pointer'
}

export function DeliveryAddressCard({
  addresses,
  selectedAddress,
  onSelectAddress,
  locked,
  showMap,
  onToggleMap,
  mapLocation,
  onMapSelect,
  form,
  onFormChange,
  onSaveAddress,
  savingAddress,
  copy,
}: DeliveryAddressCardProps) {
  return (
    <Card className={locked ? 'opacity-75' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            {copy.title}
          </CardTitle>
          {!locked && (
            <Button size="sm" variant="outline" onClick={onToggleMap}>
              <MapPin className="mr-2 h-4 w-4" />
              {showMap ? copy.hideMap : copy.pickOnMap}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.length > 0 && (
          <div className="space-y-2">
            {addresses.map((address) => {
              const selected = selectedAddress === address.id

              return (
                <label
                  key={address.id}
                  className={`flex gap-3 rounded-lg border p-3 transition ${addressOptionClass(
                    selected,
                    locked,
                  )}`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={selected}
                    onChange={() => !locked && onSelectAddress(address.id)}
                    disabled={locked}
                    className="mt-1"
                  />
                  <div className="flex-1 text-sm">
                    <p className="flex items-center gap-2 font-semibold">
                      {address.label}
                      {selected && locked && <CheckCircle className="h-4 w-4 text-primary" />}
                    </p>
                    <p className="text-muted-foreground">{address.street}</p>
                    <p className="text-xs text-muted-foreground">
                      {[address.state, address.city, address.country, address.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {!locked && showMap && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-muted-foreground">
              Click on the map or use &quot;My Location&quot; to set your delivery point
            </p>
            <DeliveryMap onSelect={onMapSelect} selected={mapLocation} />

            {mapLocation && (
              <>
                <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Confirm Address Details
                  </p>

                  {mapLocation.fullAddress && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      <p className="mb-1 text-xs font-medium text-primary">Detected address</p>
                      <p>{mapLocation.fullAddress}</p>
                      {mapLocation.lat && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          GPS: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <AddressField
                      label="Label"
                      value={form.label}
                      onChange={(value) => onFormChange('label', value)}
                      placeholder="Home / Work / Office"
                    />
                    <AddressField
                      label="ZIP / Postcode"
                      value={form.zip}
                      onChange={(value) => onFormChange('zip', value)}
                      placeholder="734000"
                    />
                    <AddressField
                      label="Street"
                      value={form.street}
                      onChange={(value) => onFormChange('street', value)}
                      placeholder="ул. Рудаки"
                      required
                    />
                    <AddressField
                      label="House / Apt №"
                      value={form.houseNumber}
                      onChange={(value) => onFormChange('houseNumber', value)}
                      placeholder="25 / кв. 3"
                      required
                    />

                    {mapLocation.neighborhood && (
                      <div className="col-span-2">
                        <label
                          htmlFor="checkout-neighborhood"
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Neighborhood / District
                        </label>
                        <Input
                          id="checkout-neighborhood"
                          value={mapLocation.neighborhood}
                          disabled
                          className="h-9 text-sm opacity-70"
                        />
                      </div>
                    )}

                    <AddressField
                      label="City"
                      value={form.city}
                      onChange={(value) => onFormChange('city', value)}
                      required
                    />
                    <div>
                      <label htmlFor="checkout-country" className="text-xs font-medium">
                        Country
                      </label>
                      <Input
                        id="checkout-country"
                        value="Tajikistan 🇹🇯"
                        disabled
                        className="h-9 text-sm opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={onSaveAddress}
                  disabled={savingAddress}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {savingAddress ? 'Saving…' : 'Save & Use This Address'}
                </Button>
              </>
            )}

            {!addresses.length && !mapLocation && (
              <p className="py-4 text-center text-sm text-muted-foreground">{copy.noAddress}</p>
            )}
          </div>
        )}

        {!addresses.length && !showMap && !locked && (
          <p className="text-sm text-muted-foreground">{copy.noAddressHint}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface AddressFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

function AddressField({ label, value, onChange, placeholder, required }: AddressFieldProps) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="ml-1 font-normal text-red-500">*</span>}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        className="h-9 text-sm"
      />
    </div>
  )
}
