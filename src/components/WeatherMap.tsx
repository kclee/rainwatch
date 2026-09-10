import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map,
  NavigationControl,
  ScaleControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { mapConfig } from '../config/map'

export function WeatherMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
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
      map.remove()
      mapRef.current = null
    }
  }, [])

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
