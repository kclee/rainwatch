export const DEFAULT_RADAR_OPACITY = 0.7
export const RADAR_PLAYBACK_INTERVAL_MS = 800
export const RADAR_CLOCK_UPDATE_INTERVAL_MS = 30_000

// RainViewer currently publishes historical frames about every ten minutes.
// Three missed intervals is delayed enough to warn without flagging normal lag.
export const RADAR_STALE_THRESHOLD_MINUTES = 30
export const RADAR_STALE_THRESHOLD_MS =
  RADAR_STALE_THRESHOLD_MINUTES * 60 * 1000
