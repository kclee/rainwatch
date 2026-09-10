import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map,
  NavigationControl,
  ScaleControl,
  Marker,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { mapConfig } from '../config/map'
import type { UserLocation } from '../types/weather'

interface WeatherMapProps {
  userLocation: UserLocation | null
}

export function WeatherMap({ userLocation }: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const locationMarkerRef = useRef<Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new Map({
      container: containerRef.current,
      style: mapConfig.styleUrl,
      center: mapConfig.fallbackCenter,
      zoom: mapConfig.fallbackZoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      attributionControl: false,
    })

    map.once('styledata', () => {
      setIsMapReady(true)
      setMapError(null)
    })

    map.addControl(
      new NavigationControl({ showCompass: false }),
      'top-right',
    )
    map.addControl(
      new AttributionControl({ compact: true }),
      'bottom-right',
    )
    map.addControl(new ScaleControl(), 'bottom-left')

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    map.on('error', (event) => {
      setMapError(event.error?.message ?? 'The basemap could not be loaded.')
    })

    mapRef.current = map

    return () => {
      resizeObserver.disconnect()
      locationMarkerRef.current?.remove()
      locationMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocation) {
      return
    }

    const coordinates: [number, number] = [
      userLocation.longitude,
      userLocation.latitude,
    ]

    if (!locationMarkerRef.current) {
      const marker = new Marker({ color: '#0284c7' })
        .setLngLat(coordinates)
        .addTo(map)
      marker.getElement().setAttribute('aria-label', 'Your current location')
      marker.getElement().setAttribute('role', 'img')
      locationMarkerRef.current = marker
    } else {
      locationMarkerRef.current.setLngLat(coordinates)
    }

    map.flyTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 11),
      essential: true,
    })
  }, [userLocation])

  return (
    <section className="map-panel" aria-label="Interactive weather map">
      <div ref={containerRef} className="map-container" />
      {!isMapReady && !mapError && (
        <div className="map-message map-message--loading" role="status">
          Loading map…
        </div>
      )}
      {mapError && (
        <div className="map-message" role="status">
          The map is temporarily unavailable. {mapError}
        </div>
      )}
    </section>
  )
}
