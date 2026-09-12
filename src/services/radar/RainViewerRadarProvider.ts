import type { RadarFrame, RadarPalette } from '../../types/weather'
import type { RadarProvider } from './RadarProvider'

const WEATHER_MAPS_URL =
  'https://api.rainviewer.com/public/weather-maps.json'
const TWO_HOURS_SECONDS = 2 * 60 * 60
const COLOR_SCHEME = 2
const TILE_OPTIONS = '1_1'

const UNIVERSAL_BLUE_PALETTE: RadarPalette = {
  name: 'Universal Blue',
  items: [
    { label: 'Light', color: '#00a3e0' },
    { label: 'Moderate', color: '#ffee00' },
    { label: 'Heavy', color: '#ff4400' },
    { label: 'Intense', color: '#ffaaff' },
  ],
  note: 'Colors show increasing radar reflectivity, not exact rainfall rates.',
}

interface RainViewerFrameData {
  time: number
  path: string
}

interface RainViewerResponse {
  host?: unknown
  radar?: {
    past?: unknown
  }
}

function isFrameData(value: unknown): value is RainViewerFrameData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const frame = value as Record<string, unknown>
  return (
    typeof frame.time === 'number' &&
    Number.isFinite(frame.time) &&
    typeof frame.path === 'string' &&
    frame.path.startsWith('/')
  )
}

export class RainViewerRadarProvider implements RadarProvider {
  readonly palette = UNIVERSAL_BLUE_PALETTE

  async getHistoricalFrames(signal?: AbortSignal): Promise<RadarFrame[]> {
    const response = await fetch(WEATHER_MAPS_URL, { signal })

    if (!response.ok) {
      throw new Error(`RainViewer metadata request failed (${response.status}).`)
    }

    const payload = (await response.json()) as RainViewerResponse
    if (typeof payload.host !== 'string') {
      throw new Error('RainViewer metadata did not include a tile host.')
    }

    const host = new URL(payload.host)
    if (host.protocol !== 'https:') {
      throw new Error('RainViewer returned an unsupported tile host.')
    }

    const pastFrames = Array.isArray(payload.radar?.past)
      ? payload.radar.past.filter(isFrameData)
      : []

    if (pastFrames.length === 0) {
      return []
    }

    pastFrames.sort((left, right) => left.time - right.time)
    const latestTime = pastFrames.at(-1)?.time ?? 0

    return pastFrames
      .filter((frame) => frame.time >= latestTime - TWO_HOURS_SECONDS)
      .map((frame) => ({
        id: `${frame.time}-${frame.path}`,
        timestampSeconds: frame.time,
        tileUrl: `${host.origin}${frame.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${TILE_OPTIONS}.png`,
        attribution:
          '<a href="https://www.rainviewer.com/" target="_blank">Radar © RainViewer</a>',
      }))
  }
}
