import { useEffect, useState } from 'react'
import './App.css'
import { MapModeSelector } from './components/MapModeSelector'
import { Timeline } from './components/Timeline'
import { WeatherMap } from './components/WeatherMap'
import { DEFAULT_CLOUD_OPACITY } from './config/cloud'
import {
  DEFAULT_RADAR_OPACITY,
  RADAR_CLOCK_UPDATE_INTERVAL_MS,
  RADAR_PLAYBACK_INTERVAL_MS,
} from './config/radar'
import { useGeolocation } from './hooks/useGeolocation'
import { useCloudImagery } from './hooks/useCloudImagery'
import { useRadarFrames } from './hooks/useRadarFrames'
import type { MapMode } from './types/weather'
import { getCloudFreshness } from './utils/cloudTime'
import {
  formatMetadataRefreshTime,
  getRadarFreshness,
} from './utils/radarTime'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [mapMode, setMapMode] = useState<MapMode>('radar')
  const cloudEnabled = mapMode !== 'radar'
  const cloud = useCloudImagery(cloudEnabled)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [radarOpacity, setRadarOpacity] = useState(DEFAULT_RADAR_OPACITY)
  const [cloudOpacity, setCloudOpacity] = useState(DEFAULT_CLOUD_OPACITY)
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
  const selectedFrame =
    radar.frames[selectedFrameIndex] ?? radar.latestFrame
  const freshness = getRadarFreshness(
    radar.latestFrame?.timestampSeconds ?? null,
    nowMs,
  )
  const cloudFreshness = getCloudFreshness(cloud.frame?.timestampMs ?? null, nowMs)
  const radarUpdateLabel = radar.isRefreshing
    ? 'Radar · Refreshing…'
    : `Radar · ${formatMetadataRefreshTime(radar.lastSuccessfulRefreshAt, nowMs)}`
  const cloudUpdateLabel = cloud.isRefreshing
    ? 'Cloud · Refreshing…'
    : cloud.status === 'error' || cloud.status === 'empty'
      ? 'Cloud · Unavailable'
    : cloud.lastSuccessfulRefreshAt === null
      ? 'Cloud · Not loaded'
      : `Cloud · ${formatMetadataRefreshTime(cloud.lastSuccessfulRefreshAt, nowMs)}`
  const radarNotice = radar.refreshError
    ? radar.refreshError
    : radar.status === 'error' || radar.status === 'empty'
      ? radar.message
      : freshness.status === 'stale'
        ? `Radar data may be delayed. Latest frame is ${freshness.ageMinutes} min old.`
        : null
  const cloudNotice = cloud.refreshError
    ? cloud.refreshError
    : cloud.status === 'error' || cloud.status === 'empty'
      ? cloud.message
      : cloud.frame?.timestampMs === null
        ? 'Satellite imagery loaded, but NOAA did not provide its timestamp.'
        : cloudFreshness.status === 'stale'
          ? `Satellite imagery may be delayed. Latest image is ${cloudFreshness.ageMinutes} min old.`
          : null
  const isPlaybackActive =
    isPlaying && mapMode !== 'cloud' && radar.frames.length >= 2
  const visibleDataIsRefreshing =
    (mapMode !== 'cloud' && radar.isRefreshing) ||
    (mapMode !== 'radar' && cloud.isRefreshing)
  const refreshLabel =
    mapMode === 'radar'
      ? 'Refresh radar'
      : mapMode === 'cloud'
        ? 'Refresh cloud'
        : 'Refresh both'

  function handleModeChange(nextMode: MapMode) {
    setMapMode(nextMode)
    if (nextMode === 'cloud') {
      setIsPlaying(false)
    }
  }

  function refreshVisibleData() {
    if (mapMode !== 'cloud') {
      void radar.refreshRadar()
    }
    if (mapMode !== 'radar') {
      void cloud.refreshCloud()
    }
  }

  useEffect(() => {
    const interval = window.setInterval(
      () => setNowMs(Date.now()),
      RADAR_CLOCK_UPDATE_INTERVAL_MS,
    )

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isPlaybackActive) {
      return
    }

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
              {mapMode !== 'cloud' && (
                <p className={`radar-status radar-status--${freshness.status}`}>
                  {radarUpdateLabel}
                </p>
              )}
              {mapMode !== 'radar' && (
                <p
                  className={`radar-status radar-status--${cloudFreshness.status}`}
                >
                  {cloudUpdateLabel}
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
        buildCloudImageRequest={cloud.buildImageRequest}
        cloudFrame={cloud.frame}
        cloudNotice={cloudNotice}
        cloudOpacity={cloudOpacity}
        mapMode={mapMode}
        radarFrame={selectedFrame}
        radarPalette={radar.palette}
        radarNotice={radarNotice}
        radarOpacity={radarOpacity}
        userLocation={location}
      />
      <Timeline
        cloudFrame={cloud.frame}
        cloudOpacity={cloudOpacity}
        cloudStatus={cloud.status}
        frames={radar.frames}
        isPlaying={isPlaybackActive}
        mapMode={mapMode}
        nowMs={nowMs}
        radarOpacity={radarOpacity}
        selectedIndex={selectedFrameIndex}
        onChangeCloudOpacity={setCloudOpacity}
        onChangeOpacity={setRadarOpacity}
        onSelectFrame={(index) =>
          setSelectedFrameId(radar.frames[index]?.id ?? null)
        }
        onTogglePlayback={() => setIsPlaying((playing) => !playing)}
      />
    </main>
  )
}

export default App
