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

const SERVICE_WEST = -180
const SERVICE_EAST = 180
const SERVICE_SOUTH = -76.49019873
const SERVICE_NORTH = 76.45880127
const WEB_MERCATOR_HALF_WORLD_METERS = 20_037_508.342789244

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

export function buildNoaaImageRequest(
  serviceUrl: string,
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
  const exportUrl = new URL(`${serviceUrl}/exportImage`)
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
