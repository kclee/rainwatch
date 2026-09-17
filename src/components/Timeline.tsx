import type {
  CloudCoverDataset,
  CloudCoverStatus,
  CloudFrame,
  CloudStatus,
  MapMode,
  RadarFrame,
  SmoothCloudState,
} from '../types/weather'
import { formatRelativeTime } from '../utils/radarTime'

const frameTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

interface TimelineProps {
  frames: RadarFrame[]
  satelliteFrame: CloudFrame | null
  satelliteFrames: CloudFrame[]
  satelliteOpacity: number
  satelliteStatus: CloudStatus
  cloudCoverDataset: CloudCoverDataset | null
  cloudCoverOpacity: number
  cloudCoverStatus: CloudCoverStatus
  smoothCloudOpacity: number
  smoothCloudState: SmoothCloudState
  isPlaying: boolean
  isSatellitePlaying: boolean
  mapMode: MapMode
  radarOpacity: number
  selectedIndex: number
  selectedSatelliteIndex: number
  nowMs: number
  onChangeOpacity: (opacity: number) => void
  onChangeSatelliteOpacity: (opacity: number) => void
  onChangeCloudCoverOpacity: (opacity: number) => void
  onChangeSmoothCloudOpacity: (opacity: number) => void
  onSelectFrame: (index: number) => void
  onSelectSatelliteFrame: (index: number) => void
  onTogglePlayback: () => void
  onToggleSatellitePlayback: () => void
}

