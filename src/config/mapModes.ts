import type { MapMode } from '../types/weather.ts'

export const MAP_MODE_STORAGE_KEY = 'rainwatch-map-mode'
export const PAUSED_MAP_MODES = new Set<MapMode>([
  'cloud-cover',
  'smooth-cloud',
])

const mapModes = new Set<MapMode>([
  'radar',
  'satellite',
  'cloud-cover',
  'smooth-cloud',
  'both',
])

export function isMapModeEnabled(mode: MapMode) {
  return !PAUSED_MAP_MODES.has(mode)
}

export function normalizeMapMode(value: unknown): MapMode {
  return typeof value === 'string' && mapModes.has(value as MapMode) &&
      isMapModeEnabled(value as MapMode)
    ? (value as MapMode)
    : 'radar'
}
