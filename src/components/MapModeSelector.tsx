import type { MapMode } from '../types/weather'
import { isMapModeEnabled } from '../config/mapModes'

const modes: Array<{ value: MapMode; label: string }> = [
  { value: 'radar', label: 'Radar' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'cloud-cover', label: 'Cloud Cover' },
  { value: 'smooth-cloud', label: 'Smooth Cloud · Lab' },
  { value: 'both', label: 'Radar + Satellite' },
]

interface MapModeSelectorProps {
  value: MapMode
  onChange: (mode: MapMode) => void
}

export function MapModeSelector({ value, onChange }: MapModeSelectorProps) {
  return (
    <div className="map-mode-selector" role="group" aria-label="Map mode">
      {modes.map((mode) => {
        const isEnabled = isMapModeEnabled(mode.value)
        return (
          <button
            type="button"
            key={mode.value}
            className={value === mode.value ? 'is-active' : undefined}
            aria-pressed={isEnabled && value === mode.value}
            disabled={!isEnabled}
            title={!isEnabled ? 'Cloud Cover experiments paused' : undefined}
            onClick={() => onChange(mode.value)}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
