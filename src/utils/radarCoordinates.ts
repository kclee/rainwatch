const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686
const METERS_PER_MILE = 1_609.344

export interface RadarPixelCoordinate {
  tileX: number
  tileY: number
  pixelX: number
  pixelY: number
}

export function latLonToRadarPixel(
  latitude: number,
  longitude: number,
  zoom: number,
  tileSize = 256,
): RadarPixelCoordinate {
  const constrainedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude))
  const normalizedLongitude = ((longitude + 180) % 360 + 360) % 360
  const scale = 2 ** zoom
  const worldX = (normalizedLongitude / 360) * scale
  const latitudeRadians = constrainedLatitude * Math.PI / 180
  const worldY = (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale
  const tileX = Math.floor(worldX)
  const tileY = Math.floor(worldY)

  return {
    tileX,
    tileY,
    pixelX: (worldX - tileX) * tileSize,
    pixelY: (worldY - tileY) * tileSize,
  }
}

export function milesPerAnalysisPixel(latitude: number, zoom: number, imageSize: number) {
  const latitudeRadians = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180
  return EARTH_CIRCUMFERENCE_METERS * Math.cos(latitudeRadians) /
    (2 ** zoom * imageSize * METERS_PER_MILE)
}

export function pixelOffsetToMiles(
  offsetX: number,
  offsetY: number,
  latitude: number,
  zoom: number,
  imageSize: number,
) {
  return Math.hypot(offsetX, offsetY) * milesPerAnalysisPixel(latitude, zoom, imageSize)
}

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function pixelOffsetToDirection(offsetX: number, offsetY: number) {
  const bearing = (Math.atan2(offsetX, -offsetY) * 180 / Math.PI + 360) % 360
  return COMPASS_DIRECTIONS[Math.round(bearing / 45) % 8]
}
