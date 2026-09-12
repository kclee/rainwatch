import {
  CLOUD_IMAGE_MAX_HEIGHT,
  CLOUD_IMAGE_MAX_PIXEL_RATIO,
  CLOUD_IMAGE_MAX_WIDTH,
} from '../../config/cloud.ts'
import type {
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
} from '../../types/weather'
import type { CloudProvider } from './CloudProvider'

const SERVICE_URL =
  'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/Most_Recent_MERGEDGC/ImageServer'
const SERVICE_WEST = -180
const SERVICE_EAST = 180
const SERVICE_SOUTH = -76.49019873
const SERVICE_NORTH = 76.45880127
const WEB_MERCATOR_HALF_WORLD_METERS = 20_037_508.342789244

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

function longitudeToWebMercator(longitude: number) {
  return (longitude / 180) * WEB_MERCATOR_HALF_WORLD_METERS
}

function latitudeToWebMercator(latitude: number) {
  const radians = (latitude * Math.PI) / 180
  return (
    (Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) *
    WEB_MERCATOR_HALF_WORLD_METERS
  )
}

function boundedImageSize(viewport: CloudViewport) {
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)
  const requestedPixelRatio = Math.max(1, viewport.pixelRatio)
  const scale = Math.min(
    requestedPixelRatio,
    CLOUD_IMAGE_MAX_PIXEL_RATIO,
    CLOUD_IMAGE_MAX_WIDTH / width,
    CLOUD_IMAGE_MAX_HEIGHT / height,
  )

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
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
      attributionLabel: 'Satellite © NOAA/NESDIS',
      attributionUrl: 'https://www.nesdis.noaa.gov/',
    }
  }

  buildImageRequest(
    frame: CloudFrame,
    viewport: CloudViewport,
  ): CloudImageRequest | null {
    const west = Math.max(SERVICE_WEST, viewport.west)
    const east = Math.min(SERVICE_EAST, viewport.east)
    const south = Math.max(SERVICE_SOUTH, viewport.south)
    const north = Math.min(SERVICE_NORTH, viewport.north)
    if (west >= east || south >= north) {
      return null
    }

    const size = boundedImageSize(viewport)
    const exportUrl = new URL(`${SERVICE_URL}/exportImage`)
    exportUrl.search = new URLSearchParams({
      bbox: [
        longitudeToWebMercator(west),
        latitudeToWebMercator(south),
        longitudeToWebMercator(east),
        latitudeToWebMercator(north),
      ].join(','),
      bboxSR: '3857',
      imageSR: '3857',
      size: `${size.width},${size.height}`,
      format: 'png32',
      transparent: 'true',
      interpolation: 'RSP_BilinearInterpolation',
      mosaicRule: JSON.stringify({
        mosaicMethod: 'esriMosaicLockRaster',
        lockRasterIds: [frame.objectId],
      }),
      f: 'image',
    }).toString()

    return {
      url: exportUrl.toString(),
      coordinates: [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    }
  }
}
