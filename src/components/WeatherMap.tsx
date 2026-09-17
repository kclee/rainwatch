import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  addProtocol,
  AttributionControl,
  Map,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl'
import type { GeoJSONSource, ImageSource, RasterTileSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { DEFAULT_CLOUD_OPACITY } from '../config/cloud'
import { DEFAULT_CLOUD_COVER_OPACITY } from '../config/cloudCover'
import { mapConfig } from '../config/map'
import { DEFAULT_RADAR_OPACITY } from '../config/radar'
import {
  SMOOTH_CLOUD_ATTRIBUTION,
  SMOOTH_CLOUD_DOMAIN,
  SMOOTH_CLOUD_FAILURE_MESSAGE,
  SMOOTH_CLOUD_SOURCE_URL,
  SMOOTH_CLOUD_UNSUPPORTED_MESSAGE,
} from '../config/smoothCloud'
import type {
  CloudCoverCell,
  CloudCoverDataset,
  CloudCoverViewport,
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
  MapMode,
  RadarFrame,
  RadarPalette,
  SmoothCloudState,
  UserLocation,
} from '../types/weather'
import { cloudCoverCategory } from '../utils/cloudCoverGrid'
import {
  getSmoothCloudValidTime,
  isPointInsideBoundary,
} from '../utils/smoothCloud'
import { CloudCoverLegend } from './CloudCoverLegend'
import { RadarLegend } from './RadarLegend'
import { SmoothCloudLegend } from './SmoothCloudLegend'

const RADAR_SOURCE_ID = 'rainwatch-radar'
const RADAR_LAYER_ID = 'rainwatch-radar-layer'
const SATELLITE_SOURCE_ID = 'rainwatch-satellite'
const SATELLITE_LAYER_ID = 'rainwatch-satellite-layer'
const CLOUD_COVER_SOURCE_ID = 'rainwatch-cloud-cover'
const CLOUD_COVER_LAYER_ID = 'rainwatch-cloud-cover-layer'
const SMOOTH_CLOUD_SOURCE_ID = 'rainwatch-smooth-cloud'
const SMOOTH_CLOUD_LAYER_ID = 'rainwatch-smooth-cloud-layer'

setWorkerUrl(mapLibreWorkerUrl)

interface CloudCoverSummary {
  cell: CloudCoverCell
  label: string
}

interface WeatherMapProps {
  buildSatelliteImageRequest: (
    frame: CloudFrame,
    viewport: CloudViewport,
  ) => CloudImageRequest | null
  satelliteFrame: CloudFrame | null
  satelliteNotice: string | null
  satelliteOpacity: number
  cloudCoverDataset: CloudCoverDataset | null
  cloudCoverNotice: string | null
  cloudCoverOpacity: number
  cloudCoverSummary: CloudCoverSummary | null
  loadCloudCoverViewport: (viewport: CloudCoverViewport) => Promise<void>
  mapMode: MapMode
  onMapViewportChange: (viewport: CloudCoverViewport) => void
  onSmoothCloudStateChange: (state: SmoothCloudState) => void
  radarFrame: RadarFrame | null
  radarPalette: RadarPalette
  radarNotice: string | null
  radarOpacity: number
  smoothCloudOpacity: number
  smoothCloudRefreshKey: number
  smoothCloudState: SmoothCloudState
  userLocation: UserLocation | null
  windCard: ReactNode
}

function cloudCoverGeoJson(dataset: CloudCoverDataset) {
  return {
    type: 'FeatureCollection' as const,
    features: dataset.cells.map((cell) => ({
      type: 'Feature' as const,
      properties: {
        cloudCoverPercent: cell.cloudCoverPercent,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [cell.west, cell.north],
          [cell.east, cell.north],
          [cell.east, cell.south],
          [cell.west, cell.south],
          [cell.west, cell.north],
        ]],
      },
    })),
  }
}

function cloudCoverOpacityExpression(opacity: number): [
  'interpolate',
  ['linear'],
  ['get', string],
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] {
  return [
    'interpolate',
    ['linear'],
    ['get', 'cloudCoverPercent'],
    0,
    0.06 * opacity,
    20,
    0.18 * opacity,
    50,
    0.42 * opacity,
    80,
    0.66 * opacity,
    100,
    0.8 * opacity,
  ]
}

