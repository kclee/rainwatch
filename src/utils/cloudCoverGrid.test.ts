import assert from 'node:assert/strict'
import test from 'node:test'
import type { CloudCoverCell, CloudCoverViewport } from '../types/weather.ts'
import { parseCloudCoverGridSize } from '../config/cloudCover.ts'
import {
  buildCloudCoverGrid,
  cloudCoverCategory,
  selectCloudCoverSummary,
  viewportChangedMeaningfully,
} from './cloudCoverGrid.ts'

const viewport: CloudCoverViewport = {
  west: -100,
  south: 25,
  east: -90,
  north: 35,
  zoom: 4,
}

test('uses a modest adaptive sampling grid', () => {
  assert.equal(buildCloudCoverGrid(viewport).points.length, 25)
  assert.equal(buildCloudCoverGrid({ ...viewport, zoom: 8 }).points.length, 49)
})

test('accepts an experimental fixed sampling density', () => {
  assert.equal(buildCloudCoverGrid(viewport, 11).points.length, 121)
  assert.equal(buildCloudCoverGrid(viewport, 21).points.length, 441)
})

test('accepts only the documented cloudGrid experiment values', () => {
  assert.equal(parseCloudCoverGridSize('?cloudGrid=15'), 15)
  assert.equal(parseCloudCoverGridSize('?cloudGrid=13'), null)
  assert.equal(parseCloudCoverGridSize(''), null)
})

test('ignores tiny moves but detects meaningful viewport changes', () => {
  assert.equal(
    viewportChangedMeaningfully(viewport, {
      ...viewport,
      west: -99.5,
      east: -89.5,
    }),
    false,
  )
  assert.equal(
    viewportChangedMeaningfully(viewport, {
      ...viewport,
      west: -97,
      east: -87,
    }),
    true,
  )
})

test('applies the documented interpretation categories', () => {
  assert.equal(cloudCoverCategory(19), 'Mostly clear')
  assert.equal(cloudCoverCategory(20), 'Partly cloudy')
  assert.equal(cloudCoverCategory(50), 'Mostly cloudy')
  assert.equal(cloudCoverCategory(80), 'Overcast')
})

test('uses a location only when it lies inside the sampled viewport', () => {
  const cells: CloudCoverCell[] = [
    {
      id: 'center', latitude: 30, longitude: -95, west: -96, east: -94,
      south: 29, north: 31, cloudCoverPercent: 72,
      modelTimestampMs: 1, intervalSeconds: 900,
    },
  ]
  assert.equal(
    selectCloudCoverSummary(cells, viewport, {
      latitude: 30, longitude: -95, accuracyMeters: 100,
    })?.label,
    'Cloud cover near you',
  )
  assert.equal(
    selectCloudCoverSummary(cells, viewport, {
      latitude: 40, longitude: -80, accuracyMeters: 100,
    })?.label,
    'Cloud cover near map center',
  )
})
