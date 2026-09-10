import { useEffect, useState } from 'react'
import './App.css'
import { Timeline } from './components/Timeline'
import { WeatherMap } from './components/WeatherMap'
import { RADAR_PLAYBACK_INTERVAL_MS } from './config/radar'
import { useGeolocation } from './hooks/useGeolocation'
import { useRadarFrames } from './hooks/useRadarFrames'

const radarTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
  const radar = useRadarFrames()
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const isRequesting = status === 'requesting'
  const buttonLabel = location ? 'Return to my location' : 'Use my location'
  const selectedFrameIndex =
    currentFrameIndex ?? Math.max(radar.frames.length - 1, 0)
  const selectedFrame =
    radar.frames[selectedFrameIndex] ?? radar.latestFrame

  useEffect(() => {
    if (!isPlaying || radar.frames.length < 2) {
      return
    }

    const interval = window.setInterval(() => {
      setCurrentFrameIndex((currentIndex) => {
        const activeIndex = currentIndex ?? radar.frames.length - 1
        return (activeIndex + 1) % radar.frames.length
      })
    }, RADAR_PLAYBACK_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isPlaying, radar.frames.length])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local weather radar</p>
          <h1>RainWatch</h1>
        </div>
        <div className="location-controls">
          <p
            className={`radar-status radar-status--${radar.status}`}
            aria-live="polite"
          >
            {selectedFrame
              ? `Radar: ${radarTimeFormatter.format(selectedFrame.timestampSeconds * 1000)}`
              : radar.message}
          </p>
          <button
            type="button"
            className="location-button"
            onClick={requestLocation}
            disabled={isRequesting}
          >
            {isRequesting ? 'Finding location…' : buttonLabel}
          </button>
          <p className="location-status" aria-live="polite">
            {message ?? 'RainWatch does not store your location.'}
          </p>
        </div>
      </header>
      <WeatherMap radarFrame={selectedFrame} userLocation={location} />
      <Timeline
        frames={radar.frames}
        isPlaying={isPlaying}
        selectedIndex={selectedFrameIndex}
        onSelectFrame={setCurrentFrameIndex}
        onTogglePlayback={() => setIsPlaying((playing) => !playing)}
      />
    </main>
  )
}

export default App
