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

export type MapMode =
  | 'radar'
  | 'satellite'
  | 'cloud-cover'
  | 'smooth-cloud'
  | 'both'

export type SmoothCloudStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unsupported'
  | 'error'

export interface SmoothCloudState {
  status: SmoothCloudStatus
  message: string | null
  validTimeMs: number | null
  loadedAtMs: number | null
}

export type CloudStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export type CloudFreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export interface CloudFrame {
  id: string
  objectId: number
  name: string
  timestampMs: number | null
  source: 'latest' | 'archive'
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
  requestUrlLength: number
  responseBytes: number
  responseDurationMs: number
  processingDurationMs: number
  viewport: CloudCoverViewport
}

export type WindLocationSource = 'user' | 'map-center'

export interface WindTarget {
  latitude: number
  longitude: number
  source: WindLocationSource
}

export interface WindReading extends WindTarget {
  speedMph: number
  directionFromDegrees: number
  gustMph: number | null
  modelTimestampMs: number
  intervalSeconds: number
  fetchedAtMs: number
  providerName: string
  modelName: string
}

export type WindStatus = 'idle' | 'loading' | 'ready' | 'error'
export type WindFreshnessStatus = 'fresh' | 'stale' | 'unavailable'
