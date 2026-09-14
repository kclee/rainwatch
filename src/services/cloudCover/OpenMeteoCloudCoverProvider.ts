import { CLOUD_COVER_MAX_BATCH_SIZE } from '../../config/cloudCover.ts'
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

function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
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
      return { readings: [], requestCount: 0, responseBytes: 0 }
    }

    const readings: CloudCoverReading[] = []
    let requestCount = 0
    let responseBytes = 0

    for (const coordinateBatch of chunks(coordinates, CLOUD_COVER_MAX_BATCH_SIZE)) {
      const requestUrl = new URL(FORECAST_URL)
      requestUrl.search = new URLSearchParams({
        latitude: coordinateBatch
          .map((coordinate) => coordinate.latitude.toFixed(4))
          .join(','),
        longitude: coordinateBatch
          .map((coordinate) => coordinate.longitude.toFixed(4))
          .join(','),
        current: 'cloud_cover',
        timeformat: 'unixtime',
        timezone: 'GMT',
      }).toString()

      const response = await this.fetcher(requestUrl, { signal })
      requestCount += 1
      if (!response.ok) {
        throw new Error(`Open-Meteo cloud-cover request failed (${response.status}).`)
      }

      const responseText = await response.text()
      responseBytes += new TextEncoder().encode(responseText).byteLength
      const payload = JSON.parse(responseText) as
        | OpenMeteoResponse
        | OpenMeteoResponse[]
      const responses = Array.isArray(payload) ? payload : [payload]
      const batchReadings = responses.flatMap((item, index) => {
        const reading = parseReading(item, coordinateBatch, index)
        return reading ? [reading] : []
      })
      readings.push(...batchReadings)
    }

    return { readings, requestCount, responseBytes }
  }
}
