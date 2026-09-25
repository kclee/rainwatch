import assert from 'node:assert/strict'
import test from 'node:test'
import { isMapModeEnabled, normalizeMapMode } from './mapModes.ts'

test('keeps Radar as the only visible and enabled map mode', () => {
  assert.equal(isMapModeEnabled('radar'), true)
  assert.equal(isMapModeEnabled('satellite'), false)
  assert.equal(isMapModeEnabled('both'), false)
})

test('falls back from paused, invalid, and missing stored modes', () => {
  assert.equal(isMapModeEnabled('cloud-cover'), false)
  assert.equal(isMapModeEnabled('smooth-cloud'), false)
  assert.equal(normalizeMapMode('cloud-cover'), 'radar')
  assert.equal(normalizeMapMode('smooth-cloud'), 'radar')
  assert.equal(normalizeMapMode('satellite'), 'radar')
  assert.equal(normalizeMapMode('both'), 'radar')
  assert.equal(normalizeMapMode('not-a-mode'), 'radar')
  assert.equal(normalizeMapMode(null), 'radar')
})
