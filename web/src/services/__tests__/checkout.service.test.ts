import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildMapAddressInput,
  createAddress,
  getAddresses,
  getCart,
} from '@/services/checkout.service'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  default: mocks,
}))

describe('checkout service', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.post.mockReset()
  })

  it('loads saved addresses and the current cart through the API client', async () => {
    const addresses = [{ id: 'address-1' }]
    const cart = { id: 'cart-1', items: [], total: 0 }
    mocks.get.mockResolvedValueOnce({ data: addresses }).mockResolvedValueOnce({ data: cart })

    await expect(getAddresses()).resolves.toBe(addresses)
    await expect(getCart()).resolves.toBe(cart)
    expect(mocks.get).toHaveBeenNthCalledWith(1, '/users/me/addresses')
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/cart')
  })

  it('creates and returns a typed delivery address', async () => {
    const request = {
      label: 'Home',
      street: 'Rudaki 10',
      city: 'Dushanbe',
      country: 'Tajikistan',
      zip: '734000',
    }
    const address = { id: 'address-1', ...request, isDefault: false }
    mocks.post.mockResolvedValue({ data: address })

    await expect(createAddress(request)).resolves.toEqual(address)
    expect(mocks.post).toHaveBeenCalledWith('/users/me/addresses', request)
  })

  it('builds a map address from trimmed user-edited delivery fields', () => {
    expect(
      buildMapAddressInput(
        {
          lat: 38.573,
          lng: 68.786,
          address: 'Detected road',
          city: 'Dushanbe',
          district: 'Shohmansur',
        },
        {
          label: ' Office ',
          street: ' Rudaki Avenue ',
          city: ' Dushanbe ',
          country: ' Tajikistan ',
          zip: ' 734000 ',
          houseNumber: ' 10, apt. 4 ',
        },
      ),
    ).toEqual({
      label: 'Office',
      street: 'Rudaki Avenue, д. 10, apt. 4',
      city: 'Dushanbe',
      state: 'Shohmansur',
      country: 'Tajikistan',
      zip: '734000',
    })
  })

  it('uses geocoder fields and safe defaults when optional form values are blank', () => {
    expect(
      buildMapAddressInput(
        {
          lat: 38.573,
          lng: 68.786,
          address: 'Detected point',
          street: 'Rudaki Avenue',
          city: 'Dushanbe',
          neighborhood: 'Shohmansur',
        },
        {
          label: ' ',
          street: '',
          city: '',
          country: '',
          zip: '',
          houseNumber: '10',
        },
      ),
    ).toEqual({
      label: 'Delivery Point',
      street: 'Rudaki Avenue, д. 10',
      city: 'Dushanbe',
      state: 'Shohmansur',
      country: 'Tajikistan',
      zip: '000000',
    })
  })

  it.each([
    { street: '', houseNumber: '10', message: 'Street is required' },
    {
      street: 'Rudaki Avenue',
      houseNumber: ' ',
      message: 'House or apartment number is required',
    },
    {
      street: 'Rudaki Avenue',
      houseNumber: '10',
      city: '',
      message: 'City is required',
    },
  ])('rejects an incomplete map address', ({ street, houseNumber, city = 'Dushanbe', message }) => {
    expect(() =>
      buildMapAddressInput(
        { lat: 38.573, lng: 68.786, address: '', city },
        {
          label: 'Home',
          street,
          city,
          country: 'Tajikistan',
          zip: '',
          houseNumber,
        },
      ),
    ).toThrow(message)
  })
})
