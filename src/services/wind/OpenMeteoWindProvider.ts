import type { WindReading, WindTarget } from '../../types/weather.ts'
import type { WindProvider } from './WindProvider.ts'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoCurrentWind {
  time?: unknown
  interval?: unknown
  wind_speed_10m?: unknown
  wind_direction_10m?: unknown
  wind_gusts_10m?: unknown
}

interface OpenMeteoWindResponse {
  latitude?: unknown
  longitude?: unknown
  current?: OpenMeteoCurrentWind
}

function optionalFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export class OpenMeteoWindProvider implements WindProvider {
  readonly name = 'Open-Meteo'
  readonly modelName = 'Best Match forecast models'
  private readonly fetcher: typeof fetch

  constructor(fetcher: typeof fetch = (input, init) => window.fetch(input, init)) {
    this.fetcher = fetcher
  }

  async getCurrentWind(
    target: WindTarget,
    signal?: AbortSignal,
  ): Promise<WindReading> {
    const requestUrl = new URL(FORECAST_URL)
    requestUrl.search = new URLSearchParams({
      latitude: target.latitude.toFixed(4),
      longitude: target.longitude.toFixed(4),
      current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      wind_speed_unit: 'mph',
      timeformat: 'unixtime',
      timezone: 'GMT',
    }).toString().replaceAll('%2C', ',')

    let response: Response
    try {
      response = await this.fetcher(requestUrl, { signal })
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'request failed'
      throw new Error(`Open-Meteo wind request could not complete: ${reason}`)
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo wind request failed (${response.status}).`)
    }

    const payload = (await response.json()) as OpenMeteoWindResponse
    const time = optionalFiniteNumber(payload.current?.time)
    const interval = optionalFiniteNumber(payload.current?.interval)
    const speedMph = optionalFiniteNumber(payload.current?.wind_speed_10m)
    const directionFromDegrees = optionalFiniteNumber(
      payload.current?.wind_direction_10m,
    )
    const gustMph = optionalFiniteNumber(payload.current?.wind_gusts_10m)

    if (
      time === null ||
      interval === null ||
      speedMph === null ||
      directionFromDegrees === null
    ) {
      throw new Error('Open-Meteo wind response was missing required values.')
    }

    return {
      latitude:
        optionalFiniteNumber(payload.latitude) ?? target.latitude,
      longitude:
        optionalFiniteNumber(payload.longitude) ?? target.longitude,
      source: target.source,
      speedMph: Math.max(0, speedMph),
      directionFromDegrees,
      gustMph: gustMph === null ? null : Math.max(0, gustMph),
      modelTimestampMs: time * 1000,
      intervalSeconds: interval,
      fetchedAtMs: Date.now(),
      providerName: this.name,
      modelName: this.modelName,
    }
  }
}

