import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSmoothCloudValidTime,
  isPointInsideBoundary,
} from './smoothCloud.ts'

test('recognizes points inside, outside, and on either side of a boundary', () => {
  const boundary: Array<[number, number]> = [
    [-125, 20],
    [-65, 20],
    [-65, 55],
    [-125, 55],
    [-125, 20],
  ]

  assert.equal(isPointInsideBoundary(-98.5795, 39.8283, boundary), true)
  assert.equal(isPointInsideBoundary(-97.7431, 30.2672, boundary), true)
  assert.equal(isPointInsideBoundary(-0.1276, 51.5072, boundary), false)
  assert.equal(isPointInsideBoundary(-149.9, 61.2, boundary), false)
})

test('reports the next whole-hour forecast valid time', () => {
  assert.equal(
    getSmoothCloudValidTime(Date.parse('2026-09-17T19:24:45Z')),
    Date.parse('2026-09-17T20:00:00Z'),
  )
})
