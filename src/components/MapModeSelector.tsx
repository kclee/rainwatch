import type { MapMode } from '../types/weather'

const modes: Array<{ value: MapMode; label: string }> = [
  { value: 'radar', label: 'Radar' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'both', label: 'Both' },
]

interface MapModeSelectorProps {
  value: MapMode
  onChange: (mode: MapMode) => void
}

export function MapModeSelector({ value, onChange }: MapModeSelectorProps) {
  return (
    <div className="map-mode-selector" role="group" aria-label="Map mode">
      {modes.map((mode) => (
        <button
          type="button"
          key={mode.value}
          className={value === mode.value ? 'is-active' : undefined}
          aria-pressed={value === mode.value}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
