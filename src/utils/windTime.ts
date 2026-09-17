import { WIND_STALE_THRESHOLD_MS } from '../config/wind.ts'
import type { WindFreshnessStatus } from '../types/weather.ts'

export function getWindFreshness(
  timestampMs: number | null,
  nowMs: number,
): { status: WindFreshnessStatus; ageMinutes: number | null } {
  if (timestampMs === null) {
    return { status: 'unavailable', ageMinutes: null }
  }

  const ageMs = Math.max(0, nowMs - timestampMs)
  return {
    status: ageMs >= WIND_STALE_THRESHOLD_MS ? 'stale' : 'fresh',
    ageMinutes: Math.round(ageMs / 60_000),
  }
}

