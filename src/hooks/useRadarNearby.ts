import { useEffect, useMemo, useState } from 'react'
import { analyzeRainViewerNearby, type RadarAnalysisTarget, type RadarNearbyAnalysis } from '../services/radarAnalysis/RainViewerRadarAnalysis'
import type { RadarFrame } from '../types/weather'

export type RadarNearbyState =
  | { status: 'idle' | 'loading'; analysis: null; message: null }
  | { status: 'ready'; analysis: RadarNearbyAnalysis; message: null }
  | { status: 'error'; analysis: null; message: string }

const TIMEOUT_MS = 12_000

export function useRadarNearby(
  frames: RadarFrame[],
  target: RadarAnalysisTarget | null,
  refreshKey: number | null,
) {
  const [state, setState] = useState<RadarNearbyState>({
    status: 'idle',
    analysis: null,
    message: null,
  })
  const targetKey = useMemo(
    () => target
      ? `${target.source}:${(Math.round(target.latitude * 50) / 50).toFixed(2)}:${(Math.round(target.longitude * 50) / 50).toFixed(2)}`
      : null,
    [target],
  )
  const analysisTarget = useMemo<RadarAnalysisTarget | null>(() => {
    if (!targetKey) return null
    const [source, latitude, longitude] = targetKey.split(':')
    return {
      source: source as RadarAnalysisTarget['source'],
      latitude: Number(latitude),
      longitude: Number(longitude),
    }
  }, [targetKey])
  const latestFrameId = frames.at(-1)?.id ?? null

  useEffect(() => {
    if (!analysisTarget || !latestFrameId) {
      return
    }
    const controller = new AbortController()
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, TIMEOUT_MS)
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setState({ status: 'loading', analysis: null, message: null })
      }
    })
    void analyzeRainViewerNearby(frames, analysisTarget, controller.signal)
      .then((analysis) => {
        setState({ status: 'ready', analysis, message: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted && !timedOut) {
          return
        }
        setState({
          status: 'error',
          analysis: null,
          message: timedOut
            ? 'Radar nearby analysis timed out.'
            : error instanceof Error ? error.message : 'Radar nearby analysis unavailable.',
        })
      })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [analysisTarget, frames, latestFrameId, refreshKey])

  return state
}
