import { useCallback, useEffect, useRef, useState } from 'react'
import { CLOUD_REQUEST_TIMEOUT_MS } from '../config/cloud'
import { NoaaGoesArchiveProvider } from '../services/cloud/NoaaGoesArchiveProvider'
import type { CloudFrame, CloudStatus, CloudViewport } from '../types/weather'

const archiveProvider = new NoaaGoesArchiveProvider()

interface SatelliteHistoryState {
  status: CloudStatus
  frames: CloudFrame[]
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
}

const initialState: SatelliteHistoryState = {
  status: 'idle',
  frames: [],
  message: 'Satellite history has not been requested.',
  isRefreshing: false,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
}

export function useSatelliteHistory(enabled: boolean) {
  const [state, setState] = useState<SatelliteHistoryState>(initialState)
  const isMountedRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const refreshHistory = useCallback(async () => {
    if (requestControllerRef.current) return

    const controller = new AbortController()
    requestControllerRef.current = controller
    let didTimeOut = false
    const timeout = window.setTimeout(() => {
      didTimeOut = true
      controller.abort()
    }, CLOUD_REQUEST_TIMEOUT_MS)

    setState((current) => ({
      ...current,
      status: current.frames.length ? 'ready' : 'loading',
      message: current.frames.length
        ? current.message
        : 'Loading recent satellite history…',
      isRefreshing: true,
      refreshError: null,
    }))

    try {
      const frames = await archiveProvider.getRecentFrames(controller.signal)
      if (!isMountedRef.current) return
      const refreshedAt = Date.now()
      if (!frames.length) {
        setState({
          status: 'empty',
          frames: [],
          message: 'Satellite history unavailable. NOAA returned no recent frames.',
          isRefreshing: false,
          lastSuccessfulRefreshAt: refreshedAt,
          refreshError: null,
        })
        return
      }

      setState({
        status: 'ready',
        frames,
        message: `${frames.length} recent NOAA satellite frames available.`,
        isRefreshing: false,
        lastSuccessfulRefreshAt: refreshedAt,
        refreshError: null,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current) return
      const reason = didTimeOut
        ? 'The NOAA satellite archive request timed out.'
        : navigator.onLine
          ? error instanceof Error
            ? error.message
            : 'NOAA satellite history could not be reached.'
          : 'The browser is offline.'

      setState((current) =>
        current.frames.length
          ? {
              ...current,
              status: 'ready',
              isRefreshing: false,
              refreshError: `${reason} Showing the last available history.`,
            }
          : {
              ...current,
              status: 'error',
              frames: [],
              message: `Satellite history unavailable. ${reason}`,
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
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || state.status !== 'idle') return
    const initialRequest = window.setTimeout(() => void refreshHistory(), 0)
    return () => window.clearTimeout(initialRequest)
  }, [enabled, refreshHistory, state.status])

  const buildImageRequest = useCallback(
    (frame: CloudFrame, viewport: CloudViewport) =>
      archiveProvider.buildImageRequest(frame, viewport),
    [],
  )

  return {
    ...state,
    providerName: archiveProvider.name,
    buildImageRequest,
    refreshHistory,
  }
}
