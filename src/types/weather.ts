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
