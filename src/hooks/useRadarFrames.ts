import { useEffect, useState } from 'react'
import { RainViewerRadarProvider } from '../services/radar/RainViewerRadarProvider'
import type { RadarFrame, RadarStatus } from '../types/weather'

const radarProvider = new RainViewerRadarProvider()
const REQUEST_TIMEOUT_MS = 10_000

interface RadarState {
  status: RadarStatus
  frames: RadarFrame[]
  message: string
}

const initialState: RadarState = {
  status: 'loading',
  frames: [],
  message: 'Loading recent radar…',
}

export function useRadarFrames() {
  const [state, setState] = useState<RadarState>(initialState)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    )

    radarProvider
      .getHistoricalFrames(controller.signal)
      .then((frames) => {
        window.clearTimeout(timeout)

        if (frames.length === 0) {
          setState({
            status: 'empty',
            frames: [],
            message:
              'RainViewer has no historical radar frames available right now.',
          })
          return
        }

        setState({
          status: 'ready',
          frames,
          message: `${frames.length} recent radar frames available.`,
        })
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeout)

        if (controller.signal.aborted) {
          setState({
            status: 'error',
            frames: [],
            message: 'The RainViewer request timed out. The basemap still works.',
          })
          return
        }

        setState({
          status: 'error',
          frames: [],
          message:
            error instanceof Error
              ? `${error.message} The basemap still works.`
              : 'Recent radar could not be loaded. The basemap still works.',
        })
      })

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return {
    ...state,
    latestFrame: state.frames.at(-1) ?? null,
  }
}
