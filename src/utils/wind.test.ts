import assert from 'node:assert/strict'
import test from 'node:test'
import { WIND_STALE_THRESHOLD_MS } from '../config/wind.ts'
import {
  degreesToCompass,
  formatWindSpeedMph,
  selectWindTarget,
  windMovementDegrees,
} from './wind.ts'
import { getWindFreshness } from './windTime.ts'

test('converts degrees into a 16-point compass direction', () => {
  assert.equal(degreesToCompass(0), 'N')
  assert.equal(degreesToCompass(45), 'NE')
  assert.equal(degreesToCompass(90), 'E')
  assert.equal(degreesToCompass(225), 'SW')
  assert.equal(degreesToCompass(359), 'N')
})

test('points movement opposite the meteorological source direction', () => {
  assert.equal(windMovementDegrees(270), 90)
  assert.equal(degreesToCompass(windMovementDegrees(270)), 'E')
  assert.equal(windMovementDegrees(0), 180)
  assert.equal(degreesToCompass(windMovementDegrees(0)), 'S')
})

test('formats non-negative wind speed in mph', () => {
  assert.equal(formatWindSpeedMph(12.4), '12 mph')
  assert.equal(formatWindSpeedMph(12.6), '13 mph')
  assert.equal(formatWindSpeedMph(-2), '0 mph')
})

test('uses user location only while it is inside the map viewport', () => {
  const viewport = {
    west: -100,
    south: 25,
    east: -90,
    north: 35,
    zoom: 5,
  }
  assert.equal(
    selectWindTarget(viewport, {
      latitude: 30,
      longitude: -95,
      accuracyMeters: 25,
    }).source,
    'user',
  )
  assert.deepEqual(
    selectWindTarget(viewport, {
      latitude: 40,
      longitude: -75,
      accuracyMeters: 25,
    }),
    { latitude: 30, longitude: -95, source: 'map-center' },
  )
})

test('marks wind stale at the configured independent threshold', () => {
  const nowMs = Date.parse('2026-09-17T21:00:00Z')
  assert.equal(
    getWindFreshness(nowMs - WIND_STALE_THRESHOLD_MS + 1, nowMs).status,
    'fresh',
  )
  assert.equal(
    getWindFreshness(nowMs - WIND_STALE_THRESHOLD_MS, nowMs).status,
    'stale',
  )
})

