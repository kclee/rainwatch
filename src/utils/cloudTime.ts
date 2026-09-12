import { CLOUD_STALE_THRESHOLD_MS } from '../config/cloud.ts'
import type { CloudFreshnessStatus } from '../types/weather.ts'

export interface CloudFreshness {
  status: CloudFreshnessStatus
  ageMinutes: number | null
}

export function getCloudFreshness(
  timestampMs: number | null,
  nowMs: number,
): CloudFreshness {
  if (timestampMs === null) {
    return { status: 'unavailable', ageMinutes: null }
  }

  const ageMs = Math.max(0, nowMs - timestampMs)
  return {
    status: ageMs >= CLOUD_STALE_THRESHOLD_MS ? 'stale' : 'fresh',
    ageMinutes: Math.round(ageMs / 60_000),
  }
}
