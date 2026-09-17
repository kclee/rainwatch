import { useCallback, useEffect, useRef, useState } from 'react'
import {
  WIND_CACHE_TTL_MS,
  WIND_REQUEST_TIMEOUT_MS,
} from '../config/wind.ts'
import { OpenMeteoWindProvider } from '../services/wind/OpenMeteoWindProvider.ts'
import type {
  WindReading,
  WindStatus,
  WindTarget,
} from '../types/weather.ts'
import {
  windTargetCacheKey,
  windTargetChangedMeaningfully,
} from '../utils/wind.ts'

const windProvider = new OpenMeteoWindProvider()

interface WindState {
  status: WindStatus
  reading: WindReading | null
  message: string
  isRefreshing: boolean
  refreshError: string | null
}

const initialState: WindState = {
  status: 'idle',
  reading: null,
  message: 'Wind has not been requested.',
  isRefreshing: false,
  refreshError: null,
}

export function useWind(target: WindTarget | null) {
  const [state, setState] = useState<WindState>(initialState)
  const isMountedRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const lastTargetRef = useRef<WindTarget | null>(null)
  const cacheRef = useRef(new Map<string, WindReading>())

  const loadWind = useCallback(async (nextTarget: WindTarget, force = false) => {
    if (
      !force &&
      !windTargetChangedMeaningfully(lastTargetRef.current, nextTarget)
    ) {
      return
    }

    lastTargetRef.current = nextTarget
    const cacheKey = windTargetCacheKey(nextTarget)
    const cached = cacheRef.current.get(cacheKey)
    const now = Date.now()
    if (!force && cached && now - cached.fetchedAtMs < WIND_CACHE_TTL_MS) {
      setState({
        status: 'ready',
        reading: cached,
        message: 'Current wind available from short-term memory.',
        isRefreshing: false,
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
    }, WIND_REQUEST_TIMEOUT_MS)

    setState((current) => ({
      ...current,
      status: current.reading ? 'ready' : 'loading',
      message: current.reading ? current.message : 'Loading current wind…',
      isRefreshing: true,
      refreshError: null,
    }))

    try {
      const reading = await windProvider.getCurrentWind(
        nextTarget,
        controller.signal,
      )
      if (!isMountedRef.current || controller.signal.aborted) return

      cacheRef.current.set(cacheKey, reading)
      if (cacheRef.current.size > 8) {
        const oldestKey = cacheRef.current.keys().next().value
        if (typeof oldestKey === 'string') cacheRef.current.delete(oldestKey)
      }

      setState({
        status: 'ready',
        reading,
        message: 'Current 10 m surface wind available.',
        isRefreshing: false,
        refreshError: null,
      })
    } catch (error: unknown) {
      if (!isMountedRef.current || (controller.signal.aborted && !didTimeOut)) {
        return
      }

      const reason = didTimeOut
        ? 'The Open-Meteo wind request timed out.'
        : navigator.onLine
          ? error instanceof Error
            ? error.message
            : 'Open-Meteo wind could not be reached.'
          : 'The browser is offline.'

      setState((current) =>
        current.reading
          ? {
              ...current,
              status: 'ready',
              isRefreshing: false,
              refreshError: `${reason} Showing the last available wind value.`,
            }
          : {
              status: 'error',
              reading: null,
              message: `Wind unavailable. ${reason}`,
              isRefreshing: false,
              refreshError: null,
            },
      )
    } finally {
      window.clearTimeout(timeout)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  const refreshWind = useCallback(() => {
    const activeTarget = lastTargetRef.current ?? target
    return activeTarget ? loadWind(activeTarget, true) : Promise.resolve()
  }, [loadWind, target])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (target) void loadWind(target)
  }, [loadWind, target])

  return {
    ...state,
    providerName: windProvider.name,
    refreshWind,
  }
}

