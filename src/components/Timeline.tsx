import type { RadarFrame } from '../types/weather'

const frameTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

interface TimelineProps {
  frames: RadarFrame[]
  selectedIndex: number
  onSelectFrame: (index: number) => void
}

export function Timeline({
  frames,
  selectedIndex,
  onSelectFrame,
}: TimelineProps) {
  const selectedFrame = frames[selectedIndex]
  if (!selectedFrame) {
    return null
  }

  const selectedDate = new Date(selectedFrame.timestampSeconds * 1000)
  const selectedTime = frameTimeFormatter.format(selectedDate)

  return (
    <section className="timeline" aria-label="Historical radar timeline">
      <button
        type="button"
        className="timeline-button"
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
          aria-valuetext={`${selectedTime}, frame ${selectedIndex + 1} of ${frames.length}`}
          onChange={(event) => onSelectFrame(Number(event.target.value))}
        />
      </div>
      <div className="timeline-time" aria-live="polite">
        <time dateTime={selectedDate.toISOString()}>{selectedTime}</time>
        <span>
          Frame {selectedIndex + 1} of {frames.length}
        </span>
      </div>
      <button
        type="button"
        className="timeline-button"
        onClick={() => onSelectFrame(selectedIndex + 1)}
        disabled={selectedIndex === frames.length - 1}
      >
        Next
      </button>
    </section>
  )
}
