'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Locate, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  escapeHtml,
  fallbackMapLocation,
  reverseGeocode as fetchMapLocation,
  type MapLocation,
} from '@/services/geocoding.service'
import type { LeafletEvent, LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet'

export type { MapLocation } from '@/services/geocoding.service'

type LeafletContainer = HTMLDivElement & { _leaflet_id?: number }
type DefaultIconPrototype = typeof import('leaflet').Icon.Default.prototype & {
  _getIconUrl?: () => string
}

interface Props {
  onSelect: (location: MapLocation) => void
  selected?: MapLocation | null
  disabled?: boolean
}

const TJ_CENTER: [number, number] = [38.861, 71.276]
const TJ_ZOOM = 7

export default function DeliveryMap({ onSelect, selected, disabled = false }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const geocodeControllerRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [addressLabel, setAddressLabel] = useState(selected?.fullAddress || selected?.address || '')

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return
    initializedRef.current = true

    import('leaflet').then((L) => {
      // Guard against double-init (React StrictMode / hot reload)
      if ((containerRef.current as LeafletContainer | null)?._leaflet_id) return

      delete (L.Icon.Default.prototype as DefaultIconPrototype)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: selected ? [selected.lat, selected.lng] : TJ_CENTER,
        zoom: selected ? 15 : TJ_ZOOM,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      if (selected) {
        const marker = L.marker([selected.lat, selected.lng], { draggable: !disabled }).addTo(map)
        markerRef.current = marker
        if (!disabled) {
          marker.on('dragend', (event: LeafletEvent) => {
            const pos = (event.target as Marker).getLatLng()
            reverseGeocode(pos.lat, pos.lng)
          })
        }
      }

      if (!disabled) {
        map.on('click', (event: LeafletMouseEvent) => {
          const { lat, lng } = event.latlng
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
            markerRef.current = marker
            marker.on('dragend', (dragEvent: LeafletEvent) => {
              const pos = (dragEvent.target as Marker).getLatLng()
              reverseGeocode(pos.lat, pos.lng)
            })
          }
          reverseGeocode(lat, lng)
        })
      }

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      geocodeControllerRef.current?.abort()
      geocodeControllerRef.current = null
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        initializedRef.current = false
      }
    }
  }, [])

  const reverseGeocode = async (lat: number, lng: number) => {
    geocodeControllerRef.current?.abort()
    const controller = new AbortController()
    geocodeControllerRef.current = controller
    setLoading(true)
    try {
      const location = await fetchMapLocation(lat, lng, { signal: controller.signal })
      const { street, houseNumber, neighborhood, district, city, region, postcode } = location

      setAddressLabel(location.fullAddress || location.address)
      onSelect(location)

      if (markerRef.current) {
        const safeStreet = street ? escapeHtml(street) : ''
        const safeHouseNumber = houseNumber ? escapeHtml(houseNumber) : ''
        const safeNeighborhood = neighborhood ? escapeHtml(neighborhood) : ''
        const safeDistrict = district ? escapeHtml(district) : ''
        const safeCity = escapeHtml(city)
        const safeRegion = region ? escapeHtml(region) : ''
        const safePostcode = postcode ? escapeHtml(postcode) : ''
        const rows = [
          street ? `<b>🛣️ ${safeStreet}${houseNumber ? `, д. ${safeHouseNumber}` : ''}</b>` : null,
          neighborhood ? `🏘️ ${safeNeighborhood}` : null,
          district ? `📍 ${safeDistrict}` : null,
          `📦 ${safeCity}${region && region !== city ? `, ${safeRegion}` : ''}`,
          postcode ? `📮 ${safePostcode}` : null,
          `<small style="color:#888">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`,
        ]
          .filter(Boolean)
          .join('<br>')

        markerRef.current
          .bindPopup(`<div style="font-size:13px;line-height:1.8;min-width:180px">${rows}</div>`, {
            maxWidth: 260,
          })
          .openPopup()
      }
    } catch {
      if (controller.signal.aborted) return
      const location = fallbackMapLocation(lat, lng)
      setAddressLabel(location.fullAddress || location.address)
      onSelect(location)
    }
    if (geocodeControllerRef.current === controller) {
      geocodeControllerRef.current = null
      setLoading(false)
    }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (mapRef.current) mapRef.current.setView([lat, lng], 17)
        import('leaflet').then((L) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else if (mapRef.current) {
            const marker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)
            markerRef.current = marker
            marker.on('dragend', (event: LeafletEvent) => {
              const point = (event.target as Marker).getLatLng()
              reverseGeocode(point.lat, point.lng)
            })
          }
          reverseGeocode(lat, lng)
        })
      },
      () => {
        setLoading(false)
        if (mapRef.current) mapRef.current.setView([38.559, 68.773], 13)
      },
      { timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border shadow-sm" style={{ height: 360 }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={containerRef} className="w-full h-full" />

        {!disabled && (
          <div className="absolute top-3 right-3 z-[1000]">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="shadow-lg gap-2"
              onClick={handleGeolocate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Locate className="h-4 w-4" />
              )}
              My Location
            </Button>
          </div>
        )}

        {!mapReady && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Address display panel */}
      <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Getting address details…
          </p>
        ) : addressLabel ? (
          <>
            <p className="font-medium flex items-start gap-1.5">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{addressLabel}</span>
            </p>
            {selected?.lat && (
              <p className="text-xs text-muted-foreground ml-5.5">
                GPS: {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {disabled ? 'No location selected' : 'Нажмите на карту или "My Location"'}
          </p>
        )}
      </div>
    </div>
  )
}
