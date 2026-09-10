import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="page-title">
        <p className="eyebrow">Local weather radar</p>
        <h1 id="page-title">RainWatch</h1>
        <p className="summary">
          See what rain is around you and how it has moved during the past two
          hours.
        </p>
        <p className="status">Project foundation ready. Map setup comes next.</p>
      </section>
    </main>
  )
}

export default App
