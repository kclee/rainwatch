import { useCallback, useEffect, useRef, useState } from 'react'
import { NoaaGoesArchiveProvider } from '../services/cloud/NoaaGoesArchiveProvider'
import {
  satelliteFailureMessage,
  withSatelliteRetry,
} from '../services/cloud/satelliteRequest'
import type { CloudFrame, CloudStatus, CloudViewport } from '../types/weather'

const archiveProvider = new NoaaGoesArchiveProvider()

interface SatelliteHistoryState {
  status: CloudStatus
  frames: CloudFrame[]
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
  isLastAvailable: boolean
}

const initialState: SatelliteHistoryState = {
  status: 'idle',
  frames: [],
  message: 'Satellite history has not been requested.',
  isRefreshing: false,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
  isLastAvailable: false,
}

export function useSatelliteHistory(enabled: boolean) {
  const [state, setState] = useState<SatelliteHistoryState>(initialState)
  const isMountedRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const refreshHistory = useCallback(async () => {
    if (requestControllerRef.current) return

    const controller = new AbortController()
    requestControllerRef.current = controller
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
      const frames = await withSatelliteRetry(
        (signal) => archiveProvider.getRecentFrames(signal),
        {
          signal: controller.signal,
          onRetry: (failure, nextAttempt) =>
            console.warn(
              `Retrying Satellite history metadata (attempt ${nextAttempt}; ${failure.category}).`,
              failure,
            ),
        },
      )
      if (!isMountedRef.current) return
      const refreshedAt = Date.now()
      if (!frames.length) {
        setState((current) =>
          current.frames.length
            ? {
                ...current,
                status: 'ready',
                isRefreshing: false,
                refreshError: 'NOAA has no recent Satellite history. Showing Last available.',
                isLastAvailable: true,
              }
            : {
                status: 'empty',
                frames: [],
                message: 'Satellite history unavailable. NOAA returned no recent frames.',
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
        frames,
        message: `${frames.length} recent NOAA satellite frames available.`,
        isRefreshing: false,
        lastSuccessfulRefreshAt: refreshedAt,
        refreshError: null,
        isLastAvailable: false,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.warn('Satellite history metadata failed after retries.', error)
      const reason = navigator.onLine
        ? satelliteFailureMessage(error)
        : 'Browser is offline.'
      setState((current) =>
        current.frames.length
          ? {
              ...current,
              status: 'ready',
              isRefreshing: false,
              refreshError: `${reason} Showing Last available history.`,
              isLastAvailable: true,
            }
          : {
              ...current,
              status: 'error',
              frames: [],
              message: `Satellite history unavailable. ${reason}`,
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
