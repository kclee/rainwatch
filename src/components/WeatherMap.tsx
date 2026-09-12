import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  Map,
  NavigationControl,
  ScaleControl,
  Marker,
  setWorkerUrl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { ImageSource, RasterTileSource } from 'maplibre-gl'
import { mapConfig } from '../config/map'
import { DEFAULT_CLOUD_OPACITY } from '../config/cloud'
import { DEFAULT_RADAR_OPACITY } from '../config/radar'
import type {
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
  MapMode,
  RadarFrame,
  RadarPalette,
  UserLocation,
} from '../types/weather'
import { RadarLegend } from './RadarLegend'

const RADAR_SOURCE_ID = 'rainwatch-radar'
const RADAR_LAYER_ID = 'rainwatch-radar-layer'
const CLOUD_SOURCE_ID = 'rainwatch-cloud'
const CLOUD_LAYER_ID = 'rainwatch-cloud-layer'

setWorkerUrl(mapLibreWorkerUrl)

interface WeatherMapProps {
  buildCloudImageRequest: (
    frame: CloudFrame,
    viewport: CloudViewport,
  ) => CloudImageRequest | null
  cloudFrame: CloudFrame | null
  cloudNotice: string | null
  cloudOpacity: number
  mapMode: MapMode
  radarFrame: RadarFrame | null
  radarPalette: RadarPalette
  radarNotice: string | null
  radarOpacity: number
  userLocation: UserLocation | null
}

export function WeatherMap({
  buildCloudImageRequest,
  cloudFrame,
  cloudNotice,
  cloudOpacity,
  mapMode,
  radarFrame,
  radarPalette,
  radarNotice,
  radarOpacity,
  userLocation,
}: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const locationMarkerRef = useRef<Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [radarTileError, setRadarTileError] = useState<string | null>(null)
  const [cloudImageError, setCloudImageError] = useState<string | null>(null)

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

      if ('sourceId' in event && event.sourceId === CLOUD_SOURCE_ID) {
        setCloudImageError(
          'Satellite image could not be loaded. Other map layers remain available.',
        )
        return
      }

      setMapError(event.error?.message ?? 'The basemap could not be loaded.')
    })

    map.on('sourcedata', (event) => {
      if (event.sourceId === RADAR_SOURCE_ID && event.isSourceLoaded) {
        setRadarTileError(null)
      }
      if (event.sourceId === CLOUD_SOURCE_ID && event.isSourceLoaded) {
        setCloudImageError(null)
      }
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
    if (!map || !isMapReady) {
      return
    }

    if (mapMode === 'cloud' || !radarFrame) {
      if (map.getLayer(RADAR_LAYER_ID)) {
        map.removeLayer(RADAR_LAYER_ID)
      }
      if (map.getSource(RADAR_SOURCE_ID)) {
        map.removeSource(RADAR_SOURCE_ID)
      }
      return
    }

    const existingSource = map.getSource(RADAR_SOURCE_ID) as
      | RasterTileSource
      | undefined
    if (existingSource) {
      existingSource.setTiles([radarFrame.tileUrl])
      return
    }

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
          'raster-opacity': DEFAULT_RADAR_OPACITY,
          'raster-fade-duration': 0,
        },
      },
      firstSymbolLayer,
    )
  }, [isMapReady, mapMode, radarFrame])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) {
      return
    }

    if (mapMode === 'radar' || !cloudFrame) {
      if (map.getLayer(CLOUD_LAYER_ID)) {
        map.removeLayer(CLOUD_LAYER_ID)
      }
      if (map.getSource(CLOUD_SOURCE_ID)) {
        map.removeSource(CLOUD_SOURCE_ID)
      }
      return
    }

    const updateCloudImage = () => {
      const bounds = map.getBounds()
      const container = map.getContainer()
      const request = buildCloudImageRequest(cloudFrame, {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        width: container.clientWidth,
        height: container.clientHeight,
        pixelRatio: window.devicePixelRatio,
      })

      if (!request) {
        if (map.getLayer(CLOUD_LAYER_ID)) {
          map.removeLayer(CLOUD_LAYER_ID)
        }
        if (map.getSource(CLOUD_SOURCE_ID)) {
          map.removeSource(CLOUD_SOURCE_ID)
        }
        return
      }

      const existingSource = map.getSource(CLOUD_SOURCE_ID) as
        | ImageSource
        | undefined
      if (existingSource) {
        existingSource.updateImage(request)
        return
      }

      map.addSource(CLOUD_SOURCE_ID, {
        type: 'image',
        url: request.url,
        coordinates: request.coordinates,
      })

      const firstSymbolLayer = map
        .getStyle()
        .layers?.find((layer) => layer.type === 'symbol')?.id
      const beforeLayer = map.getLayer(RADAR_LAYER_ID)
        ? RADAR_LAYER_ID
        : firstSymbolLayer

      map.addLayer(
        {
          id: CLOUD_LAYER_ID,
          type: 'raster',
          source: CLOUD_SOURCE_ID,
          paint: {
            'raster-opacity': DEFAULT_CLOUD_OPACITY,
            'raster-fade-duration': 0,
          },
        },
        beforeLayer,
      )
    }

    let updateTimer: number | null = null
    const scheduleCloudImageUpdate = () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer)
      }
      updateTimer = window.setTimeout(() => {
        updateTimer = null
        updateCloudImage()
      }, 250)
    }

    updateCloudImage()
    map.on('moveend', scheduleCloudImageUpdate)
    map.on('resize', scheduleCloudImageUpdate)

    return () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer)
      }
      map.off('moveend', scheduleCloudImageUpdate)
      map.off('resize', scheduleCloudImageUpdate)
    }
  }, [
    buildCloudImageRequest,
    cloudFrame,
    isMapReady,
    mapMode,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || !map.getLayer(RADAR_LAYER_ID)) {
      return
    }

    map.setPaintProperty(RADAR_LAYER_ID, 'raster-opacity', radarOpacity)
  }, [isMapReady, radarOpacity])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || !map.getLayer(CLOUD_LAYER_ID)) {
      return
    }

    map.setPaintProperty(CLOUD_LAYER_ID, 'raster-opacity', cloudOpacity)
  }, [cloudOpacity, isMapReady])

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
      {!mapError && (
        <div className="weather-notices">
          {mapMode !== 'cloud' && (radarTileError || radarNotice) && (
            <div className="radar-notice" role="status">
              {radarTileError ?? radarNotice}
            </div>
          )}
          {mapMode !== 'radar' && (cloudImageError || cloudNotice) && (
            <div className="radar-notice" role="status">
              {cloudImageError ?? cloudNotice}
            </div>
          )}
        </div>
      )}
      {mapMode !== 'cloud' && <RadarLegend palette={radarPalette} />}
      {mapMode !== 'radar' && cloudFrame && (
        <div className="cloud-attribution">
          <a href={cloudFrame.attributionUrl} target="_blank" rel="noreferrer">
            {cloudFrame.attributionLabel}
          </a>
        </div>
      )}
    </section>
  )
}
