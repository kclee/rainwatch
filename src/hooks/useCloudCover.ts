import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CLOUD_COVER_CACHE_TTL_MS,
  CLOUD_COVER_REQUEST_TIMEOUT_MS,
} from '../config/cloudCover.ts'
import { OpenMeteoCloudCoverProvider } from '../services/cloudCover/OpenMeteoCloudCoverProvider.ts'
import type {
  CloudCoverDataset,
  CloudCoverStatus,
  CloudCoverViewport,
} from '../types/weather.ts'
import {
  buildCloudCoverGrid,
  cloudCoverGridKey,
  mergeGridReadings,
  viewportChangedMeaningfully,
} from '../utils/cloudCoverGrid.ts'

const cloudCoverProvider = new OpenMeteoCloudCoverProvider()

interface CloudCoverState {
  status: CloudCoverStatus
  dataset: CloudCoverDataset | null
  message: string
  isRefreshing: boolean
  lastSuccessfulRefreshAt: number | null
  refreshError: string | null
}

const initialState: CloudCoverState = {
  status: 'idle',
  dataset: null,
  message: 'Cloud Cover has not been requested.',
  isRefreshing: false,
  lastSuccessfulRefreshAt: null,
  refreshError: null,
}

export function useCloudCover(enabled: boolean) {
  const [state, setState] = useState<CloudCoverState>(initialState)
  const isMountedRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const lastViewportRef = useRef<CloudCoverViewport | null>(null)
  const cacheRef = useRef(new Map<string, CloudCoverDataset>())

  const loadViewport = useCallback(
    async (viewport: CloudCoverViewport, force = false) => {
      if (!enabled) {
        return
      }

      if (
        !force &&
        !viewportChangedMeaningfully(lastViewportRef.current, viewport)
      ) {
        return
      }

      lastViewportRef.current = viewport
      const grid = buildCloudCoverGrid(viewport)
      const cacheKey = cloudCoverGridKey(grid)
      const cached = cacheRef.current.get(cacheKey)
      const now = Date.now()
      if (!force && cached && now - cached.fetchedAtMs < CLOUD_COVER_CACHE_TTL_MS) {
        setState({
          status: 'ready',
          dataset: cached,
          message: 'Current Cloud Cover available from short-term memory.',
          isRefreshing: false,
          lastSuccessfulRefreshAt: cached.fetchedAtMs,
          refreshError: null,
        })
        return
      }

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      let didTimeOut = false
      const timeout = window.setTimeout(() => {
        didTimeOut = true
        controller.abort()
      }, CLOUD_COVER_REQUEST_TIMEOUT_MS)

      setState((current) => ({
        ...current,
        status: current.dataset ? 'ready' : 'loading',
        message: current.dataset
          ? current.message
          : 'Loading model-derived Cloud Cover…',
        isRefreshing: true,
        refreshError: null,
      }))

      try {
        const result = await cloudCoverProvider.getCurrentCloudCover(
          grid.points.map(({ id, latitude, longitude }) => ({
            id,
            latitude,
            longitude,
          })),
          controller.signal,
        )
        if (!isMountedRef.current || controller.signal.aborted) {
          return
        }

        const cells = mergeGridReadings(grid, result.readings)
        const fetchedAtMs = Date.now()
        if (cells.length === 0) {
          setState({
            status: 'empty',
            dataset: null,
            message: 'Cloud Cover unavailable. Open-Meteo returned no usable values.',
            isRefreshing: false,
            lastSuccessfulRefreshAt: fetchedAtMs,
            refreshError: null,
          })
          return
        }

        const dataset: CloudCoverDataset = {
          cells,
          modelTimestampMs: Math.max(
            ...cells.map((cell) => cell.modelTimestampMs),
          ),
          intervalSeconds: Math.max(
            ...cells.map((cell) => cell.intervalSeconds),
          ),
          fetchedAtMs,
          providerName: cloudCoverProvider.name,
          modelName: cloudCoverProvider.modelName,
          gridColumns: grid.columns,
          gridRows: grid.rows,
          requestCount: result.requestCount,
          responseBytes: result.responseBytes,
          viewport,
        }
        cacheRef.current.set(cacheKey, dataset)
        if (cacheRef.current.size > 6) {
          const oldestKey = cacheRef.current.keys().next().value
          if (typeof oldestKey === 'string') {
            cacheRef.current.delete(oldestKey)
          }
        }

        setState({
          status: 'ready',
          dataset,
          message: `${cells.length} model-derived Cloud Cover values available.`,
          isRefreshing: false,
          lastSuccessfulRefreshAt: fetchedAtMs,
          refreshError: null,
        })
      } catch (error: unknown) {
        if (!isMountedRef.current || (controller.signal.aborted && !didTimeOut)) {
          return
        }

        const reason = didTimeOut
          ? 'The Open-Meteo Cloud Cover request timed out.'
          : navigator.onLine
            ? error instanceof Error
              ? error.message
              : 'Open-Meteo Cloud Cover could not be reached.'
            : 'The browser is offline.'

        setState((current) =>
          current.dataset
            ? {
                ...current,
                status: 'ready',
                isRefreshing: false,
                refreshError: `${reason} Showing the last available Cloud Cover grid.`,
              }
            : {
                ...current,
                status: 'error',
                dataset: null,
                message: `Cloud Cover unavailable. ${reason}`,
                isRefreshing: false,
                refreshError: null,
              },
        )
      } finally {
        window.clearTimeout(timeout)
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [enabled],
  )

  const refreshCloudCover = useCallback(() => {
    const viewport = lastViewportRef.current
    return viewport ? loadViewport(viewport, true) : Promise.resolve()
  }, [loadViewport])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort()
      controllerRef.current = null
      lastViewportRef.current = null
    }
  }, [enabled])

  return {
    ...state,
    providerName: cloudCoverProvider.name,
    loadViewport,
    refreshCloudCover,
  }
}
