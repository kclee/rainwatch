import './App.css'
import { WeatherMap } from './components/WeatherMap'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local weather radar</p>
          <h1>RainWatch</h1>
        </div>
        <p className="milestone">Interactive map</p>
      </header>
      <WeatherMap />
    </main>
  )
}

export default App
