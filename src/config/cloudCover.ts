export const DEFAULT_CLOUD_COVER_OPACITY = 0.65
export const CLOUD_COVER_REQUEST_TIMEOUT_MS = 12_000
export const CLOUD_COVER_CACHE_TTL_MS = 10 * 60 * 1000
export const CLOUD_COVER_STALE_THRESHOLD_MINUTES = 45
export const CLOUD_COVER_STALE_THRESHOLD_MS =
  CLOUD_COVER_STALE_THRESHOLD_MINUTES * 60 * 1000

export const CLOUD_COVER_GRID_LARGE_SCALE = 5
export const CLOUD_COVER_GRID_LOCAL = 7
export const CLOUD_COVER_GRID_ZOOM_BREAKPOINT = 5
export const CLOUD_COVER_GRID_OVERSCAN_RATIO = 0.12
export const CLOUD_COVER_VIEWPORT_SHIFT_RATIO = 0.18
export const CLOUD_COVER_VIEWPORT_SCALE_RATIO = 0.25
export const CLOUD_COVER_ZOOM_DELTA = 0.75

export const CLOUD_COVER_EXPERIMENT_GRID_SIZES = [7, 11, 15, 21] as const

export function parseCloudCoverGridSize(search: string) {
  const value = Number(new URLSearchParams(search).get('cloudGrid'))
  return CLOUD_COVER_EXPERIMENT_GRID_SIZES.find((size) => size === value) ?? null
}
