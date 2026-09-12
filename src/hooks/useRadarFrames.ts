import { useCallback, useEffect, useRef, useState } from 'react'
import { RainViewerRadarProvider } from '../services/radar/RainViewerRadarProvider'
import type { RadarFrame, RadarStatus } from '../types/weather'

const radarProvider = new RainViewerRadarProvider()
const REQUEST_TIMEOUT_MS = 10_000

interface RadarState {
  status: RadarStatus
  frames: RadarFrame[]
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
}

const initialState: RadarState = {
  status: 'loading',
  frames: [],
  message: 'Loading recent radar…',
  isRefreshing: true,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
}

export function useRadarFrames() {
  const [state, setState] = useState<RadarState>(initialState)
  const isMountedRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const refreshRadar = useCallback(async () => {
    if (requestControllerRef.current) {
      return
    }

    const controller = new AbortController()
    requestControllerRef.current = controller
    let didTimeOut = false
    const timeout = window.setTimeout(
      () => {
        didTimeOut = true
        controller.abort()
      },
      REQUEST_TIMEOUT_MS,
    )

    setState((currentState) => ({
      ...currentState,
      status: currentState.frames.length > 0 ? currentState.status : 'loading',
      message:
        currentState.frames.length > 0
          ? currentState.message
          : 'Loading recent radar…',
      isRefreshing: true,
      refreshError: null,
    }))

    try {
      const frames = await radarProvider.getHistoricalFrames(controller.signal)
      if (!isMountedRef.current) {
        return
      }

      const refreshedAt = Date.now()
      if (frames.length === 0) {
        setState({
          status: 'empty',
          frames: [],
          message: 'Radar data unavailable. RainViewer returned no recent frames.',
          isRefreshing: false,
          lastSuccessfulRefreshAt: refreshedAt,
          refreshError: null,
        })
        return
      }

      setState({
        status: 'ready',
        frames,
        message: `${frames.length} recent radar frames available.`,
        isRefreshing: false,
        lastSuccessfulRefreshAt: refreshedAt,
        refreshError: null,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return
      }

      const reason = didTimeOut
        ? 'The RainViewer request timed out.'
        : navigator.onLine
          ? error instanceof Error
            ? error.message
            : 'RainViewer could not be reached.'
          : 'The browser is offline.'

      setState((currentState) => {
        if (currentState.frames.length > 0) {
          return {
            ...currentState,
            status: 'ready',
            isRefreshing: false,
            refreshError: `${reason} Showing the last available radar frames.`,
          }
        }

        return {
          ...currentState,
          status: 'error',
          frames: [],
          message: `Radar data unavailable. ${reason} The basemap still works.`,
          isRefreshing: false,
          refreshError: null,
        }
      })
    } finally {
      window.clearTimeout(timeout)
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    const initialRequest = window.setTimeout(() => void refreshRadar(), 0)

    return () => {
      isMountedRef.current = false
      window.clearTimeout(initialRequest)
      const controller = requestControllerRef.current
      requestControllerRef.current = null
      controller?.abort()
    }
  }, [refreshRadar])

  return {
    ...state,
    latestFrame: state.frames.at(-1) ?? null,
    palette: radarProvider.palette,
    refreshRadar,
  }
}
