import type {
  CloudCoverCoordinate,
  CloudCoverReading,
} from '../../types/weather.ts'
import type {
  CloudCoverProvider,
  CloudCoverProviderResult,
} from './CloudCoverProvider.ts'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoCurrent {
  time?: unknown
  interval?: unknown
  cloud_cover?: unknown
}

interface OpenMeteoResponse {
  location_id?: unknown
  current?: OpenMeteoCurrent
}

function parseReading(
  response: OpenMeteoResponse,
  coordinates: CloudCoverCoordinate[],
  responseIndex: number,
): CloudCoverReading | null {
  const locationId =
    typeof response.location_id === 'number' &&
    Number.isInteger(response.location_id)
      ? response.location_id
      : responseIndex
  const coordinate = coordinates[locationId]
  const time = response.current?.time
  const interval = response.current?.interval
  const cloudCover = response.current?.cloud_cover

  if (
    !coordinate ||
    typeof time !== 'number' ||
    !Number.isFinite(time) ||
    typeof interval !== 'number' ||
    !Number.isFinite(interval) ||
    typeof cloudCover !== 'number' ||
    !Number.isFinite(cloudCover)
  ) {
    return null
  }

  return {
    ...coordinate,
    cloudCoverPercent: Math.min(100, Math.max(0, cloudCover)),
    modelTimestampMs: time * 1000,
    intervalSeconds: interval,
  }
}

export class OpenMeteoCloudCoverProvider implements CloudCoverProvider {
  readonly name = 'Open-Meteo'
  readonly modelName = 'Best Match forecast models'
  private readonly fetcher: typeof fetch

  constructor(fetcher: typeof fetch = (input, init) => window.fetch(input, init)) {
    this.fetcher = fetcher
  }

  async getCurrentCloudCover(
    coordinates: CloudCoverCoordinate[],
    signal?: AbortSignal,
  ): Promise<CloudCoverProviderResult> {
    if (coordinates.length === 0) {
      return {
        readings: [],
        requestCount: 0,
        requestUrlLength: 0,
        responseBytes: 0,
        responseDurationMs: 0,
      }
    }

    const requestUrl = new URL(FORECAST_URL)
    requestUrl.search = new URLSearchParams({
      latitude: coordinates
        .map((coordinate) => coordinate.latitude.toFixed(4))
        .join(','),
      longitude: coordinates
        .map((coordinate) => coordinate.longitude.toFixed(4))
        .join(','),
      current: 'cloud_cover',
      timeformat: 'unixtime',
      timezone: 'GMT',
    }).toString().replaceAll('%2C', ',')

    const startedAt = performance.now()
    let response: Response
    try {
      response = await this.fetcher(requestUrl, { signal })
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'request failed'
      throw new Error(
        `Open-Meteo cloud-cover request could not complete (${requestUrl.href.length}-character URL): ${reason}`,
      )
    }
    if (!response.ok) {
      throw new Error(`Open-Meteo cloud-cover request failed (${response.status}).`)
    }

    const responseText = await response.text()
    const responseDurationMs = performance.now() - startedAt
    const payload = JSON.parse(responseText) as
      | OpenMeteoResponse
      | OpenMeteoResponse[]
    const responses = Array.isArray(payload) ? payload : [payload]
    const readings = responses.flatMap((item, index) => {
      const reading = parseReading(item, coordinates, index)
      return reading ? [reading] : []
    })

    return {
      readings,
      requestCount: 1,
      requestUrlLength: requestUrl.href.length,
      responseBytes: new TextEncoder().encode(responseText).byteLength,
      responseDurationMs,
    }
  }
}
