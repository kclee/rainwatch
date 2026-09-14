import {
  CLOUD_COVER_GRID_LARGE_SCALE,
  CLOUD_COVER_GRID_LOCAL,
  CLOUD_COVER_GRID_OVERSCAN_RATIO,
  CLOUD_COVER_GRID_ZOOM_BREAKPOINT,
  CLOUD_COVER_VIEWPORT_SCALE_RATIO,
  CLOUD_COVER_VIEWPORT_SHIFT_RATIO,
  CLOUD_COVER_ZOOM_DELTA,
} from '../config/cloudCover.ts'
import type {
  CloudCoverCell,
  CloudCoverCoordinate,
  CloudCoverReading,
  CloudCoverViewport,
  UserLocation,
} from '../types/weather.ts'

export interface CloudCoverGridPoint extends CloudCoverCoordinate {
  west: number
  south: number
  east: number
  north: number
}

export interface CloudCoverGrid {
  columns: number
  rows: number
  points: CloudCoverGridPoint[]
  viewport: CloudCoverViewport
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180
}

function unwrappedLongitudeSpan(viewport: CloudCoverViewport) {
  let span = viewport.east - viewport.west
  while (span <= 0) {
    span += 360
  }
  return Math.min(span, 360)
}

function viewportCenter(viewport: CloudCoverViewport) {
  const longitudeSpan = unwrappedLongitudeSpan(viewport)
  return {
    latitude: (viewport.south + viewport.north) / 2,
    longitude: viewport.west + longitudeSpan / 2,
  }
}

export function gridSizeForZoom(zoom: number) {
  return zoom < CLOUD_COVER_GRID_ZOOM_BREAKPOINT
    ? CLOUD_COVER_GRID_LARGE_SCALE
    : CLOUD_COVER_GRID_LOCAL
}

export function buildCloudCoverGrid(
  viewport: CloudCoverViewport,
): CloudCoverGrid {
  const size = gridSizeForZoom(viewport.zoom)
  const longitudeSpan = unwrappedLongitudeSpan(viewport)
  const latitudeSpan = Math.max(0.01, viewport.north - viewport.south)
  const west = viewport.west - longitudeSpan * CLOUD_COVER_GRID_OVERSCAN_RATIO
  const east =
    viewport.west + longitudeSpan * (1 + CLOUD_COVER_GRID_OVERSCAN_RATIO)
  const south = clamp(
    viewport.south - latitudeSpan * CLOUD_COVER_GRID_OVERSCAN_RATIO,
    -89.5,
    89.5,
  )
  const north = clamp(
    viewport.north + latitudeSpan * CLOUD_COVER_GRID_OVERSCAN_RATIO,
    -89.5,
    89.5,
  )
  const cellWidth = (east - west) / size
  const cellHeight = (north - south) / size
  const points: CloudCoverGridPoint[] = []

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const cellWest = west + column * cellWidth
      const cellEast = cellWest + cellWidth
      const cellSouth = south + row * cellHeight
      const cellNorth = cellSouth + cellHeight
      points.push({
        id: `${row}-${column}`,
        latitude: (cellSouth + cellNorth) / 2,
        longitude: normalizeLongitude((cellWest + cellEast) / 2),
        west: cellWest,
        south: cellSouth,
        east: cellEast,
        north: cellNorth,
      })
    }
  }

  return {
    columns: size,
    rows: size,
    points,
    viewport,
  }
}

export function mergeGridReadings(
  grid: CloudCoverGrid,
  readings: CloudCoverReading[],
): CloudCoverCell[] {
  const readingsById = new Map(readings.map((reading) => [reading.id, reading]))
  return grid.points.flatMap((point) => {
    const reading = readingsById.get(point.id)
    return reading
      ? [{ ...reading, west: point.west, south: point.south, east: point.east, north: point.north }]
      : []
  })
}

