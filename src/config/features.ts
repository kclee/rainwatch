import type { MapMode } from '../types/weather'

export const features = {
  satellite: false,
  cloudCover: false,
  smoothCloud: false,
  radarSatellite: false,
  wind: false,
} as const

export function isMapModeVisible(mode: MapMode) {
  switch (mode) {
    case 'radar':
      return true
    case 'satellite':
      return features.satellite
    case 'cloud-cover':
      return features.cloudCover
    case 'smooth-cloud':
      return features.smoothCloud
    case 'both':
      return features.radarSatellite
  }
}
