import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { MapModeSelector } from './components/MapModeSelector'
import { Timeline } from './components/Timeline'
import { WeatherMap } from './components/WeatherMap'
import { WindCard } from './components/WindCard'
import {
  DEFAULT_CLOUD_OPACITY,
  SATELLITE_PLAYBACK_INTERVAL_MS,
} from './config/cloud'
import {
  DEFAULT_CLOUD_COVER_OPACITY,
  parseCloudCoverGridSize,
} from './config/cloudCover'
import {
  DEFAULT_RADAR_OPACITY,
  RADAR_CLOCK_UPDATE_INTERVAL_MS,
  RADAR_PLAYBACK_INTERVAL_MS,
} from './config/radar'
import { DEFAULT_SMOOTH_CLOUD_OPACITY } from './config/smoothCloud'
import { useCloudCover } from './hooks/useCloudCover'
import { useCloudImagery } from './hooks/useCloudImagery'
import { useGeolocation } from './hooks/useGeolocation'
import { useRadarFrames } from './hooks/useRadarFrames'
import { useSatelliteHistory } from './hooks/useSatelliteHistory'
import { useWind } from './hooks/useWind'
import type {
  CloudCoverViewport,
  MapMode,
  SmoothCloudState,
} from './types/weather'
import { selectCloudCoverSummary } from './utils/cloudCoverGrid'
import { getCloudCoverFreshness } from './utils/cloudCoverTime'
import { getCloudFreshness } from './utils/cloudTime'
import {
  formatMetadataRefreshTime,
  getRadarFreshness,
} from './utils/radarTime'
import { selectWindTarget } from './utils/wind'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [mapMode, setMapMode] = useState<MapMode>('radar')
  const showRadar = mapMode === 'radar' || mapMode === 'both'
  const showSatellite = mapMode === 'satellite' || mapMode === 'both'
  const showCloudCover = mapMode === 'cloud-cover'
  const showSmoothCloud = mapMode === 'smooth-cloud'
  const cloudCoverGridSizeOverride = parseCloudCoverGridSize(
    window.location.search,
  )
  const satellite = useCloudImagery(showSatellite)
  const satelliteHistory = useSatelliteHistory(mapMode === 'satellite')
  const cloudCover = useCloudCover(showCloudCover, cloudCoverGridSizeOverride)
  const [mapViewport, setMapViewport] = useState<CloudCoverViewport | null>(null)
  const windTarget = useMemo(
    () => (mapViewport ? selectWindTarget(mapViewport, location) : null),
    [location, mapViewport],
  )
  const wind = useWind(windTarget)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedSatelliteFrameId, setSelectedSatelliteFrameId] = useState<
    string | null
  >(null)
  const [isSatellitePlaying, setIsSatellitePlaying] = useState(false)
  const [failedSatelliteFrameIds, setFailedSatelliteFrameIds] = useState<
    Set<string>
  >(() => new Set())
  const [radarOpacity, setRadarOpacity] = useState(DEFAULT_RADAR_OPACITY)
  const [satelliteOpacity, setSatelliteOpacity] = useState(DEFAULT_CLOUD_OPACITY)
  const [cloudCoverOpacity, setCloudCoverOpacity] = useState(
    DEFAULT_CLOUD_COVER_OPACITY,
  )
  const [smoothCloudOpacity, setSmoothCloudOpacity] = useState(
    DEFAULT_SMOOTH_CLOUD_OPACITY,
  )
  const [smoothCloudRefreshKey, setSmoothCloudRefreshKey] = useState(0)
  const [smoothCloudState, setSmoothCloudState] = useState<SmoothCloudState>({
    status: 'idle',
    message: null,
    validTimeMs: null,
    loadedAtMs: null,
  })
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
  const requestedSatelliteFrameIndex = selectedSatelliteFrameId
    ? satelliteHistory.frames.findIndex(
        (frame) => frame.id === selectedSatelliteFrameId,
      )
    : -1
  const selectedSatelliteFrameIndex =
    requestedSatelliteFrameIndex >= 0
      ? requestedSatelliteFrameIndex
      : Math.max(satelliteHistory.frames.length - 1, 0)
  const selectedSatelliteHistoryFrame =
    satelliteHistory.frames[selectedSatelliteFrameIndex] ?? null
  const displayedSatelliteFrame =
    mapMode === 'satellite'
      ? selectedSatelliteHistoryFrame ?? satellite.frame
      : satellite.frame
  const newestSatelliteFrame =
    mapMode === 'satellite'
      ? satelliteHistory.frames.at(-1) ?? satellite.frame
      : satellite.frame
  const freshness = getRadarFreshness(
    radar.latestFrame?.timestampSeconds ?? null,
    nowMs,
  )
  const satelliteFreshness = getCloudFreshness(
    newestSatelliteFrame?.timestampMs ?? null,
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
  const satelliteIsRefreshing =
    satellite.isRefreshing ||
    (mapMode === 'satellite' && satelliteHistory.isRefreshing)
  const satelliteUpdateLabel = satelliteIsRefreshing
    ? 'Satellite · Refreshing…'
    : mapMode === 'satellite' &&
        (satelliteHistory.status === 'error' ||
          satelliteHistory.status === 'empty') &&
        satellite.frame
      ? 'Satellite history · Latest only'
      : mapMode === 'satellite' && satelliteHistory.lastSuccessfulRefreshAt !== null
        ? `Satellite history · ${formatMetadataRefreshTime(satelliteHistory.lastSuccessfulRefreshAt, nowMs)}`
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
  const smoothCloudUpdateLabel =
    smoothCloudState.status === 'loading'
      ? 'Smooth Cloud · Loading…'
      : smoothCloudState.status === 'ready'
        ? 'Smooth Cloud · Experimental'
        : smoothCloudState.status === 'unsupported'
          ? 'Smooth Cloud · Outside coverage'
          : smoothCloudState.status === 'error'
            ? 'Smooth Cloud · Unavailable'
            : 'Smooth Cloud · Not loaded'
  const radarNotice = radar.refreshError
    ? radar.refreshError
    : radar.status === 'error' || radar.status === 'empty'
      ? radar.message
      : freshness.status === 'stale'
        ? `Radar data may be delayed. Latest frame is ${freshness.ageMinutes} min old.`
        : null
  const satelliteNotice =
    mapMode === 'satellite' && satelliteHistory.refreshError
      ? satelliteHistory.refreshError
      : mapMode === 'satellite' &&
          (satelliteHistory.status === 'error' ||
            satelliteHistory.status === 'empty') &&
          satellite.frame
        ? `${satelliteHistory.message} Showing the current latest image instead.`
        : satellite.refreshError
          ? satellite.refreshError
          : satellite.status === 'error' || satellite.status === 'empty'
            ? satellite.message
            : displayedSatelliteFrame?.timestampMs === null
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
  const isSatellitePlaybackActive =
    isSatellitePlaying &&
    mapMode === 'satellite' &&
    satelliteHistory.frames.length >= 2
  const visibleDataIsRefreshing =
    (showRadar && radar.isRefreshing) ||
    (showSatellite && satelliteIsRefreshing) ||
    (showCloudCover && cloudCover.isRefreshing) ||
    (showSmoothCloud && smoothCloudState.status === 'loading')
  const refreshLabel =
    mapMode === 'radar'
      ? 'Refresh radar'
      : mapMode === 'satellite'
        ? 'Refresh satellite'
        : mapMode === 'cloud-cover'
          ? 'Refresh Cloud Cover'
          : mapMode === 'smooth-cloud'
            ? 'Refresh Smooth Cloud'
            : 'Refresh radar + satellite'

  function handleModeChange(nextMode: MapMode) {
    setMapMode(nextMode)
    if (nextMode !== 'radar' && nextMode !== 'both') {
      setIsPlaying(false)
    }
    if (nextMode !== 'satellite') setIsSatellitePlaying(false)
  }

  function refreshVisibleData() {
    if (showRadar) void radar.refreshRadar()
    if (showSatellite) void satellite.refreshCloud()
    if (mapMode === 'satellite') void satelliteHistory.refreshHistory()
    if (showCloudCover) void cloudCover.refreshCloudCover()
    if (showSmoothCloud) {
      setSmoothCloudRefreshKey((refreshKey) => refreshKey + 1)
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

  useEffect(() => {
    if (!isSatellitePlaybackActive) return
    const interval = window.setInterval(() => {
      setSelectedSatelliteFrameId((currentId) => {
        const frames = satelliteHistory.frames
        const currentIndex = currentId
          ? frames.findIndex((frame) => frame.id === currentId)
          : frames.length - 1
        const activeIndex = currentIndex >= 0 ? currentIndex : frames.length - 1
        for (let offset = 1; offset <= frames.length; offset += 1) {
          const nextIndex = (activeIndex + offset) % frames.length
          const nextFrame = frames[nextIndex]
          if (nextFrame && !failedSatelliteFrameIds.has(nextFrame.id)) {
            return nextFrame.id
          }
        }
        return currentId
      })
    }, SATELLITE_PLAYBACK_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [
    failedSatelliteFrameIds,
    isSatellitePlaybackActive,
    satelliteHistory.frames,
  ])

  const handleSatelliteFrameError = useCallback((frameId: string) => {
    setFailedSatelliteFrameIds((current) => {
      if (current.has(frameId)) return current
      const next = new Set(current)
      next.add(frameId)
      return next
    })
  }, [])

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
              {showSmoothCloud && (
                <p className={`radar-status radar-status--${smoothCloudState.status === 'ready' ? 'fresh' : 'unavailable'}`}>
                  {smoothCloudUpdateLabel}
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
        buildSatelliteImageRequest={
          displayedSatelliteFrame?.source === 'archive'
            ? satelliteHistory.buildImageRequest
            : satellite.buildImageRequest
        }
        cloudCoverDataset={cloudCover.dataset}
        cloudCoverNotice={cloudCoverNotice}
        cloudCoverOpacity={cloudCoverOpacity}
        cloudCoverSummary={cloudCoverSummary}
        loadCloudCoverViewport={cloudCover.loadViewport}
        mapMode={mapMode}
        onMapViewportChange={setMapViewport}
        onSatelliteFrameError={handleSatelliteFrameError}
        onSmoothCloudStateChange={setSmoothCloudState}
        radarFrame={selectedFrame}
        radarPalette={radar.palette}
        radarNotice={radarNotice}
        radarOpacity={radarOpacity}
        satelliteFrame={displayedSatelliteFrame}
        satelliteNotice={satelliteNotice}
        satelliteOpacity={satelliteOpacity}
        smoothCloudOpacity={smoothCloudOpacity}
        smoothCloudRefreshKey={smoothCloudRefreshKey}
        smoothCloudState={smoothCloudState}
        userLocation={location}
        windCard={(
          <WindCard
            isRefreshing={wind.isRefreshing}
            message={wind.message}
            nowMs={nowMs}
            onRefresh={() => void wind.refreshWind()}
            reading={wind.reading}
            refreshError={wind.refreshError}
            status={wind.status}
          />
        )}
      />
      <Timeline
        cloudCoverDataset={cloudCover.dataset}
        cloudCoverOpacity={cloudCoverOpacity}
        cloudCoverStatus={cloudCover.status}
        frames={radar.frames}
        isPlaying={isPlaybackActive}
        isSatellitePlaying={isSatellitePlaybackActive}
        mapMode={mapMode}
        nowMs={nowMs}
        radarOpacity={radarOpacity}
        satelliteFrame={displayedSatelliteFrame}
        satelliteFrames={satelliteHistory.frames}
        satelliteOpacity={satelliteOpacity}
        satelliteStatus={
          mapMode === 'satellite' ? satelliteHistory.status : satellite.status
        }
        selectedSatelliteIndex={selectedSatelliteFrameIndex}
        selectedIndex={selectedFrameIndex}
        onChangeCloudCoverOpacity={setCloudCoverOpacity}
        onChangeOpacity={setRadarOpacity}
        onChangeSatelliteOpacity={setSatelliteOpacity}
        onChangeSmoothCloudOpacity={setSmoothCloudOpacity}
        onSelectFrame={(index) =>
          setSelectedFrameId(radar.frames[index]?.id ?? null)
        }
        onSelectSatelliteFrame={(index) =>
          setSelectedSatelliteFrameId(satelliteHistory.frames[index]?.id ?? null)
        }
        onToggleSatellitePlayback={() =>
          setIsSatellitePlaying((playing) => !playing)
        }
        onTogglePlayback={() => setIsPlaying((playing) => !playing)}
        smoothCloudOpacity={smoothCloudOpacity}
        smoothCloudState={smoothCloudState}
      />
    </main>
  )
}

export default App
