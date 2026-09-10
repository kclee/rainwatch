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
import type { RadarFrame, UserLocation } from '../types/weather'

const RADAR_SOURCE_ID = 'rainwatch-radar'
const RADAR_LAYER_ID = 'rainwatch-radar-layer'

interface WeatherMapProps {
  radarFrame: RadarFrame | null
  userLocation: UserLocation | null
}

export function WeatherMap({ radarFrame, userLocation }: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const locationMarkerRef = useRef<Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [radarTileError, setRadarTileError] = useState<string | null>(null)

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
      if ('sourceId' in event && event.sourceId === RADAR_SOURCE_ID) {
        setRadarTileError(
          'Radar tiles could not be loaded. The basemap is still available.',
        )
        return
      }

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
    if (!map || !isMapReady || !radarFrame) {
      return
    }

    if (map.getLayer(RADAR_LAYER_ID)) {
      map.removeLayer(RADAR_LAYER_ID)
    }
    if (map.getSource(RADAR_SOURCE_ID)) {
      map.removeSource(RADAR_SOURCE_ID)
    }

    setRadarTileError(null)
    map.addSource(RADAR_SOURCE_ID, {
      type: 'raster',
      tiles: [radarFrame.tileUrl],
      tileSize: 256,
      maxzoom: 7,
      attribution: radarFrame.attribution,
    })

    const firstSymbolLayer = map
      .getStyle()
      .layers?.find((layer) => layer.type === 'symbol')?.id

    map.addLayer(
      {
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: {
          'raster-opacity': 0.68,
          'raster-fade-duration': 0,
        },
      },
      firstSymbolLayer,
    )
  }, [isMapReady, radarFrame])

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
      {radarTileError && !mapError && (
        <div className="map-message" role="status">
          {radarTileError}
        </div>
      )}
    </section>
  )
}
