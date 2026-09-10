import './App.css'
import { WeatherMap } from './components/WeatherMap'
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
  const isRequesting = status === 'requesting'
  const buttonLabel = location ? 'Return to my location' : 'Use my location'

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
            {radar.latestFrame
              ? `Radar: ${radarTimeFormatter.format(radar.latestFrame.timestampSeconds * 1000)}`
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
      <WeatherMap radarFrame={radar.latestFrame} userLocation={location} />
    </main>
  )
}

export default App
