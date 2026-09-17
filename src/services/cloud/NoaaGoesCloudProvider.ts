import type {
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
} from '../../types/weather'
import type { CloudProvider } from './CloudProvider'
import { buildNoaaImageRequest } from './noaaImageRequest.ts'

const SERVICE_URL =
  'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/Most_Recent_MERGEDGC/ImageServer'

interface NoaaFeature {
  attributes?: unknown
}

interface NoaaQueryResponse {
  features?: unknown
  error?: {
    message?: unknown
  }
}

interface NoaaFrameAttributes {
  objectid: number
  name: string
  end_time: number | null
}

function parseFrameAttributes(value: unknown): NoaaFrameAttributes | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const attributes = value as Record<string, unknown>
  if (
    typeof attributes.objectid !== 'number' ||
    !Number.isInteger(attributes.objectid) ||
    typeof attributes.name !== 'string'
  ) {
    return null
  }

  const endTime = attributes.end_time
  return {
    objectid: attributes.objectid,
    name: attributes.name,
    end_time:
      typeof endTime === 'number' && Number.isFinite(endTime) ? endTime : null,
  }
}

export class NoaaGoesCloudProvider implements CloudProvider {
  readonly name = 'NOAA GOES GeoColor'
  private readonly fetcher: typeof fetch

  constructor(
    fetcher: typeof fetch = (input, init) => window.fetch(input, init),
  ) {
    this.fetcher = fetcher
  }

  async getLatestFrame(signal?: AbortSignal): Promise<CloudFrame | null> {
    const queryUrl = new URL(`${SERVICE_URL}/query`)
    queryUrl.search = new URLSearchParams({
      where: '1=1',
      outFields: 'objectid,name,start_time,end_time',
      returnGeometry: 'false',
      resultRecordCount: '1',
      f: 'json',
    }).toString()

    const response = await this.fetcher(queryUrl, { signal })
    if (!response.ok) {
      throw new Error(`NOAA satellite metadata request failed (${response.status}).`)
    }

    const payload = (await response.json()) as NoaaQueryResponse
    if (payload.error) {
      const detail =
        typeof payload.error.message === 'string'
          ? ` ${payload.error.message}`
          : ''
      throw new Error(`NOAA satellite service returned an error.${detail}`)
    }

    const features = Array.isArray(payload.features)
      ? (payload.features as NoaaFeature[])
      : []
    const attributes = parseFrameAttributes(features[0]?.attributes)
    if (!attributes) {
      return null
    }

    return {
      id: `${attributes.objectid}-${attributes.end_time ?? attributes.name}`,
      objectId: attributes.objectid,
      name: attributes.name,
      timestampMs: attributes.end_time,
      source: 'latest',
      attributionLabel: 'Satellite © NOAA/NESDIS',
      attributionUrl: 'https://www.nesdis.noaa.gov/',
    }
  }

  buildImageRequest(
    frame: CloudFrame,
    viewport: CloudViewport,
  ): CloudImageRequest | null {
    return buildNoaaImageRequest(SERVICE_URL, frame, viewport)
  }
}