export function Timeline({
  frames,
  satelliteFrame,
  satelliteFrames,
  satelliteOpacity,
  satelliteStatus,
  cloudCoverDataset,
  cloudCoverOpacity,
  cloudCoverStatus,
  smoothCloudOpacity,
  smoothCloudState,
  isPlaying,
  isSatellitePlaying,
  mapMode,
  radarOpacity,
  selectedIndex,
  selectedSatelliteIndex,
  nowMs,
  onChangeOpacity,
  onChangeSatelliteOpacity,
  onChangeCloudCoverOpacity,
  onChangeSmoothCloudOpacity,
  onSelectFrame,
  onSelectSatelliteFrame,
  onTogglePlayback,
  onToggleSatellitePlayback,
}: TimelineProps) {
  const selectedFrame = frames[selectedIndex]
  const showRadar = mapMode === 'radar' || mapMode === 'both'
  const showSatellite = mapMode === 'satellite' || mapMode === 'both'
  const showCloudCover = mapMode === 'cloud-cover'
  const showSmoothCloud = mapMode === 'smooth-cloud'
  if (showRadar && !selectedFrame && !showSatellite) return null

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
  const satelliteOpacityPercent = Math.round(satelliteOpacity * 100)
  const cloudCoverOpacityPercent = Math.round(cloudCoverOpacity * 100)
  const smoothCloudOpacityPercent = Math.round(smoothCloudOpacity * 100)
  const satelliteDate =
    satelliteFrame?.timestampMs === null || satelliteFrame?.timestampMs === undefined
      ? null
      : new Date(satelliteFrame.timestampMs)
  const satelliteRelativeLabel = satelliteDate
    ? `Satellite · ${
        mapMode === 'satellite' && satelliteFrames.length > 0
          ? selectedSatelliteIndex === satelliteFrames.length - 1
            ? 'Latest · '
            : ''
          : 'Latest · '
      }${formatRelativeTime(satelliteDate.getTime(), nowMs)}`
    : satelliteStatus === 'loading'
      ? 'Satellite · Loading…'
      : 'Satellite · Time unavailable'
  const cloudCoverDate = cloudCoverDataset
    ? new Date(cloudCoverDataset.modelTimestampMs)
    : null
  const cloudCoverCheckedDate = cloudCoverDataset
    ? new Date(cloudCoverDataset.fetchedAtMs)
    : null
  const cloudCoverRelativeLabel = cloudCoverDate
    ? `Model time · ${formatRelativeTime(cloudCoverDate.getTime(), nowMs)}`
    : cloudCoverStatus === 'loading'
      ? 'Cloud Cover · Loading…'
      : 'Cloud Cover · Time unavailable'
  const smoothCloudValidDate = smoothCloudState.validTimeMs
    ? new Date(smoothCloudState.validTimeMs)
    : null
  const smoothCloudLoadedDate = smoothCloudState.loadedAtMs
    ? new Date(smoothCloudState.loadedAtMs)
    : null
  const smoothCloudLabel =
    smoothCloudState.status === 'loading'
      ? 'Smooth Cloud · Loading…'
      : smoothCloudState.status === 'unsupported'
        ? 'Smooth Cloud · Outside coverage'
        : smoothCloudState.status === 'error'
          ? 'Smooth Cloud · Unavailable'
          : smoothCloudValidDate
            ? 'HRRR forecast · Next hour'
            : 'Smooth Cloud · Time unavailable'

  return (
    <section className="timeline" aria-label="Weather layer controls">
      {showRadar && selectedFrame && selectedDate && (
        <div className="radar-controls">
          <button type="button" className="timeline-button timeline-button--play" onClick={onTogglePlayback} disabled={frames.length < 2} aria-pressed={isPlaying}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="timeline-button timeline-button--previous" onClick={() => onSelectFrame(selectedIndex - 1)} disabled={selectedIndex === 0}>
            Previous
          </button>
          <div className="timeline-track">
            <label htmlFor="radar-frame">Radar history</label>
            <input id="radar-frame" type="range" min="0" max={frames.length - 1} step="1" value={selectedIndex} aria-valuetext={`${relativeLabel}, ${selectedTime}, frame ${selectedIndex + 1} of ${frames.length}`} onChange={(event) => onSelectFrame(Number(event.target.value))} />
          </div>
          <div className="timeline-time" aria-live={isPlaying ? 'off' : 'polite'}>
            <strong>Radar · {relativeLabel}</strong>
            <time dateTime={selectedDate.toISOString()}>{selectedTime}</time>
            <span>Frame {selectedIndex + 1} of {frames.length}</span>
          </div>
          <button type="button" className="timeline-button timeline-button--next" onClick={() => onSelectFrame(selectedIndex + 1)} disabled={selectedIndex === frames.length - 1}>
            Next
          </button>
          <div className="opacity-control">
            <label htmlFor="radar-opacity">Radar opacity <output htmlFor="radar-opacity">{opacityPercent}%</output></label>
            <input id="radar-opacity" type="range" min="0" max="1" step="0.05" value={radarOpacity} aria-valuetext={`${opacityPercent}%`} onChange={(event) => onChangeOpacity(Number(event.target.value))} />
          </div>
        </div>
      )}
      {mapMode === 'satellite' && satelliteFrame && satelliteDate && satelliteFrames.length > 0 && (
        <div className="radar-controls satellite-history-controls">
          <button type="button" className="timeline-button timeline-button--play" onClick={onToggleSatellitePlayback} disabled={satelliteFrames.length < 2} aria-pressed={isSatellitePlaying}>
            {isSatellitePlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="timeline-button timeline-button--previous" onClick={() => onSelectSatelliteFrame(selectedSatelliteIndex - 1)} disabled={selectedSatelliteIndex === 0}>
            Previous
          </button>
          <div className="timeline-track">
            <label htmlFor="satellite-frame">Satellite history</label>
            <input id="satellite-frame" type="range" min="0" max={satelliteFrames.length - 1} step="1" value={selectedSatelliteIndex} aria-valuetext={`${satelliteRelativeLabel}, ${frameTimeFormatter.format(satelliteDate)}, frame ${selectedSatelliteIndex + 1} of ${satelliteFrames.length}`} onChange={(event) => onSelectSatelliteFrame(Number(event.target.value))} />
          </div>
          <div className="timeline-time" aria-live={isSatellitePlaying ? 'off' : 'polite'}>
            <strong>{satelliteRelativeLabel}</strong>
            <time dateTime={satelliteDate.toISOString()}>{frameTimeFormatter.format(satelliteDate)}</time>
            <span>Frame {selectedSatelliteIndex + 1} of {satelliteFrames.length} · Observed</span>
          </div>
          <button type="button" className="timeline-button timeline-button--next" onClick={() => onSelectSatelliteFrame(selectedSatelliteIndex + 1)} disabled={selectedSatelliteIndex === satelliteFrames.length - 1}>
            Next
          </button>
          <div className="opacity-control">
            <label htmlFor="satellite-opacity">Satellite opacity <output htmlFor="satellite-opacity">{satelliteOpacityPercent}%</output></label>
            <input id="satellite-opacity" type="range" min="0" max="1" step="0.05" value={satelliteOpacity} aria-valuetext={`${satelliteOpacityPercent}%`} onChange={(event) => onChangeSatelliteOpacity(Number(event.target.value))} />
          </div>
        </div>
      )}
      {showSatellite && (mapMode !== 'satellite' || satelliteFrames.length === 0) && (
        <div className="cloud-controls">
          <div className="timeline-time" aria-live="polite">
            <strong>{satelliteRelativeLabel}</strong>
            {satelliteDate && <time dateTime={satelliteDate.toISOString()}>{frameTimeFormatter.format(satelliteDate)}</time>}
            <span>Observed · NOAA GOES GeoColor</span>
          </div>
          <div className="opacity-control">
            <label htmlFor="satellite-opacity">Satellite opacity <output htmlFor="satellite-opacity">{satelliteOpacityPercent}%</output></label>
            <input id="satellite-opacity" type="range" min="0" max="1" step="0.05" value={satelliteOpacity} aria-valuetext={`${satelliteOpacityPercent}%`} onChange={(event) => onChangeSatelliteOpacity(Number(event.target.value))} />
          </div>
        </div>
      )}
      {showCloudCover && (
        <div className="cloud-controls cloud-cover-controls">
          <div className="timeline-time" aria-live="polite">
            <strong>{cloudCoverRelativeLabel}</strong>
            {cloudCoverDate && <time dateTime={cloudCoverDate.toISOString()}>{frameTimeFormatter.format(cloudCoverDate)}</time>}
            <span>{cloudCoverCheckedDate ? `Checked · ${formatRelativeTime(cloudCoverCheckedDate.getTime(), nowMs)}` : 'Open-Meteo Best Match'}</span>
          </div>
          <div className="opacity-control">
            <label htmlFor="cloud-cover-opacity">Cloud Cover opacity <output htmlFor="cloud-cover-opacity">{cloudCoverOpacityPercent}%</output></label>
            <input id="cloud-cover-opacity" type="range" min="0" max="1" step="0.05" value={cloudCoverOpacity} aria-valuetext={`${cloudCoverOpacityPercent}%`} onChange={(event) => onChangeCloudCoverOpacity(Number(event.target.value))} />
          </div>
        </div>
      )}
      {showSmoothCloud && (
        <div className="cloud-controls smooth-cloud-controls">
          <div className="timeline-time" aria-live="polite">
            <strong>{smoothCloudLabel}</strong>
            {smoothCloudValidDate && (
              <time dateTime={smoothCloudValidDate.toISOString()}>
                Valid · {frameTimeFormatter.format(smoothCloudValidDate)}
              </time>
            )}
            <span>
              {smoothCloudLoadedDate
                ? `Loaded · ${formatRelativeTime(smoothCloudLoadedDate.getTime(), nowMs)}`
                : 'Experimental · NOAA HRRR CONUS'}
            </span>
          </div>
          <div className="opacity-control">
            <label htmlFor="smooth-cloud-opacity">Smooth Cloud opacity <output htmlFor="smooth-cloud-opacity">{smoothCloudOpacityPercent}%</output></label>
            <input id="smooth-cloud-opacity" type="range" min="0" max="1" step="0.05" value={smoothCloudOpacity} aria-valuetext={`${smoothCloudOpacityPercent}%`} onChange={(event) => onChangeSmoothCloudOpacity(Number(event.target.value))} />
          </div>
        </div>
      )}
    </section>
  )
}
