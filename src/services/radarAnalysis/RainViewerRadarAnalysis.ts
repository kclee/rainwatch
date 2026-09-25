import type { RadarFrame } from '../../types/weather'
import {
  analyzeRadarPixels,
  classifyRadarTrend,
  type RadarNearbyFrameResult,
  type RadarTrend,
} from '../../utils/radarNearby.ts'

export interface RadarAnalysisTarget {
  latitude: number
  longitude: number
  source: 'user-location' | 'map-center'
}

export interface RadarNearbyAnalysis {
  latest: RadarNearbyFrameResult
  trend: RadarTrend
  coverageAvailable: boolean
  analyzedFrameCount: number
  requestCount: number
  responseBytes: number
  durationMs: number
  target: RadarAnalysisTarget
}

interface DecodedImage {
  pixels: Uint8ClampedArray
  width: number
  height: number
  bytes: number
}

function analysisUrl(template: string, target: RadarAnalysisTarget) {
  const latitude = Math.round(target.latitude * 100) / 100
  const longitude = Math.round(target.longitude * 100) / 100
  return template
    .replace('{lat}', latitude.toString())
    .replace('{lon}', longitude.toString())
}

async function decodeImage(url: string, signal: AbortSignal): Promise<DecodedImage> {
  const response = await fetch(url, { signal, cache: 'default' })
  if (!response.ok) {
    throw new Error(`Radar analysis image request failed (${response.status}).`)
  }
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Radar image analysis is unavailable in this browser.')
    context.drawImage(bitmap, 0, 0)
    return {
      pixels: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
      width: bitmap.width,
      height: bitmap.height,
      bytes: blob.size,
    }
  } finally {
    bitmap.close()
  }
}

function hasCoverage(image: DecodedImage) {
  const centerX = Math.floor(image.width / 2)
  const centerY = Math.floor(image.height / 2)
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      const index = (y * image.width + x) * 4
      if (image.pixels[index + 3] < 128) return true
    }
  }
  return false
}

export async function analyzeRainViewerNearby(
  frames: RadarFrame[],
  target: RadarAnalysisTarget,
  signal: AbortSignal,
): Promise<RadarNearbyAnalysis> {
  const startedAt = performance.now()
  const selectedFrames = frames.slice(-5)
  const latestFrame = selectedFrames.at(-1)
  if (!latestFrame?.analysisTileUrl || !latestFrame.coverageTileUrl) {
    throw new Error('Radar analysis data is unavailable.')
  }

  const coveragePromise = decodeImage(analysisUrl(latestFrame.coverageTileUrl, target), signal)
  const radarPromises = selectedFrames.map(async (frame) => {
    if (!frame.analysisTileUrl) throw new Error('A Radar history frame cannot be analyzed.')
    const image = await decodeImage(analysisUrl(frame.analysisTileUrl, target), signal)
    return {
      analysis: analyzeRadarPixels(image.pixels, image.width, image.height, target.latitude),
      bytes: image.bytes,
    }
  })
  const [coverageSettled, radarSettled] = await Promise.all([
    Promise.allSettled([coveragePromise]),
    Promise.allSettled(radarPromises),
  ])
  if (signal.aborted) throw new DOMException('Radar analysis was cancelled.', 'AbortError')

  const coverage = coverageSettled[0]
  if (coverage.status === 'rejected') throw coverage.reason
  const latestResult = radarSettled.at(-1)
  if (!latestResult || latestResult.status === 'rejected') {
    throw latestResult?.reason ?? new Error('Latest Radar analysis failed.')
  }

  const history = radarSettled.map((result) =>
    result.status === 'fulfilled' ? result.value.analysis : null,
  )
  const responseBytes = coverage.value.bytes + radarSettled.reduce(
    (total, result) => total + (result.status === 'fulfilled' ? result.value.bytes : 0),
    0,
  )

  return {
    latest: latestResult.value.analysis,
    trend: classifyRadarTrend(history),
    coverageAvailable: hasCoverage(coverage.value),
    analyzedFrameCount: history.filter(Boolean).length,
    requestCount: selectedFrames.length + 1,
    responseBytes,
    durationMs: Math.round(performance.now() - startedAt),
    target,
  }
}
