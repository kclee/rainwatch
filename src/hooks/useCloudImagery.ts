import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOUD_REQUEST_TIMEOUT_MS } from '../config/cloud'
import { NoaaGoesCloudProvider } from '../services/cloud/NoaaGoesCloudProvider'
import type { CloudFrame, CloudStatus, CloudViewport } from '../types/weather'

const cloudProvider = new NoaaGoesCloudProvider()

interface CloudState {
  status: CloudStatus
  frame: CloudFrame | null
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
}

const initialState: CloudState = {
  status: 'idle',
  frame: null,
  message: 'Satellite imagery has not been requested.',
  isRefreshing: false,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
}

export function useCloudImagery(enabled: boolean) {
  const [state, setState] = useState<CloudState>(initialState)
  const isMountedRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const refreshCloud = useCallback(async () => {
    if (requestControllerRef.current) {
      return
    }

    const controller = new AbortController()
    requestControllerRef.current = controller
    let didTimeOut = false
    const timeout = window.setTimeout(() => {
      didTimeOut = true
      controller.abort()
    }, CLOUD_REQUEST_TIMEOUT_MS)

    setState((current) => ({
      ...current,
      status: current.frame ? 'ready' : 'loading',
      message: current.frame ? current.message : 'Loading latest satellite…',
      isRefreshing: true,
      refreshError: null,
    }))

    try {
      const frame = await cloudProvider.getLatestFrame(controller.signal)
      if (!isMountedRef.current) {
        return
      }

      const refreshedAt = Date.now()
      if (!frame) {
        setState({
          status: 'empty',
          frame: null,
          message: 'Satellite imagery unavailable. NOAA returned no latest image.',
          isRefreshing: false,
          lastSuccessfulRefreshAt: refreshedAt,
          refreshError: null,
        })
        return
      }

      setState({
        status: 'ready',
        frame,
        message: 'Latest NOAA GOES GeoColor imagery available.',
        isRefreshing: false,
        lastSuccessfulRefreshAt: refreshedAt,
        refreshError: null,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return
      }

      const reason = didTimeOut
        ? 'The NOAA satellite request timed out.'
        : navigator.onLine
          ? error instanceof Error
            ? error.message
            : 'NOAA satellite imagery could not be reached.'
          : 'The browser is offline.'

      setState((current) =>
        current.frame
          ? {
              ...current,
              status: 'ready',
              isRefreshing: false,
              refreshError: `${reason} Showing the last available satellite image.`,
            }
          : {
              ...current,
              status: 'error',
              frame: null,
              message: `Satellite imagery unavailable. ${reason}`,
              isRefreshing: false,
              refreshError: null,
            },
      )
    } finally {
      window.clearTimeout(timeout)
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
    if (!enabled || state.status !== 'idle') {
      return
    }

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
