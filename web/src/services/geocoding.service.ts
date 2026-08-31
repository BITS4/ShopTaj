export interface MapLocation {
  lat: number
  lng: number
  address: string
  city: string
  district?: string
  street?: string
  houseNumber?: string
  neighborhood?: string
  region?: string
  postcode?: string
  fullAddress?: string
}

interface NominatimAddress {
  house_number?: string
  'addr:housenumber'?: string
  house?: string
  road?: string
  pedestrian?: string
  path?: string
  footway?: string
  residential?: string
  hamlet?: string
  neighbourhood?: string
  suburb?: string
  quarter?: string
  allotments?: string
  city_district?: string
  district?: string
  state_district?: string
  city?: string
  town?: string
  village?: string
  county?: string
  municipality?: string
  state?: string
  region?: string
  postcode?: string
}

interface NominatimResponse {
  address?: NominatimAddress
  display_name?: string
}

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

export interface ReverseGeocodeOptions {
  request?: typeof fetch
  signal?: AbortSignal
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

export function fallbackMapLocation(lat: number, lng: number): MapLocation {
  return {
    lat,
    lng,
    address: 'Выбранная точка',
    city: 'Tajikistan',
    fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  }
}

export function mapNominatimLocation(
  lat: number,
  lng: number,
  data: NominatimResponse,
): MapLocation {
  const address = data.address ?? {}
  const houseNumber = address.house_number ?? address['addr:housenumber'] ?? address.house ?? ''
  const street =
    address.road ??
    address.pedestrian ??
    address.path ??
    address.footway ??
    address.residential ??
    address.hamlet ??
    ''
  const neighborhood =
    address.neighbourhood ?? address.suburb ?? address.quarter ?? address.allotments ?? ''
  const district = address.city_district ?? address.district ?? address.state_district ?? ''
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.county ??
    address.municipality ??
    address.state ??
    'Tajikistan'
  const region = address.state ?? address.region ?? ''
  const postcode = address.postcode ?? ''

  const structuredAddress = Object.keys(address).length
    ? [
        street && houseNumber ? `ул. ${street}, д. ${houseNumber}` : street ? `ул. ${street}` : '',
        neighborhood,
        district,
        city,
        region && region !== city ? region : '',
        postcode,
      ]
        .filter(Boolean)
        .join(', ')
    : ''
  const fullAddress =
    structuredAddress ||
    data.display_name
      ?.split(',')
      .map((part) => part.trim())
      .slice(0, 5)
      .join(', ') ||
    'Выбранная точка'

  return {
    lat,
    lng,
    address:
      street && houseNumber
        ? `${street}, ${houseNumber}`
        : street || neighborhood || 'Выбранная точка',
    city,
    district,
    street,
    houseNumber,
    neighborhood,
    region,
    postcode,
    fullAddress,
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options: ReverseGeocodeOptions = {},
): Promise<MapLocation> {
  const { request = fetch, signal } = options
  const url = new URL(NOMINATIM_REVERSE_URL)
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    namedetails: '1',
    zoom: '19',
  }).toString()

  const response = await request(url, {
    headers: { 'Accept-Language': 'ru,tg;q=0.9,en;q=0.8' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`)
  }

  return mapNominatimLocation(lat, lng, (await response.json()) as NominatimResponse)
}
