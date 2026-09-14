import { CLOUD_COVER_STALE_THRESHOLD_MS } from '../config/cloudCover.ts'
import type { CloudCoverFreshnessStatus } from '../types/weather.ts'

export function getCloudCoverFreshness(
  timestampMs: number | null,
  nowMs: number,
): { status: CloudCoverFreshnessStatus; ageMinutes: number | null } {
  if (timestampMs === null) {
    return { status: 'unavailable', ageMinutes: null }
  }

  const ageMs = Math.max(0, nowMs - timestampMs)
  return {
    status: ageMs >= CLOUD_COVER_STALE_THRESHOLD_MS ? 'stale' : 'fresh',
    ageMinutes: Math.round(ageMs / 60_000),
  }
}
