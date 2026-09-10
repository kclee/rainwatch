import './App.css'
import { WeatherMap } from './components/WeatherMap'
import { useGeolocation } from './hooks/useGeolocation'

function App() {
  const { location, message, requestLocation, status } = useGeolocation()
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
      <WeatherMap userLocation={location} />
    </main>
  )
}

export default App
