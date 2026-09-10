import { useCallback, useState } from 'react'
import type { GeolocationStatus, UserLocation } from '../types/weather'

interface GeolocationState {
  status: GeolocationStatus
  location: UserLocation | null
  message: string | null
}

const initialState: GeolocationState = {
  status: 'idle',
  location: null,
  message: null,
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(initialState)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: 'unavailable',
        location: null,
        message:
          'Location is not available in this browser. You can still explore the map.',
      })
      return
    }

    setState((current) => ({
      ...current,
      status: 'requesting',
      message: 'Waiting for your browser to provide a location…',
    }))

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({
          status: 'success',
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: coords.accuracy,
          },
          message: `Location found, accurate to about ${Math.round(coords.accuracy)} meters.`,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState({
            status: 'denied',
            location: null,
            message:
              'Location permission was denied. You can still explore the map normally.',
          })
          return
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setState({
            status: 'unavailable',
            location: null,
            message:
              'Your location could not be determined. You can still explore the map.',
          })
          return
        }

        setState({
          status: 'error',
          location: null,
          message:
            error.code === error.TIMEOUT
              ? 'The location request timed out. You can try again.'
              : 'Something went wrong while requesting your location.',
        })
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    )
  }, [])

  return { ...state, requestLocation }
}
