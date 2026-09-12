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
