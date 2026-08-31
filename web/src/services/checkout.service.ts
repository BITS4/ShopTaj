import api from '@/lib/api'
import type { MapLocation } from '@/services/geocoding.service'
import type { Address, Cart } from '@/types'

export interface CreateAddressInput {
  label: string
  street: string
  city: string
  state?: string
  country: string
  zip: string
}

export interface MapAddressDraft {
  label: string
  street: string
  city: string
  country: string
  zip: string
  houseNumber: string
}

export class InvalidMapAddressError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidMapAddressError'
  }
}

export function buildMapAddressInput(
  location: MapLocation,
  draft: MapAddressDraft,
): CreateAddressInput {
  const street = (draft.street || location.street || '').trim()
  const houseNumber = draft.houseNumber.trim()
  const city = (draft.city || location.city).trim()

  if (!street) throw new InvalidMapAddressError('Street is required')
  if (!houseNumber) {
    throw new InvalidMapAddressError('House or apartment number is required')
  }
  if (!city) throw new InvalidMapAddressError('City is required')

  return {
    label: draft.label.trim() || 'Delivery Point',
    street: `${street}, д. ${houseNumber}`,
    city,
    state: location.district || location.neighborhood || undefined,
    country: draft.country.trim() || 'Tajikistan',
    zip: draft.zip.trim() || '000000',
  }
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get<Address[]>('/users/me/addresses')
  return data
}

export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Cart>('/cart')
  return data
}

export async function createAddress(address: CreateAddressInput): Promise<Address> {
  const { data } = await api.post<Address>('/users/me/addresses', address)
  return data
}
