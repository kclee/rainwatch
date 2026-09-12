import type { CloudFrame, CloudStatus, MapMode, RadarFrame } from '../types/weather'
import { formatRelativeTime } from '../utils/radarTime'

const frameTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

interface TimelineProps {
  frames: RadarFrame[]
  cloudFrame: CloudFrame | null
  cloudOpacity: number
  cloudStatus: CloudStatus
  isPlaying: boolean
  mapMode: MapMode
  radarOpacity: number
  selectedIndex: number
  nowMs: number
  onChangeOpacity: (opacity: number) => void
  onChangeCloudOpacity: (opacity: number) => void
  onSelectFrame: (index: number) => void
  onTogglePlayback: () => void
}

export function Timeline({
  frames,
  cloudFrame,
  cloudOpacity,
  cloudStatus,
  isPlaying,
  mapMode,
  radarOpacity,
  selectedIndex,
  nowMs,
  onChangeOpacity,
  onChangeCloudOpacity,
  onSelectFrame,
  onTogglePlayback,
}: TimelineProps) {
  const selectedFrame = frames[selectedIndex]
  const showRadar = mapMode !== 'cloud'
  const showCloud = mapMode !== 'radar'
  if (showRadar && !selectedFrame && !showCloud) {
    return null
  }

  const selectedDate = selectedFrame
    ? new Date(selectedFrame.timestampSeconds * 1000)
    : null
  const selectedTime = selectedDate ? frameTimeFormatter.format(selectedDate) : ''
  const relativeTime = selectedDate
    ? formatRelativeTime(selectedDate.getTime(), nowMs)
    : ''
  const relativeLabel = selectedFrame
    ? selectedIndex === frames.length - 1
      ? `Latest · ${relativeTime}`
      : relativeTime
    : ''
  const opacityPercent = Math.round(radarOpacity * 100)
  const cloudOpacityPercent = Math.round(cloudOpacity * 100)
  const cloudDate =
    cloudFrame?.timestampMs === null || cloudFrame?.timestampMs === undefined
      ? null
      : new Date(cloudFrame.timestampMs)
  const cloudRelativeLabel = cloudDate
    ? `Cloud · Latest · ${formatRelativeTime(cloudDate.getTime(), nowMs)}`
    : cloudStatus === 'loading'
      ? 'Cloud · Loading…'
      : 'Cloud · Time unavailable'

  return (
    <section className="timeline" aria-label="Weather layer controls">
      {showRadar && selectedFrame && selectedDate && (
        <div className="radar-controls">
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
            <strong>Radar · {relativeLabel}</strong>
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
        </div>
      )}
      {showCloud && (
        <div className="cloud-controls">
          <div className="timeline-time" aria-live="polite">
            <strong>{cloudRelativeLabel}</strong>
            {cloudDate && (
              <time dateTime={cloudDate.toISOString()}>
                {frameTimeFormatter.format(cloudDate)}
              </time>
            )}
            <span>NOAA GOES GeoColor</span>
          </div>
          <div className="opacity-control">
            <label htmlFor="cloud-opacity">
              Cloud opacity{' '}
              <output htmlFor="cloud-opacity">{cloudOpacityPercent}%</output>
            </label>
            <input
              id="cloud-opacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cloudOpacity}
              aria-valuetext={`${cloudOpacityPercent}%`}
              onChange={(event) => onChangeCloudOpacity(Number(event.target.value))}
            />
          </div>
        </div>
      )}
    </section>
  )
}
