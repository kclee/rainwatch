import { useEffect, useState } from 'react'
import './App.css'
import { Timeline } from './components/Timeline'
import { WeatherMap } from './components/WeatherMap'
import {
  DEFAULT_RADAR_OPACITY,
  RADAR_CLOCK_UPDATE_INTERVAL_MS,
  RADAR_PLAYBACK_INTERVAL_MS,
} from './config/radar'
import { useGeolocation } from './hooks/useGeolocation'
import { useRadarFrames } from './hooks/useRadarFrames'
import {
  formatMetadataRefreshTime,
  getRadarFreshness,
} from './utils/radarTime'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [radarOpacity, setRadarOpacity] = useState(DEFAULT_RADAR_OPACITY)
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
  const radarUpdateLabel = radar.isRefreshing
    ? 'Refreshing radar…'
    : formatMetadataRefreshTime(radar.lastSuccessfulRefreshAt, nowMs)
  const radarNotice = radar.refreshError
    ? radar.refreshError
    : radar.status === 'error' || radar.status === 'empty'
      ? radar.message
      : freshness.status === 'stale'
        ? `Radar data may be delayed. Latest frame is ${freshness.ageMinutes} min old.`
        : null
  const isPlaybackActive = isPlaying && radar.frames.length >= 2

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
          <p className="eyebrow">Local weather radar</p>
          <h1>RainWatch</h1>
        </div>
        <div className="location-controls">
          <div className="radar-refresh-controls">
            <p
              className={`radar-status radar-status--${freshness.status}`}
              aria-live="polite"
            >
              {radarUpdateLabel}
            </p>
            <button
              type="button"
              className="refresh-button"
              onClick={() => void radar.refreshRadar()}
              disabled={radar.isRefreshing}
            >
              {radar.isRefreshing ? 'Refreshing…' : 'Refresh radar'}
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
        radarFrame={selectedFrame}
        radarPalette={radar.palette}
        radarNotice={radarNotice}
        radarOpacity={radarOpacity}
        userLocation={location}
      />
      <Timeline
        frames={radar.frames}
        isPlaying={isPlaybackActive}
        nowMs={nowMs}
        radarOpacity={radarOpacity}
        selectedIndex={selectedFrameIndex}
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
