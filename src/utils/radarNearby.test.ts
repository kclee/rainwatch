import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeRadarPixels, classifyRadarTrend, type RadarNearbyFrameResult } from './radarNearby.ts'

function pixels(width: number, height: number) {
  return new Uint8ClampedArray(width * height * 4)
}

function setRain(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4
  data.set([0, 163, 224, 255], index)
}

function result(distance: number | null): RadarNearbyFrameResult {
  return {
    atLocation: null,
    nearestDistanceMiles: distance,
    nearestDirection: distance === null ? null : 'N',
  }
}

test('finds precipitation at the target and the nearest direction', () => {
  const data = pixels(512, 512)
  setRain(data, 512, 256, 256)
  const analysis = analyzeRadarPixels(data, 512, 512, 30)
  assert.equal(analysis.atLocation, 'weak')
  assert.ok((analysis.nearestDistanceMiles ?? 10) < 1)

  const north = pixels(512, 512)
  setRain(north, 512, 256, 240)
  const nearest = analyzeRadarPixels(north, 512, 512, 30)
  assert.equal(nearest.atLocation, null)
  assert.equal(nearest.nearestDirection, 'N')
  assert.ok((nearest.nearestDistanceMiles ?? 0) > 9)
})

test('returns no nearby rain when none is inside the bounded radius', () => {
  const data = pixels(512, 512)
  setRain(data, 512, 500, 500)
  assert.deepEqual(analyzeRadarPixels(data, 512, 512, 30), {
    atLocation: null,
    nearestDistanceMiles: null,
    nearestDirection: null,
  })
})

test('classifies only consistent, material trend sequences', () => {
  assert.equal(classifyRadarTrend([40, 32, 25, 18, 12].map(result)), 'approaching')
  assert.equal(classifyRadarTrend([12, 18, 25, 32, 40].map(result)), 'moving-away')
  assert.equal(classifyRadarTrend([20, 18, 23, 19, 21].map(result)), 'unclear')
  assert.equal(classifyRadarTrend([result(20), null, result(null)]), 'unable')
})
