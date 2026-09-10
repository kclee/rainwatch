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
