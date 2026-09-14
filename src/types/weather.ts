export interface UserLocation {
  latitude: number
  longitude: number
  accuracyMeters: number
}

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'denied'
  | 'unavailable'
  | 'error'

export interface RadarFrame {
  id: string
  timestampSeconds: number
  tileUrl: string
  attribution: string
}

export type RadarStatus = 'loading' | 'ready' | 'empty' | 'error'

export type RadarFreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export interface RadarLegendItem {
  label: string
  color: string
}

export interface RadarPalette {
  name: string
  items: readonly RadarLegendItem[]
  note: string
}

export type MapMode = 'radar' | 'satellite' | 'cloud-cover' | 'both'

export type CloudStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export type CloudFreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export interface CloudFrame {
  id: string
  objectId: number
  name: string
  timestampMs: number | null
  attributionLabel: string
  attributionUrl: string
}

export interface CloudViewport {
  west: number
  south: number
  east: number
  north: number
  width: number
  height: number
  pixelRatio: number
}

export interface CloudImageRequest {
  url: string
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
}

export type CloudCoverStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export type CloudCoverFreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export interface CloudCoverCoordinate {
  id: string
  latitude: number
  longitude: number
}

export interface CloudCoverReading extends CloudCoverCoordinate {
  cloudCoverPercent: number
  modelTimestampMs: number
  intervalSeconds: number
}

export interface CloudCoverCell extends CloudCoverReading {
  west: number
  south: number
  east: number
  north: number
}

export interface CloudCoverViewport {
  west: number
  south: number
  east: number
  north: number
  zoom: number
}

export interface CloudCoverDataset {
  cells: CloudCoverCell[]
  modelTimestampMs: number
  intervalSeconds: number
  fetchedAtMs: number
  providerName: string
  modelName: string
  gridColumns: number
  gridRows: number
  requestCount: number
  responseBytes: number
  viewport: CloudCoverViewport
}