export function WeatherMap({
  buildSatelliteImageRequest,
  satelliteFrame,
  satelliteNotice,
  satelliteOpacity,
  cloudCoverDataset,
  cloudCoverNotice,
  cloudCoverOpacity,
  cloudCoverSummary,
  loadCloudCoverViewport,
  mapMode,
  onMapViewportChange,
  onSmoothCloudStateChange,
  radarFrame,
  radarPalette,
  radarNotice,
  radarOpacity,
  smoothCloudOpacity,
  smoothCloudRefreshKey,
  smoothCloudState,
  userLocation,
  windCard,
}: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const locationMarkerRef = useRef<Marker | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [radarTileError, setRadarTileError] = useState<string | null>(null)
  const [satelliteImageError, setSatelliteImageError] = useState<string | null>(null)
  const [cloudCoverLayerError, setCloudCoverLayerError] = useState<string | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const mapModeRef = useRef(mapMode)
  const smoothCloudOpacityRef = useRef(smoothCloudOpacity)
  const smoothCloudValidTimeRef = useRef<number | null>(null)
  const smoothCloudStateChangeRef = useRef(onSmoothCloudStateChange)
  const cloudCoverData = useMemo(
    () => (cloudCoverDataset ? cloudCoverGeoJson(cloudCoverDataset) : null),
    [cloudCoverDataset],
  )

  useEffect(() => {
    mapModeRef.current = mapMode
  }, [mapMode])

  useEffect(() => {
    smoothCloudOpacityRef.current = smoothCloudOpacity
  }, [smoothCloudOpacity])

  useEffect(() => {
    smoothCloudStateChangeRef.current = onSmoothCloudStateChange
  }, [onSmoothCloudStateChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

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
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new ScaleControl(), 'bottom-left')

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    map.on('error', (event) => {
      if ('sourceId' in event && event.sourceId === RADAR_SOURCE_ID) {
        setRadarTileError('Radar tiles could not be loaded. The basemap is still available.')
        return
      }
      if ('sourceId' in event && event.sourceId === SATELLITE_SOURCE_ID) {
        setSatelliteImageError('Satellite image could not be loaded. Other map layers remain available.')
        return
      }
      if ('sourceId' in event && event.sourceId === CLOUD_COVER_SOURCE_ID) {
        setCloudCoverLayerError('Cloud Cover could not be drawn. The basemap is still available.')
        return
      }
      if (
        'sourceId' in event &&
        event.sourceId === SMOOTH_CLOUD_SOURCE_ID &&
        mapModeRef.current === 'smooth-cloud'
      ) {
        smoothCloudStateChangeRef.current({
          status: 'error',
          message: SMOOTH_CLOUD_FAILURE_MESSAGE,
          validTimeMs: smoothCloudValidTimeRef.current,
          loadedAtMs: null,
        })
        return
      }
      setMapError(event.error?.message ?? 'The basemap could not be loaded.')
    })

    map.on('sourcedata', (event) => {
      if (event.sourceId === RADAR_SOURCE_ID && event.isSourceLoaded) setRadarTileError(null)
      if (event.sourceId === SATELLITE_SOURCE_ID && event.isSourceLoaded) setSatelliteImageError(null)
      if (event.sourceId === CLOUD_COVER_SOURCE_ID && event.isSourceLoaded) setCloudCoverLayerError(null)
      if (
        event.sourceId === SMOOTH_CLOUD_SOURCE_ID &&
        event.isSourceLoaded &&
        mapModeRef.current === 'smooth-cloud'
      ) {
        smoothCloudStateChangeRef.current({
          status: 'ready',
          message: null,
          validTimeMs: smoothCloudValidTimeRef.current,
          loadedAtMs: Date.now(),
        })
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
    if (!map || !isMapReady) return

    const reportViewport = () => {
      const bounds = map.getBounds()
      onMapViewportChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: map.getZoom(),
      })
    }

    reportViewport()
    map.on('moveend', reportViewport)
    return () => {
      map.off('moveend', reportViewport)
    }
  }, [isMapReady, onMapViewportChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    if ((mapMode !== 'radar' && mapMode !== 'both') || !radarFrame) {
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID)
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID)
      return
    }

    const existingSource = map.getSource(RADAR_SOURCE_ID) as RasterTileSource | undefined
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
    const firstSymbolLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
    map.addLayer({
      id: RADAR_LAYER_ID,
      type: 'raster',
      source: RADAR_SOURCE_ID,
      paint: { 'raster-opacity': DEFAULT_RADAR_OPACITY, 'raster-fade-duration': 0 },
    }, firstSymbolLayer)
  }, [isMapReady, mapMode, radarFrame])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    if ((mapMode !== 'satellite' && mapMode !== 'both') || !satelliteFrame) {
      if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID)
      if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID)
      return
    }

    const updateSatelliteImage = () => {
      const bounds = map.getBounds()
      const container = map.getContainer()
      const request = buildSatelliteImageRequest(satelliteFrame, {
        west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth(),
        width: container.clientWidth, height: container.clientHeight, pixelRatio: window.devicePixelRatio,
      })
      if (!request) {
        if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID)
        if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID)
        return
      }
      const existingSource = map.getSource(SATELLITE_SOURCE_ID) as ImageSource | undefined
      if (existingSource) {
        existingSource.updateImage(request)
        return
      }
      map.addSource(SATELLITE_SOURCE_ID, { type: 'image', url: request.url, coordinates: request.coordinates })
      const firstSymbolLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
      const beforeLayer = map.getLayer(RADAR_LAYER_ID) ? RADAR_LAYER_ID : firstSymbolLayer
      map.addLayer({
        id: SATELLITE_LAYER_ID,
        type: 'raster',
        source: SATELLITE_SOURCE_ID,
        paint: { 'raster-opacity': DEFAULT_CLOUD_OPACITY, 'raster-fade-duration': 0 },
      }, beforeLayer)
    }

    let updateTimer: number | null = null
    const scheduleUpdate = () => {
      if (updateTimer !== null) window.clearTimeout(updateTimer)
      updateTimer = window.setTimeout(() => {
        updateTimer = null
        updateSatelliteImage()
      }, 250)
    }
    updateSatelliteImage()
    map.on('moveend', scheduleUpdate)
    map.on('resize', scheduleUpdate)
    return () => {
      if (updateTimer !== null) window.clearTimeout(updateTimer)
      map.off('moveend', scheduleUpdate)
      map.off('resize', scheduleUpdate)
    }
  }, [buildSatelliteImageRequest, isMapReady, mapMode, satelliteFrame])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    if (mapMode !== 'cloud-cover' || !cloudCoverData) {
      if (map.getLayer(CLOUD_COVER_LAYER_ID)) map.removeLayer(CLOUD_COVER_LAYER_ID)
      if (map.getSource(CLOUD_COVER_SOURCE_ID)) map.removeSource(CLOUD_COVER_SOURCE_ID)
      panelRef.current?.removeAttribute('data-cloud-cover-render-ms')
      return
    }

    const renderStartedAt = performance.now()
    const existingSource = map.getSource(CLOUD_COVER_SOURCE_ID) as GeoJSONSource | undefined
    if (existingSource) {
      existingSource.setData(cloudCoverData)
      panelRef.current?.setAttribute(
        'data-cloud-cover-render-ms',
        String(performance.now() - renderStartedAt),
      )
      return
    }
    map.addSource(CLOUD_COVER_SOURCE_ID, { type: 'geojson', data: cloudCoverData })
    const firstSymbolLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
    map.addLayer({
      id: CLOUD_COVER_LAYER_ID,
      type: 'fill',
      source: CLOUD_COVER_SOURCE_ID,
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['get', 'cloudCoverPercent'],
          0, '#dbeafe', 20, '#93c5fd', 50, '#cbd5e1', 80, '#e2e8f0', 100, '#ffffff',
        ],
        'fill-opacity': cloudCoverOpacityExpression(DEFAULT_CLOUD_COVER_OPACITY),
        'fill-outline-color': 'rgba(255, 255, 255, 0.14)',
      },
    }, firstSymbolLayer)
    panelRef.current?.setAttribute(
      'data-cloud-cover-render-ms',
      String(performance.now() - renderStartedAt),
    )
  }, [cloudCoverData, isMapReady, mapMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || mapMode !== 'cloud-cover') return

    const reportViewport = () => {
      const bounds = map.getBounds()
      void loadCloudCoverViewport({
        west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth(), zoom: map.getZoom(),
      })
    }
    let updateTimer: number | null = null
    const scheduleUpdate = () => {
      if (updateTimer !== null) window.clearTimeout(updateTimer)
      updateTimer = window.setTimeout(() => {
        updateTimer = null
        reportViewport()
      }, 350)
    }
    reportViewport()
    map.on('moveend', scheduleUpdate)
    map.on('resize', scheduleUpdate)
    return () => {
      if (updateTimer !== null) window.clearTimeout(updateTimer)
      map.off('moveend', scheduleUpdate)
      map.off('resize', scheduleUpdate)
    }
  }, [isMapReady, loadCloudCoverViewport, mapMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    const removeSmoothCloud = () => {
      if (map.getLayer(SMOOTH_CLOUD_LAYER_ID)) map.removeLayer(SMOOTH_CLOUD_LAYER_ID)
      if (map.getSource(SMOOTH_CLOUD_SOURCE_ID)) map.removeSource(SMOOTH_CLOUD_SOURCE_ID)
    }

    if (mapMode !== 'smooth-cloud') {
      removeSmoothCloud()
      return
    }

    let disposed = false
    let updateBounds: (() => void) | null = null
    let syncAvailability: (() => void) | null = null
    const validTimeMs = getSmoothCloudValidTime()
    smoothCloudValidTimeRef.current = validTimeMs
    onSmoothCloudStateChange({
      status: 'loading',
      message: null,
      validTimeMs,
      loadedAtMs: null,
    })

    void import('@openmeteo/weather-map-layer')
      .then((weatherMapLayer) => {
        if (disposed) return
        const {
          domainOptions,
          getDomainBoundary,
          omProtocol,
          updateCurrentBounds,
        } = weatherMapLayer
        const smoothCloudDomain = domainOptions.find(
          (domain) => domain.value === SMOOTH_CLOUD_DOMAIN,
        )
        if (!smoothCloudDomain) {
          throw new Error('The NOAA HRRR CONUS domain is unavailable.')
        }
        const smoothCloudBoundary = getDomainBoundary(smoothCloudDomain)
        addProtocol('om', omProtocol)

        updateBounds = () => {
          const bounds = map.getBounds()
          updateCurrentBounds([
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ])
        }

        syncAvailability = () => {
          const center = map.getCenter()
          if (
            !isPointInsideBoundary(
              center.lng,
              center.lat,
              smoothCloudBoundary,
            )
          ) {
            removeSmoothCloud()
            onSmoothCloudStateChange({
              status: 'unsupported',
              message: SMOOTH_CLOUD_UNSUPPORTED_MESSAGE,
              validTimeMs,
              loadedAtMs: null,
            })
            return
          }

          updateBounds?.()
          if (map.getSource(SMOOTH_CLOUD_SOURCE_ID)) return

          onSmoothCloudStateChange({
            status: 'loading',
            message: null,
            validTimeMs,
            loadedAtMs: null,
          })
          map.addSource(SMOOTH_CLOUD_SOURCE_ID, {
            type: 'raster',
            url: SMOOTH_CLOUD_SOURCE_URL,
            maxzoom: 12,
            attribution: SMOOTH_CLOUD_ATTRIBUTION,
          })
          const firstSymbolLayer = map.getStyle().layers?.find(
            (layer) => layer.type === 'symbol',
          )?.id
          map.addLayer(
            {
              id: SMOOTH_CLOUD_LAYER_ID,
              type: 'raster',
              source: SMOOTH_CLOUD_SOURCE_ID,
              paint: {
                'raster-opacity': smoothCloudOpacityRef.current,
                'raster-fade-duration': 180,
              },
            },
            firstSymbolLayer,
          )
        }

        map.on('dataloading', updateBounds)
        map.on('moveend', syncAvailability)
        syncAvailability()
      })
      .catch(() => {
        if (disposed) return
        onSmoothCloudStateChange({
          status: 'error',
          message: SMOOTH_CLOUD_FAILURE_MESSAGE,
          validTimeMs,
          loadedAtMs: null,
        })
      })

    return () => {
      disposed = true
      if (updateBounds) map.off('dataloading', updateBounds)
      if (syncAvailability) map.off('moveend', syncAvailability)
      removeSmoothCloud()
    }
  }, [isMapReady, mapMode, onSmoothCloudStateChange, smoothCloudRefreshKey])

  useEffect(() => {
    const map = mapRef.current
    if (map && isMapReady && map.getLayer(RADAR_LAYER_ID)) map.setPaintProperty(RADAR_LAYER_ID, 'raster-opacity', radarOpacity)
  }, [isMapReady, radarOpacity])

  useEffect(() => {
    const map = mapRef.current
    if (map && isMapReady && map.getLayer(SATELLITE_LAYER_ID)) map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', satelliteOpacity)
  }, [isMapReady, satelliteOpacity])

  useEffect(() => {
    const map = mapRef.current
    if (map && isMapReady && map.getLayer(CLOUD_COVER_LAYER_ID)) {
      map.setPaintProperty(CLOUD_COVER_LAYER_ID, 'fill-opacity', cloudCoverOpacityExpression(cloudCoverOpacity))
    }
  }, [cloudCoverOpacity, isMapReady])

  useEffect(() => {
    const map = mapRef.current
    if (map && isMapReady && map.getLayer(SMOOTH_CLOUD_LAYER_ID)) {
      map.setPaintProperty(
        SMOOTH_CLOUD_LAYER_ID,
        'raster-opacity',
        smoothCloudOpacity,
      )
    }
  }, [isMapReady, smoothCloudOpacity])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocation) return
    const coordinates: [number, number] = [userLocation.longitude, userLocation.latitude]
    if (!locationMarkerRef.current) {
      const marker = new Marker({ color: '#0284c7' }).setLngLat(coordinates).addTo(map)
      marker.getElement().setAttribute('aria-label', 'Your current location')
      marker.getElement().setAttribute('role', 'img')
      locationMarkerRef.current = marker
    } else {
      locationMarkerRef.current.setLngLat(coordinates)
    }
    map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 11), essential: true })
  }, [userLocation])

  const cloudCoverError = cloudCoverLayerError ?? cloudCoverNotice
  const smoothCloudError = smoothCloudState.message
  return (
    <section
      ref={panelRef}
      className={`map-panel map-panel--${mapMode}`}
      aria-label="Interactive weather map"
      data-cloud-cover-cells={cloudCoverDataset?.cells.length}
      data-cloud-cover-requests={cloudCoverDataset?.requestCount}
      data-cloud-cover-request-url-length={cloudCoverDataset?.requestUrlLength}
      data-cloud-cover-bytes={cloudCoverDataset?.responseBytes}
      data-cloud-cover-response-ms={cloudCoverDataset?.responseDurationMs}
      data-cloud-cover-processing-ms={cloudCoverDataset?.processingDurationMs}
      data-cloud-cover-fetched-at={cloudCoverDataset?.fetchedAtMs}
    >
      <div ref={containerRef} className="map-container" />
      {windCard}
      {!isMapReady && !mapError && <div className="map-message map-message--loading" role="status">Loading map…</div>}
      {mapError && <div className="map-message" role="status">The map is temporarily unavailable. {mapError}</div>}
      {!mapError && (
        <div className={`weather-notices${mapMode === 'cloud-cover' && cloudCoverSummary ? ' weather-notices--with-summary' : ''}`}>
          {(mapMode === 'radar' || mapMode === 'both') && (radarTileError || radarNotice) && <div className="radar-notice" role="status">{radarTileError ?? radarNotice}</div>}
          {(mapMode === 'satellite' || mapMode === 'both') && (satelliteImageError || satelliteNotice) && <div className="radar-notice" role="status">{satelliteImageError ?? satelliteNotice}</div>}
          {mapMode === 'cloud-cover' && cloudCoverError && <div className="radar-notice" role="status">{cloudCoverError}</div>}
          {mapMode === 'smooth-cloud' && smoothCloudError && <div className="radar-notice" role="status">{smoothCloudError}</div>}
        </div>
      )}
      {(mapMode === 'radar' || mapMode === 'both') && <RadarLegend palette={radarPalette} />}
      {mapMode === 'cloud-cover' && <CloudCoverLegend />}
      {mapMode === 'smooth-cloud' && <SmoothCloudLegend />}
      {mapMode === 'cloud-cover' && cloudCoverSummary && (
        <div className="cloud-cover-summary">
          <span>{cloudCoverSummary.label}</span>
          <strong>{Math.round(cloudCoverSummary.cell.cloudCoverPercent)}%</strong>
          <b>{cloudCoverCategory(cloudCoverSummary.cell.cloudCoverPercent)}</b>
          <small>Approximate model grid value</small>
        </div>
      )}
      {(mapMode === 'satellite' || mapMode === 'both') && satelliteFrame && (
        <div className="cloud-attribution"><a href={satelliteFrame.attributionUrl} target="_blank" rel="noreferrer">{satelliteFrame.attributionLabel}</a></div>
      )}
      {mapMode === 'cloud-cover' && cloudCoverDataset && (
        <div className="cloud-attribution"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Cloud Cover © Open-Meteo</a></div>
      )}
      {mapMode === 'smooth-cloud' && (
        <div className="cloud-attribution"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Smooth Cloud data © Open-Meteo</a></div>
      )}
    </section>
  )
}
