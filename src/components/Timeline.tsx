import type { RadarFrame } from '../types/weather'
import { formatRelativeTime } from '../utils/radarTime'

const frameTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

interface TimelineProps {
  frames: RadarFrame[]
  isPlaying: boolean
  radarOpacity: number
  selectedIndex: number
  nowMs: number
  onChangeOpacity: (opacity: number) => void
  onSelectFrame: (index: number) => void
  onTogglePlayback: () => void
}

export function Timeline({
  frames,
  isPlaying,
  radarOpacity,
  selectedIndex,
  nowMs,
  onChangeOpacity,
  onSelectFrame,
  onTogglePlayback,
}: TimelineProps) {
  const selectedFrame = frames[selectedIndex]
  if (!selectedFrame) {
    return null
  }

  const selectedDate = new Date(selectedFrame.timestampSeconds * 1000)
  const selectedTime = frameTimeFormatter.format(selectedDate)
  const relativeTime = formatRelativeTime(selectedDate.getTime(), nowMs)
  const relativeLabel =
    selectedIndex === frames.length - 1
      ? `Latest · ${relativeTime}`
      : relativeTime
  const opacityPercent = Math.round(radarOpacity * 100)

  return (
    <section className="timeline" aria-label="Historical radar timeline">
      <button
        type="button"
        className="timeline-button timeline-button--play"
        onClick={onTogglePlayback}
        disabled={frames.length < 2}
        aria-pressed={isPlaying}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className="timeline-button timeline-button--previous"
        onClick={() => onSelectFrame(selectedIndex - 1)}
        disabled={selectedIndex === 0}
      >
        Previous
      </button>
      <div className="timeline-track">
        <label htmlFor="radar-frame">Radar history</label>
        <input
          id="radar-frame"
          type="range"
          min="0"
          max={frames.length - 1}
          step="1"
          value={selectedIndex}
          aria-valuetext={`${relativeLabel}, ${selectedTime}, frame ${selectedIndex + 1} of ${frames.length}`}
          onChange={(event) => onSelectFrame(Number(event.target.value))}
        />
      </div>
      <div className="timeline-time" aria-live={isPlaying ? 'off' : 'polite'}>
        <strong>{relativeLabel}</strong>
        <time dateTime={selectedDate.toISOString()}>{selectedTime}</time>
        <span>
          Frame {selectedIndex + 1} of {frames.length}
        </span>
      </div>
      <button
        type="button"
        className="timeline-button timeline-button--next"
        onClick={() => onSelectFrame(selectedIndex + 1)}
        disabled={selectedIndex === frames.length - 1}
      >
        Next
      </button>
      <div className="opacity-control">
        <label htmlFor="radar-opacity">
          Radar opacity <output htmlFor="radar-opacity">{opacityPercent}%</output>
        </label>
        <input
          id="radar-opacity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={radarOpacity}
          aria-valuetext={`${opacityPercent}%`}
          onChange={(event) => onChangeOpacity(Number(event.target.value))}
        />
      </div>
    </section>
  )
}