export function viewportChangedMeaningfully(
  previous: CloudCoverViewport | null,
  next: CloudCoverViewport,
) {
  if (!previous) {
    return true
  }

  const previousLongitudeSpan = unwrappedLongitudeSpan(previous)
  const nextLongitudeSpan = unwrappedLongitudeSpan(next)
  const previousLatitudeSpan = Math.max(0.01, previous.north - previous.south)
  const nextLatitudeSpan = Math.max(0.01, next.north - next.south)
  const previousCenter = viewportCenter(previous)
  const nextCenter = viewportCenter(next)
  const longitudeShift = Math.abs(
    normalizeLongitude(nextCenter.longitude - previousCenter.longitude),
  )
  const latitudeShift = Math.abs(nextCenter.latitude - previousCenter.latitude)

  return (
    Math.abs(next.zoom - previous.zoom) >= CLOUD_COVER_ZOOM_DELTA ||
    gridSizeForZoom(next.zoom) !== gridSizeForZoom(previous.zoom) ||
    longitudeShift >= previousLongitudeSpan * CLOUD_COVER_VIEWPORT_SHIFT_RATIO ||
    latitudeShift >= previousLatitudeSpan * CLOUD_COVER_VIEWPORT_SHIFT_RATIO ||
    Math.abs(nextLongitudeSpan - previousLongitudeSpan) / previousLongitudeSpan >=
      CLOUD_COVER_VIEWPORT_SCALE_RATIO ||
    Math.abs(nextLatitudeSpan - previousLatitudeSpan) / previousLatitudeSpan >=
      CLOUD_COVER_VIEWPORT_SCALE_RATIO
  )
}

export function cloudCoverGridKey(grid: CloudCoverGrid) {
  const first = grid.points[0]
  const last = grid.points.at(-1)
  return [
    grid.columns,
    first?.latitude.toFixed(2),
    first?.longitude.toFixed(2),
    last?.latitude.toFixed(2),
    last?.longitude.toFixed(2),
  ].join(':')
}

function pointIsInViewport(
  point: Pick<CloudCoverCoordinate, 'latitude' | 'longitude'>,
  viewport: CloudCoverViewport,
) {
  const normalizedPoint = normalizeLongitude(point.longitude)
  const normalizedWest = normalizeLongitude(viewport.west)
  const longitudeSpan = unwrappedLongitudeSpan(viewport)
  const offset =
    ((normalizedPoint - normalizedWest) % 360 + 360) % 360
  return (
    point.latitude >= viewport.south &&
    point.latitude <= viewport.north &&
    offset <= longitudeSpan
  )
}

function distanceSquared(
  cell: CloudCoverCell,
  target: Pick<CloudCoverCoordinate, 'latitude' | 'longitude'>,
) {
  const latitudeDelta = cell.latitude - target.latitude
  const longitudeDelta = normalizeLongitude(cell.longitude - target.longitude)
  const longitudeScale = Math.cos((target.latitude * Math.PI) / 180)
  return latitudeDelta ** 2 + (longitudeDelta * longitudeScale) ** 2
}

export function selectCloudCoverSummary(
  cells: CloudCoverCell[],
  viewport: CloudCoverViewport,
  userLocation: UserLocation | null,
) {
  if (cells.length === 0) {
    return null
  }

  const useUserLocation =
    userLocation !== null && pointIsInViewport(userLocation, viewport)
  const target = useUserLocation ? userLocation : viewportCenter(viewport)
  const cell = cells.reduce((nearest, candidate) =>
    distanceSquared(candidate, target) < distanceSquared(nearest, target)
      ? candidate
      : nearest,
  )

  return {
    cell,
    label: useUserLocation ? 'Cloud cover near you' : 'Cloud cover near map center',
  }
}

export function cloudCoverCategory(percent: number) {
  if (percent < 20) return 'Mostly clear'
  if (percent < 50) return 'Partly cloudy'
  if (percent < 80) return 'Mostly cloudy'
  return 'Overcast'
}
