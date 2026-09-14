import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { MapModeSelector } from './components/MapModeSelector'
import { Timeline } from './components/Timeline'
import { WeatherMap } from './components/WeatherMap'
import { DEFAULT_CLOUD_OPACITY } from './config/cloud'
import { DEFAULT_CLOUD_COVER_OPACITY } from './config/cloudCover'
import {
  DEFAULT_RADAR_OPACITY,
  RADAR_CLOCK_UPDATE_INTERVAL_MS,
  RADAR_PLAYBACK_INTERVAL_MS,
} from './config/radar'
import { useCloudCover } from './hooks/useCloudCover'
import { useCloudImagery } from './hooks/useCloudImagery'
import { useGeolocation } from './hooks/useGeolocation'
import { useRadarFrames } from './hooks/useRadarFrames'
import type { MapMode } from './types/weather'
import { selectCloudCoverSummary } from './utils/cloudCoverGrid'
import { getCloudCoverFreshness } from './utils/cloudCoverTime'
import { getCloudFreshness } from './utils/cloudTime'
import {
  formatMetadataRefreshTime,
  getRadarFreshness,
} from './utils/radarTime'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [mapMode, setMapMode] = useState<MapMode>('radar')
  const showRadar = mapMode === 'radar' || mapMode === 'both'
  const showSatellite = mapMode === 'satellite' || mapMode === 'both'
  const showCloudCover = mapMode === 'cloud-cover'
  const satellite = useCloudImagery(showSatellite)
  const cloudCover = useCloudCover(showCloudCover)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [radarOpacity, setRadarOpacity] = useState(DEFAULT_RADAR_OPACITY)
  const [satelliteOpacity, setSatelliteOpacity] = useState(DEFAULT_CLOUD_OPACITY)
  const [cloudCoverOpacity, setCloudCoverOpacity] = useState(
    DEFAULT_CLOUD_COVER_OPACITY,
  )
  const [nowMs, setNowMs] = useState(Date.now)
  const isRequesting = status === 'requesting'
  const buttonLabel = location ? 'Return to my location' : 'Use my location'
  const requestedFrameIndex = selectedFrameId
    ? radar.frames.findIndex((frame) => frame.id === selectedFrameId)
    : -1
  const selectedFrameIndex =
    requestedFrameIndex >= 0
      ? requestedFrameIndex
      : Math.max(radar.frames.length - 1, 0)
  const selectedFrame = radar.frames[selectedFrameIndex] ?? radar.latestFrame
  const freshness = getRadarFreshness(
    radar.latestFrame?.timestampSeconds ?? null,
    nowMs,
  )
  const satelliteFreshness = getCloudFreshness(
    satellite.frame?.timestampMs ?? null,
    nowMs,
  )
  const cloudCoverFreshness = getCloudCoverFreshness(
    cloudCover.dataset?.modelTimestampMs ?? null,
    nowMs,
  )
  const cloudCoverSummary = useMemo(
    () =>
      cloudCover.dataset
        ? selectCloudCoverSummary(
            cloudCover.dataset.cells,
            cloudCover.dataset.viewport,
            location,
          )
        : null,
    [cloudCover.dataset, location],
  )

  const radarUpdateLabel = radar.isRefreshing
    ? 'Radar · Refreshing…'
    : `Radar · ${formatMetadataRefreshTime(radar.lastSuccessfulRefreshAt, nowMs)}`
  const satelliteUpdateLabel = satellite.isRefreshing
    ? 'Satellite · Refreshing…'
    : satellite.status === 'error' || satellite.status === 'empty'
      ? 'Satellite · Unavailable'
      : satellite.lastSuccessfulRefreshAt === null
        ? 'Satellite · Not loaded'
        : `Satellite · ${formatMetadataRefreshTime(satellite.lastSuccessfulRefreshAt, nowMs)}`
  const cloudCoverUpdateLabel = cloudCover.isRefreshing
    ? 'Cloud Cover · Refreshing…'
    : cloudCover.status === 'error' || cloudCover.status === 'empty'
      ? 'Cloud Cover · Unavailable'
      : cloudCover.lastSuccessfulRefreshAt === null
        ? 'Cloud Cover · Not loaded'
        : `Cloud Cover · ${formatMetadataRefreshTime(cloudCover.lastSuccessfulRefreshAt, nowMs)}`
  const radarNotice = radar.refreshError
    ? radar.refreshError
    : radar.status === 'error' || radar.status === 'empty'
      ? radar.message
      : freshness.status === 'stale'
        ? `Radar data may be delayed. Latest frame is ${freshness.ageMinutes} min old.`
        : null
  const satelliteNotice = satellite.refreshError
    ? satellite.refreshError
    : satellite.status === 'error' || satellite.status === 'empty'
      ? satellite.message
      : satellite.frame?.timestampMs === null
        ? 'Satellite imagery loaded, but NOAA did not provide its timestamp.'
        : satelliteFreshness.status === 'stale'
          ? `Satellite imagery may be delayed. Latest image is ${satelliteFreshness.ageMinutes} min old.`
          : null
  const cloudCoverNotice = cloudCover.refreshError
    ? cloudCover.refreshError
    : cloudCover.status === 'error' || cloudCover.status === 'empty'
      ? cloudCover.message
      : cloudCoverFreshness.status === 'stale'
        ? `Cloud Cover model time is ${cloudCoverFreshness.ageMinutes} min old.`
        : null
  const isPlaybackActive = isPlaying && showRadar && radar.frames.length >= 2
  const visibleDataIsRefreshing =
    (showRadar && radar.isRefreshing) ||
    (showSatellite && satellite.isRefreshing) ||
    (showCloudCover && cloudCover.isRefreshing)
  const refreshLabel =
    mapMode === 'radar'
      ? 'Refresh radar'
      : mapMode === 'satellite'
        ? 'Refresh satellite'
        : mapMode === 'cloud-cover'
          ? 'Refresh Cloud Cover'
          : 'Refresh radar + satellite'

  function handleModeChange(nextMode: MapMode) {
    setMapMode(nextMode)
    if (nextMode !== 'radar' && nextMode !== 'both') {
      setIsPlaying(false)
    }
  }

  function refreshVisibleData() {
    if (showRadar) void radar.refreshRadar()
    if (showSatellite) void satellite.refreshCloud()
    if (showCloudCover) void cloudCover.refreshCloudCover()
  }

  useEffect(() => {
    const interval = window.setInterval(
      () => setNowMs(Date.now()),
      RADAR_CLOCK_UPDATE_INTERVAL_MS,
    )
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isPlaybackActive) return
    const interval = window.setInterval(() => {
      setSelectedFrameId((currentId) => {
        const requestedIndex = currentId
          ? radar.frames.findIndex((frame) => frame.id === currentId)
          : radar.frames.length - 1
        const activeIndex =
          requestedIndex >= 0 ? requestedIndex : radar.frames.length - 1
        const nextIndex = (activeIndex + 1) % radar.frames.length
        return radar.frames[nextIndex]?.id ?? null
      })
    }, RADAR_PLAYBACK_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [isPlaybackActive, radar.frames])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local weather layers</p>
          <h1>RainWatch</h1>
          <MapModeSelector value={mapMode} onChange={handleModeChange} />
        </div>
        <div className="location-controls">
          <div className="radar-refresh-controls">
            <div className="provider-statuses" aria-live="polite">
              {showRadar && (
                <p className={`radar-status radar-status--${freshness.status}`}>
                  {radarUpdateLabel}
                </p>
              )}
              {showSatellite && (
                <p className={`radar-status radar-status--${satelliteFreshness.status}`}>
                  {satelliteUpdateLabel}
                </p>
              )}
              {showCloudCover && (
                <p className={`radar-status radar-status--${cloudCoverFreshness.status}`}>
                  {cloudCoverUpdateLabel}
                </p>
              )}
            </div>
            <button
              type="button"
              className="refresh-button"
              onClick={refreshVisibleData}
              disabled={visibleDataIsRefreshing}
            >
              {visibleDataIsRefreshing ? 'Refreshing…' : refreshLabel}
            </button>
          </div>
          <button
            type="button"
            className="location-button"
            onClick={requestLocation}
            disabled={isRequesting}
          >
            {isRequesting ? 'Finding location…' : buttonLabel}
          </button>
          <p
            className={`location-status${status === 'idle' ? ' location-status--idle' : ''}`}
            aria-live="polite"
          >
            {message ?? 'RainWatch does not store your location.'}
          </p>
        </div>
      </header>
      <WeatherMap
        buildSatelliteImageRequest={satellite.buildImageRequest}
        cloudCoverDataset={cloudCover.dataset}
        cloudCoverNotice={cloudCoverNotice}
        cloudCoverOpacity={cloudCoverOpacity}
        cloudCoverSummary={cloudCoverSummary}
        loadCloudCoverViewport={cloudCover.loadViewport}
        mapMode={mapMode}
        radarFrame={selectedFrame}
        radarPalette={radar.palette}
        radarNotice={radarNotice}
        radarOpacity={radarOpacity}
        satelliteFrame={satellite.frame}
        satelliteNotice={satelliteNotice}
        satelliteOpacity={satelliteOpacity}
        userLocation={location}
      />
      <Timeline
        cloudCoverDataset={cloudCover.dataset}
        cloudCoverOpacity={cloudCoverOpacity}
        cloudCoverStatus={cloudCover.status}
        frames={radar.frames}
        isPlaying={isPlaybackActive}
        mapMode={mapMode}
        nowMs={nowMs}
        radarOpacity={radarOpacity}
        satelliteFrame={satellite.frame}
        satelliteOpacity={satelliteOpacity}
        satelliteStatus={satellite.status}
        selectedIndex={selectedFrameIndex}
        onChangeCloudCoverOpacity={setCloudCoverOpacity}
        onChangeOpacity={setRadarOpacity}
        onChangeSatelliteOpacity={setSatelliteOpacity}
        onSelectFrame={(index) =>
          setSelectedFrameId(radar.frames[index]?.id ?? null)
        }
        onTogglePlayback={() => setIsPlaying((playing) => !playing)}
      />
    </main>
  )
}

export default App
