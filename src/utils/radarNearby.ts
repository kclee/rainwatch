import { pixelOffsetToDirection, pixelOffsetToMiles } from './radarCoordinates.ts'
import { classifyUniversalBluePixel, type RadarIntensity } from './radarIntensity.ts'

export const RADAR_ANALYSIS_ZOOM = 6
export const RADAR_ANALYSIS_SIZE = 512
export const RADAR_SEARCH_RADIUS_MILES = 100
export const RADAR_LOCATION_RADIUS_MILES = 2

export interface RadarNearbyFrameResult {
  atLocation: RadarIntensity | null
  nearestDistanceMiles: number | null
  nearestDirection: string | null
}

export function analyzeRadarPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  latitude: number,
  searchRadiusMiles = RADAR_SEARCH_RADIUS_MILES,
): RadarNearbyFrameResult {
  if (pixels.length !== width * height * 4) {
    throw new Error('Radar image pixel data has an unexpected size.')
  }

  const centerX = (width - 1) / 2
  const centerY = (height - 1) / 2
  let atLocation: RadarIntensity | null = null
  let nearestDistanceMiles = Number.POSITIVE_INFINITY
  let nearestDirection: string | null = null
  const rank: Record<RadarIntensity, number> = { weak: 1, moderate: 2, strong: 3 }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4
      const intensity = classifyUniversalBluePixel(
        pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2], pixels[pixelIndex + 3],
      )
      if (!intensity) continue

      const offsetX = x - centerX
      const offsetY = y - centerY
      const distanceMiles = pixelOffsetToMiles(
        offsetX,
        offsetY,
        latitude,
        RADAR_ANALYSIS_ZOOM,
        width,
      )
      if (distanceMiles <= RADAR_LOCATION_RADIUS_MILES &&
          (!atLocation || rank[intensity] > rank[atLocation])) {
        atLocation = intensity
      }
      if (distanceMiles <= searchRadiusMiles && distanceMiles < nearestDistanceMiles) {
        nearestDistanceMiles = distanceMiles
        nearestDirection = pixelOffsetToDirection(offsetX, offsetY)
      }
    }
  }

  return {
    atLocation,
    nearestDistanceMiles: Number.isFinite(nearestDistanceMiles) ? nearestDistanceMiles : null,
    nearestDirection,
  }
}

export type RadarTrend = 'approaching' | 'moving-away' | 'unclear' | 'unable'

export function classifyRadarTrend(results: Array<RadarNearbyFrameResult | null>): RadarTrend {
  const distances = results
    .map((result) => result?.nearestDistanceMiles ?? null)
    .filter((distance): distance is number => distance !== null)
  if (distances.length < 3) return 'unable'

  const changes = distances.slice(1).map((distance, index) => distance - distances[index])
  const totalChange = distances.at(-1)! - distances[0]
  const consistentApproach = changes.filter((change) => change <= -1).length / changes.length >= 0.75
  const consistentDeparture = changes.filter((change) => change >= 1).length / changes.length >= 0.75
  if (totalChange <= -5 && consistentApproach) return 'approaching'
  if (totalChange >= 5 && consistentDeparture) return 'moving-away'
  return 'unclear'
}
