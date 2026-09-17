import type { CSSProperties } from 'react'
import type { WindReading, WindStatus } from '../types/weather.ts'
import {
  degreesToCompass,
  formatWindSpeedMph,
  windLocationLabel,
  windMovementDegrees,
} from '../utils/wind.ts'
import { formatRelativeTime } from '../utils/radarTime.ts'
import { getWindFreshness } from '../utils/windTime.ts'

interface WindCardProps {
  isRefreshing: boolean
  message: string
  nowMs: number
  onRefresh: () => void
  reading: WindReading | null
  refreshError: string | null
  status: WindStatus
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

export function WindCard({
  isRefreshing,
  message,
  nowMs,
  onRefresh,
  reading,
  refreshError,
  status,
}: WindCardProps) {
  const freshness = getWindFreshness(reading?.modelTimestampMs ?? null, nowMs)

  if (!reading) {
    return (
      <aside className="wind-card" aria-label="Current surface wind">
        <div className="wind-card__header">
          <strong>Wind at map center</strong>
          <button
            type="button"
            aria-label="Refresh wind"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            Refresh
          </button>
        </div>
        <p className={`wind-card__state wind-card__state--${status}`}>
          {status === 'loading' ? 'Loading current wind…' : message}
        </p>
      </aside>
    )
  }

  const fromDirection = degreesToCompass(reading.directionFromDegrees)
  const movementDegrees = windMovementDegrees(reading.directionFromDegrees)
  const towardDirection = degreesToCompass(movementDegrees)
  const modelDate = new Date(reading.modelTimestampMs)
  const checkedDate = new Date(reading.fetchedAtMs)
  const arrowStyle = {
    '--wind-movement-degrees': `${movementDegrees}deg`,
  } as CSSProperties

  return (
    <aside className="wind-card" aria-label="Current surface wind">
      <div className="wind-card__header">
        <strong>{windLocationLabel(reading.source)}</strong>
        <button
          type="button"
          aria-label="Refresh wind"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="wind-card__reading">
        <span
          className="wind-card__arrow"
          style={arrowStyle}
          aria-hidden="true"
        >
          ↑
        </span>
        <div>
          <b>{fromDirection} → {towardDirection}</b>
          <span>{formatWindSpeedMph(reading.speedMph)}</span>
        </div>
      </div>
      {reading.gustMph !== null && (
        <p className="wind-card__gusts">
          Gusts {formatWindSpeedMph(reading.gustMph)}
        </p>
      )}
      <p className={`wind-card__time wind-card__time--${freshness.status}`}>
        <time dateTime={modelDate.toISOString()} title={timeFormatter.format(modelDate)}>
          Updated {formatRelativeTime(modelDate.getTime(), nowMs)}
        </time>
        <span> · Checked {formatRelativeTime(checkedDate.getTime(), nowMs)}</span>
      </p>
      {(refreshError || freshness.status === 'stale') && (
        <p className="wind-card__warning">
          {refreshError ?? `Wind model time is ${freshness.ageMinutes} min old.`}
        </p>
      )}
      <small>10 m surface wind; clouds may move differently aloft.</small>
    </aside>
  )
}
