import { describe, expect, it, vi } from 'vitest'
import {
  escapeHtml,
  fallbackMapLocation,
  mapNominatimLocation,
  reverseGeocode,
} from '@/services/geocoding.service'

describe('geocoding service', () => {
  it('normalises Nominatim address variants into the checkout model', () => {
    expect(
      mapNominatimLocation(38.573, 68.786, {
        address: {
          house_number: '10',
          road: 'Rudaki Avenue',
          neighbourhood: 'Shohmansur',
          city_district: 'Shohmansur District',
          city: 'Dushanbe',
          state: 'Districts of Republican Subordination',
          postcode: '734000',
        },
      }),
    ).toEqual({
      lat: 38.573,
      lng: 68.786,
      address: 'Rudaki Avenue, 10',
      city: 'Dushanbe',
      district: 'Shohmansur District',
      street: 'Rudaki Avenue',
      houseNumber: '10',
      neighborhood: 'Shohmansur',
      region: 'Districts of Republican Subordination',
      postcode: '734000',
      fullAddress:
        'ул. Rudaki Avenue, д. 10, Shohmansur, Shohmansur District, Dushanbe, Districts of Republican Subordination, 734000',
    })
  })

  it('calls the reverse-geocoding endpoint with encoded coordinates and locale', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        display_name: 'Dushanbe, Tajikistan',
      }),
    })

    const controller = new AbortController()
    const location = await reverseGeocode(38.573, 68.786, {
      request: request as unknown as typeof fetch,
      signal: controller.signal,
    })

    const [url, options] = request.mock.calls[0] as [URL, RequestInit]
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/reverse')
    expect(url.searchParams.get('lat')).toBe('38.573')
    expect(url.searchParams.get('lon')).toBe('68.786')
    expect(options.headers).toEqual({
      'Accept-Language': 'ru,tg;q=0.9,en;q=0.8',
    })
    expect(options.signal).toBe(controller.signal)
    expect(location.fullAddress).toBe('Dushanbe, Tajikistan')
  })

  it('rejects non-success responses so the UI can use a safe fallback', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    })

    await expect(
      reverseGeocode(38.573, 68.786, {
        request: request as unknown as typeof fetch,
      }),
    ).rejects.toThrow('Reverse geocoding failed with status 429')
    expect(fallbackMapLocation(38.573, 68.786)).toEqual({
      lat: 38.573,
      lng: 68.786,
      address: 'Выбранная точка',
      city: 'Tajikistan',
      fullAddress: '38.57300, 68.78600',
    })
  })

  it('escapes third-party address fields before popup HTML interpolation', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> & \'quoted\'')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;',
    )
  })
})
