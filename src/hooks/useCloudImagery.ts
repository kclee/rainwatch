import { useCallback, useEffect, useRef, useState } from 'react'
import { NoaaGoesCloudProvider } from '../services/cloud/NoaaGoesCloudProvider'
import {
  satelliteFailureMessage,
  withSatelliteRetry,
} from '../services/cloud/satelliteRequest'
import type { CloudFrame, CloudStatus, CloudViewport } from '../types/weather'

const cloudProvider = new NoaaGoesCloudProvider()

interface CloudState {
  status: CloudStatus
  frame: CloudFrame | null
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
  isLastAvailable: boolean
}

const initialState: CloudState = {
  status: 'idle',
  frame: null,
  message: 'Satellite imagery has not been requested.',
  isRefreshing: false,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
  isLastAvailable: false,
}

export function useCloudImagery(enabled: boolean) {
  const [state, setState] = useState<CloudState>(initialState)
  const isMountedRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const refreshCloud = useCallback(async () => {
    if (requestControllerRef.current) return

    const controller = new AbortController()
    requestControllerRef.current = controller
    setState((current) => ({
      ...current,
      status: current.frame ? 'ready' : 'loading',
      message: current.frame ? current.message : 'Loading latest satellite…',
      isRefreshing: true,
      refreshError: null,
    }))

    try {
      const frame = await withSatelliteRetry(
        (signal) => cloudProvider.getLatestFrame(signal),
        {
          signal: controller.signal,
          onRetry: (failure, nextAttempt) =>
            console.warn(
              `Retrying latest Satellite metadata (attempt ${nextAttempt}; ${failure.category}).`,
              failure,
            ),
        },
      )
      if (!isMountedRef.current) return

      const refreshedAt = Date.now()
      if (!frame) {
        setState((current) =>
          current.frame
            ? {
                ...current,
                status: 'ready',
                isRefreshing: false,
                refreshError: 'NOAA has no current Satellite image. Showing Last available.',
                isLastAvailable: true,
              }
            : {
                status: 'empty',
                frame: null,
                message: 'Satellite unavailable. NOAA returned no current image.',
                isRefreshing: false,
                lastSuccessfulRefreshAt: refreshedAt,
                refreshError: null,
                isLastAvailable: false,
              },
        )
        return
      }

      setState({
        status: 'ready',
        frame,
        message: 'Latest NOAA GOES GeoColor imagery available.',
        isRefreshing: false,
        lastSuccessfulRefreshAt: refreshedAt,
        refreshError: null,
        isLastAvailable: false,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.warn('Latest Satellite metadata failed after retries.', error)
      const reason = navigator.onLine
        ? satelliteFailureMessage(error)
        : 'Browser is offline.'
      setState((current) =>
        current.frame
          ? {
              ...current,
              status: 'ready',
              isRefreshing: false,
              refreshError: `${reason} Showing Last available.`,
              isLastAvailable: true,
            }
          : {
              ...current,
              status: 'error',
              frame: null,
              message: `Satellite unavailable. ${reason}`,
              isRefreshing: false,
              refreshError: null,
              isLastAvailable: false,
            },
      )
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      const controller = requestControllerRef.current
      requestControllerRef.current = null
      controller?.abort()
    }
  }, [])

  useEffect(() => {
    if (!enabled || state.status !== 'idle') return
    const initialRequest = window.setTimeout(() => void refreshCloud(), 0)
    return () => window.clearTimeout(initialRequest)
  }, [enabled, refreshCloud, state.status])

  const buildImageRequest = useCallback(
    (frame: CloudFrame, viewport: CloudViewport) =>
      cloudProvider.buildImageRequest(frame, viewport),
    [],
  )

  return {
    ...state,
    providerName: cloudProvider.name,
    buildImageRequest,
    refreshCloud,
  }
}
