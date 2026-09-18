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
import {
  MAX_FRAME_MATCH_DIFFERENCE_MINUTES,
  MAX_FRAME_MATCH_DIFFERENCE_MS,
} from './config/frameMatching'
import { DEFAULT_SMOOTH_CLOUD_OPACITY } from './config/smoothCloud'
import {
  isMapModeEnabled,
  MAP_MODE_STORAGE_KEY,
  normalizeMapMode,
} from './config/mapModes'
import { useCloudCover } from './hooks/useCloudCover'
import { useCloudImagery } from './hooks/useCloudImagery'
import { useGeolocation } from './hooks/useGeolocation'
import { useRadarFrames } from './hooks/useRadarFrames'
import { useSatelliteHistory } from './hooks/useSatelliteHistory'
import { useWind } from './hooks/useWind'
import type {
  CloudCoverViewport,
  FrameMatchQuality,
  MapMode,
  SmoothCloudState,
} from './types/weather'
import { selectCloudCoverSummary } from './utils/cloudCoverGrid'
import { getCloudCoverFreshness } from './utils/cloudCoverTime'
import { getCloudFreshness } from './utils/cloudTime'
import { closestFrame, frameMatchQuality } from './utils/frameMatching'
import {
  formatMetadataRefreshTime,
  getRadarFreshness,
} from './utils/radarTime'
import { selectWindTarget } from './utils/wind'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    try {
      return normalizeMapMode(window.localStorage.getItem(MAP_MODE_STORAGE_KEY))
    } catch {
      return 'radar'
    }
  })
  const showRadar = mapMode === 'radar' || mapMode === 'both'
  const showSatellite = mapMode === 'satellite' || mapMode === 'both'
  const usesSatelliteHistory = mapMode === 'satellite' || mapMode === 'both'
  const showCloudCover = mapMode === 'cloud-cover'
  const showSmoothCloud = mapMode === 'smooth-cloud'
  const cloudCoverGridSizeOverride = parseCloudCoverGridSize(
    window.location.search,
  )
  const satellite = useCloudImagery(showSatellite)
  const satelliteHistory = useSatelliteHistory(usesSatelliteHistory)
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
    usesSatelliteHistory
      ? selectedSatelliteHistoryFrame ?? satellite.frame
      : satellite.frame
  const newestSatelliteFrame =
    usesSatelliteHistory
      ? satelliteHistory.frames.at(-1) ?? satellite.frame
      : satellite.frame
  const combinedReferenceFrame =
    selectedSatelliteHistoryFrame ?? (mapMode === 'both' ? satellite.frame : null)
  const closestRadarMatch = useMemo(
    () =>
      combinedReferenceFrame?.timestampMs === null ||
      combinedReferenceFrame?.timestampMs === undefined
        ? null
        : closestFrame(
            combinedReferenceFrame.timestampMs,
            radar.frames,
            (frame) => frame.timestampSeconds * 1000,
          ),
    [combinedReferenceFrame, radar.frames],
  )
  const combinedReferenceTimestampMs = combinedReferenceFrame?.timestampMs ?? null
  const radarWindowStartMs = radar.frames[0]?.timestampSeconds
    ? radar.frames[0].timestampSeconds * 1000
    : null
  const radarWindowEndMs = radar.frames.at(-1)?.timestampSeconds
    ? (radar.frames.at(-1)?.timestampSeconds ?? 0) * 1000
    : null
  const referenceOutsideRadarWindow =
    combinedReferenceTimestampMs !== null &&
    radarWindowStartMs !== null &&
    radarWindowEndMs !== null &&
    (combinedReferenceTimestampMs < radarWindowStartMs ||
      combinedReferenceTimestampMs > radarWindowEndMs)
  const omitOutsideWindowRadar =
    referenceOutsideRadarWindow &&
    (closestRadarMatch?.differenceMs ?? Number.POSITIVE_INFINITY) >
      MAX_FRAME_MATCH_DIFFERENCE_MS
  const matchedRadarFrame = omitOutsideWindowRadar
    ? null
    : closestRadarMatch?.frame ?? null
  const combinedMatchQuality: FrameMatchQuality = frameMatchQuality(
    matchedRadarFrame ? closestRadarMatch?.differenceMs ?? null : null,
  )
  const displayedRadarFrame = mapMode === 'both' ? matchedRadarFrame : selectedFrame
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
    (usesSatelliteHistory && satelliteHistory.isRefreshing)
  const satelliteIsLastAvailable =
    usesSatelliteHistory && satelliteHistory.frames.length > 0
      ? satelliteHistory.isLastAvailable
      : satellite.isLastAvailable
  const satelliteUpdateLabel = satelliteIsRefreshing
    ? 'Satellite · Refreshing…'
    : satelliteIsLastAvailable
      ? `Satellite · Last available${satelliteFreshness.ageMinutes === null ? '' : ` · ${satelliteFreshness.ageMinutes} min old`}`
      : usesSatelliteHistory &&
          (satelliteHistory.status === 'error' ||
            satelliteHistory.status === 'empty') &&
          satellite.frame
        ? 'Satellite history · Latest only'
        : usesSatelliteHistory && satelliteHistory.lastSuccessfulRefreshAt !== null
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
    usesSatelliteHistory && satelliteHistory.refreshError
      ? satelliteHistory.refreshError
      : usesSatelliteHistory &&
          (satelliteHistory.status === 'error' ||
            satelliteHistory.status === 'empty') &&
          satellite.frame
        ? `${satelliteHistory.message} Showing the current latest image instead.`
        : usesSatelliteHistory && selectedSatelliteHistoryFrame
          ? satelliteFreshness.status === 'stale'
            ? `Satellite imagery may be delayed. Latest image is ${satelliteFreshness.ageMinutes} min old.`
            : null
        : satellite.refreshError
          ? satellite.refreshError
          : satellite.status === 'error' || satellite.status === 'empty'
            ? satellite.message
            : displayedSatelliteFrame?.timestampMs === null
              ? 'Satellite imagery loaded, but NOAA did not provide its timestamp.'
              : satelliteFreshness.status === 'stale'
                ? `Satellite imagery may be delayed. Latest image is ${satelliteFreshness.ageMinutes} min old.`
                : null
  const combinedMatchNotice =
    mapMode !== 'both'
      ? null
      : !combinedReferenceFrame
        ? 'Satellite imagery is unavailable. Radar remains visible.'
        : radar.frames.length === 0
          ? 'Matched radar unavailable. Satellite remains visible.'
          : !matchedRadarFrame
            ? `No radar observation is within ${MAX_FRAME_MATCH_DIFFERENCE_MINUTES} min of this Satellite frame. Satellite remains visible.`
            : combinedMatchQuality === 'large'
              ? `Radar and Satellite observations differ by ${Math.round((closestRadarMatch?.differenceMs ?? 0) / 60_000)} min. Treat this as a poor time match.`
              : null
  const displayedRadarNotice =
    mapMode === 'both' ? radarNotice ?? combinedMatchNotice : radarNotice
  const cloudCoverNotice = cloudCover.refreshError
    ? cloudCover.refreshError
    : cloudCover.status === 'error' || cloudCover.status === 'empty'
      ? cloudCover.message
      : cloudCoverFreshness.status === 'stale'
        ? `Cloud Cover model time is ${cloudCoverFreshness.ageMinutes} min old.`
        : null
  const isPlaybackActive =
    isPlaying && mapMode === 'radar' && radar.frames.length >= 2
  const isSatellitePlaybackActive =
    isSatellitePlaying &&
    usesSatelliteHistory &&
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
    if (!isMapModeEnabled(nextMode)) return
    setMapMode(nextMode)
    if (nextMode !== 'radar') {
      setIsPlaying(false)
    }
    if (nextMode !== 'satellite' && nextMode !== 'both') {
      setIsSatellitePlaying(false)
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(MAP_MODE_STORAGE_KEY, mapMode)
    } catch {
      // The selected mode still works when browser storage is unavailable.
    }
  }, [mapMode])

  function refreshVisibleData() {
    if (showRadar) void radar.refreshRadar()
    if (showSatellite) void satellite.refreshCloud()
    if (usesSatelliteHistory) void satelliteHistory.refreshHistory()
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
        radarFrame={displayedRadarFrame}
        radarPalette={radar.palette}
        radarNotice={displayedRadarNotice}
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
        combinedMatchDifferenceMs={closestRadarMatch?.differenceMs ?? null}
        combinedMatchQuality={combinedMatchQuality}
        combinedRadarFrame={matchedRadarFrame}
        frames={radar.frames}
        isPlaying={isPlaybackActive}
        isSatellitePlaying={isSatellitePlaybackActive}
        mapMode={mapMode}
        nowMs={nowMs}
        radarOpacity={radarOpacity}
        satelliteFrame={displayedSatelliteFrame}
        satelliteFrames={satelliteHistory.frames}
        satelliteOpacity={satelliteOpacity}
        satelliteIsLastAvailable={satelliteIsLastAvailable}
        satelliteStatus={
          usesSatelliteHistory ? satelliteHistory.status : satellite.status
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
