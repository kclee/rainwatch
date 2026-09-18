import {
  SATELLITE_HISTORY_HOURS,
  SATELLITE_HISTORY_MAX_FRAMES,
  SATELLITE_HISTORY_QUERY_RECORDS,
} from '../../config/cloud.ts'
import type {
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
} from '../../types/weather'
import { buildNoaaImageRequest } from './noaaImageRequest.ts'
import { satelliteHttpError, satelliteProviderError } from './satelliteRequest.ts'

const SERVICE_URL =
  'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/MERGEDGC_Last_24hr/ImageServer'

interface NoaaFeature {
  attributes?: unknown
}

interface NoaaQueryResponse {
  features?: unknown
  error?: { code?: unknown; message?: unknown }
}

function parseFrame(value: unknown): CloudFrame | null {
  if (!value || typeof value !== 'object') return null
  const attributes = value as Record<string, unknown>
  if (
    typeof attributes.objectid !== 'number' ||
    !Number.isInteger(attributes.objectid) ||
    typeof attributes.name !== 'string' ||
    typeof attributes.end_time !== 'number' ||
    !Number.isFinite(attributes.end_time)
  ) {
    return null
  }

  return {
    id: `archive-${attributes.objectid}-${attributes.end_time}`,
    objectId: attributes.objectid,
    name: attributes.name,
    timestampMs: attributes.end_time,
    source: 'archive',
    attributionLabel: 'Satellite © NOAA/NESDIS',
    attributionUrl: 'https://www.nesdis.noaa.gov/',
  }
}

export class NoaaGoesArchiveProvider {
  readonly name = 'NOAA GOES GeoColor 24-hour archive'
  private readonly fetcher: typeof fetch

  constructor(
    fetcher: typeof fetch = (input, init) => window.fetch(input, init),
  ) {
    this.fetcher = fetcher
  }

  async getRecentFrames(signal?: AbortSignal): Promise<CloudFrame[]> {
    const queryUrl = new URL(`${SERVICE_URL}/query`)
    queryUrl.search = new URLSearchParams({
      where: '1=1',
      outFields: 'objectid,name,start_time,end_time',
      returnGeometry: 'false',
      orderByFields: 'end_time DESC',
      resultRecordCount: String(SATELLITE_HISTORY_QUERY_RECORDS),
      f: 'json',
    }).toString()

    const response = await this.fetcher(queryUrl, { signal })
    if (!response.ok) {
      throw satelliteHttpError(response.status, 'NOAA Satellite archive request')
    }

    const payload = (await response.json()) as NoaaQueryResponse
    if (payload.error) {
      const detail =
        typeof payload.error.message === 'string'
          ? ` ${payload.error.message}`
          : ''
      const code = payload.error.code
      const retryable = typeof code !== 'number' || code >= 500
      throw satelliteProviderError(
        `NOAA Satellite archive returned an error.${detail}`,
        retryable,
      )
    }

    const frames = (Array.isArray(payload.features)
      ? (payload.features as NoaaFeature[])
      : [])
      .map((feature) => parseFrame(feature.attributes))
      .filter((frame): frame is CloudFrame => frame !== null)
      .sort((left, right) =>
        (left.timestampMs ?? 0) - (right.timestampMs ?? 0),
      )

    const newestTimestamp = frames.at(-1)?.timestampMs
    if (newestTimestamp === null || newestTimestamp === undefined) return []

    const windowStart = newestTimestamp - SATELLITE_HISTORY_HOURS * 60 * 60 * 1000
    return frames
      .filter((frame) => (frame.timestampMs ?? 0) >= windowStart)
      .slice(-SATELLITE_HISTORY_MAX_FRAMES)
  }

  buildImageRequest(
    frame: CloudFrame,
    viewport: CloudViewport,
  ): CloudImageRequest | null {
    return buildNoaaImageRequest(SERVICE_URL, frame, viewport)
  }
}
