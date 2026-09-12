import { RADAR_STALE_THRESHOLD_MS } from '../config/radar.ts'
import type { RadarFreshnessStatus } from '../types/weather.ts'

const MINUTE_MS = 60 * 1000
const HOUR_MINUTES = 60

function ageInMinutes(timestampMs: number, nowMs: number) {
  return Math.max(0, Math.round((nowMs - timestampMs) / MINUTE_MS))
}

export function formatRelativeTime(timestampMs: number, nowMs: number) {
  const minutes = ageInMinutes(timestampMs, nowMs)

  if (minutes === 0) {
    return 'just now'
  }

  if (minutes < HOUR_MINUTES) {
    return `${minutes} min ago`
  }

  const hours = Math.round(minutes / HOUR_MINUTES)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}

export function formatMetadataRefreshTime(
  timestampMs: number | null,
  nowMs: number,
) {
  return timestampMs === null
    ? 'Not updated yet'
    : `Updated ${formatRelativeTime(timestampMs, nowMs)}`
}

export interface RadarFreshness {
  status: RadarFreshnessStatus
  ageMinutes: number | null
}

export function getRadarFreshness(
  latestFrameTimestampSeconds: number | null,
  nowMs: number,
): RadarFreshness {
  if (latestFrameTimestampSeconds === null) {
    return { status: 'unavailable', ageMinutes: null }
  }

  const timestampMs = latestFrameTimestampSeconds * 1000
  return {
    status:
      nowMs - timestampMs >= RADAR_STALE_THRESHOLD_MS ? 'stale' : 'fresh',
    ageMinutes: ageInMinutes(timestampMs, nowMs),
  }
}
