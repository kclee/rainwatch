import { WIND_LOCATION_CHANGE_THRESHOLD_KM } from '../config/wind.ts'
import type {
  CloudCoverViewport,
  UserLocation,
  WindLocationSource,
  WindTarget,
} from '../types/weather.ts'
import {
  pointIsInViewport,
  viewportCenter,
} from './cloudCoverGrid.ts'

const COMPASS_DIRECTIONS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

export function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360
}

export function degreesToCompass(degrees: number) {
  const normalized = normalizeDegrees(degrees)
  const index = Math.round(normalized / 22.5) % COMPASS_DIRECTIONS.length
  return COMPASS_DIRECTIONS[index]
}

export function windMovementDegrees(fromDegrees: number) {
  return normalizeDegrees(fromDegrees + 180)
}

export function formatWindSpeedMph(speedMph: number) {
  return `${Math.round(Math.max(0, speedMph))} mph`
}

export function selectWindTarget(
  viewport: CloudCoverViewport,
  userLocation: UserLocation | null,
): WindTarget {
  if (userLocation && pointIsInViewport(userLocation, viewport)) {
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      source: 'user',
    }
  }

  const center = viewportCenter(viewport)
  return { ...center, source: 'map-center' }
}

function distanceKilometers(first: WindTarget, second: WindTarget) {
  const latitudeDeltaRadians =
    ((second.latitude - first.latitude) * Math.PI) / 180
  const longitudeDeltaRadians =
    ((second.longitude - first.longitude) * Math.PI) / 180
  const firstLatitudeRadians = (first.latitude * Math.PI) / 180
  const secondLatitudeRadians = (second.latitude * Math.PI) / 180
  const haversine =
    Math.sin(latitudeDeltaRadians / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDeltaRadians / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function windTargetChangedMeaningfully(
  previous: WindTarget | null,
  next: WindTarget,
) {
  return (
    previous === null ||
    previous.source !== next.source ||
    distanceKilometers(previous, next) >= WIND_LOCATION_CHANGE_THRESHOLD_KM
  )
}

export function windTargetCacheKey(target: WindTarget) {
  return `${target.source}:${target.latitude.toFixed(2)}:${target.longitude.toFixed(2)}`
}

export function windLocationLabel(source: WindLocationSource) {
  return source === 'user' ? 'Wind near you' : 'Wind at map center'
}

