'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Locate, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MapLocation {
  lat: number
  lng: number
  address: string
  city: string
  district?: string
  street?: string
  houseNumber?: string
  neighborhood?: string
  fullAddress?: string
}

interface Props {
  onSelect: (location: MapLocation) => void
  selected?: MapLocation | null
  disabled?: boolean
}

const TJ_CENTER: [number, number] = [38.861, 71.276]
const TJ_ZOOM = 7

export default function DeliveryMap({ onSelect, selected, disabled = false }: Props) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
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
      if ((containerRef.current as any)?._leaflet_id) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
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
          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng()
            reverseGeocode(L, map, pos.lat, pos.lng)
          })
        }
      }

      if (!disabled) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
            markerRef.current.on('dragend', (ev: any) => {
              const pos = ev.target.getLatLng()
              reverseGeocode(L, map, pos.lat, pos.lng)
            })
          }
          reverseGeocode(L, map, lat, lng)
        })
      }

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        initializedRef.current = false
      }
    }
  }, [])

  const reverseGeocode = async (L: any, map: any, lat: number, lng: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&namedetails=1&zoom=19`,
        { headers: { 'Accept-Language': 'ru,tg;q=0.9,en;q=0.8' } },
      )
      const data = await res.json()
      const a = data.address || {}

      // Extract all available components
      const houseNumber = a.house_number || a['addr:housenumber'] || a.house || ''
      const road = a.road || a.pedestrian || a.path || a.footway || a.residential || a.hamlet || ''
      const neighborhood = a.neighbourhood || a.suburb || a.quarter || a.allotments || ''
      const district = a.city_district || a.district || a.state_district || ''
      const city = a.city || a.town || a.village || a.county || a.municipality || a.state || 'Tajikistan'
      const region = a.state || a.region || ''
      const postcode = a.postcode || ''

      // Full human-readable address (Russian style: street, house, district, city)
      const lineParts = [
        road && houseNumber ? `ул. ${road}, д. ${houseNumber}` : road ? `ул. ${road}` : '',
        neighborhood,
        district,
        city,
        region && region !== city ? region : '',
        postcode,
      ].filter(Boolean)

      const fullAddress = lineParts.join(', ')
        || data.display_name?.split(',').slice(0, 5).join(', ')
        || 'Выбранная точка'

      const shortAddress = (road && houseNumber)
        ? `${road}, ${houseNumber}`
        : road || neighborhood || 'Выбранная точка'

      const location: MapLocation = {
        lat, lng,
        address: shortAddress,
        city,
        district: district || neighborhood,
        street: road,
        houseNumber,
        neighborhood,
        fullAddress,
      }

      setAddressLabel(fullAddress)
      onSelect(location)

      if (markerRef.current) {
        const rows = [
          road ? `<b>🛣️ ${road}${houseNumber ? `, д. ${houseNumber}` : ''}</b>` : null,
          neighborhood ? `🏘️ ${neighborhood}` : null,
          district ? `📍 ${district}` : null,
          `📦 ${city}${region && region !== city ? `, ${region}` : ''}`,
          postcode ? `📮 ${postcode}` : null,
          `<small style="color:#888">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`,
        ].filter(Boolean).join('<br>')

        markerRef.current.bindPopup(
          `<div style="font-size:13px;line-height:1.8;min-width:180px">${rows}</div>`,
          { maxWidth: 260 }
        ).openPopup()
      }
    } catch {
      onSelect({ lat, lng, address: 'Выбранная точка', city: 'Tajikistan', fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
    }
    setLoading(false)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (mapRef.current) mapRef.current.setView([lat, lng], 17)
        import('leaflet').then((L) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else if (mapRef.current) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current)
            markerRef.current.on('dragend', (e: any) => {
              const p = e.target.getLatLng()
              reverseGeocode(L, mapRef.current, p.lat, p.lng)
            })
          }
          reverseGeocode(L, mapRef.current, lat, lng)
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
            <Button type="button" size="sm" variant="default" className="shadow-lg gap-2" onClick={handleGeolocate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
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
