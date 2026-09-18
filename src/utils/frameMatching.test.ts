import assert from 'node:assert/strict'
import test from 'node:test'
import { closestFrame, frameMatchQuality } from './frameMatching.ts'

interface Candidate {
  id: string
  timestampMs: number
}

const timestamp = (candidate: Candidate) => candidate.timestampMs

test('returns an exact frame match', () => {
  const match = closestFrame(1_000, [
    { id: 'earlier', timestampMs: 500 },
    { id: 'exact', timestampMs: 1_000 },
  ], timestamp)
  assert.equal(match?.frame.id, 'exact')
  assert.equal(match?.differenceMs, 0)
})

test('returns the closest earlier frame', () => {
  const match = closestFrame(1_000, [
    { id: 'earlier', timestampMs: 900 },
    { id: 'later', timestampMs: 1_400 },
  ], timestamp)
  assert.equal(match?.frame.id, 'earlier')
  assert.equal(match?.differenceMs, 100)
})

test('returns the closest later frame', () => {
  const match = closestFrame(1_000, [
    { id: 'earlier', timestampMs: 500 },
    { id: 'later', timestampMs: 1_100 },
  ], timestamp)
  assert.equal(match?.frame.id, 'later')
  assert.equal(match?.differenceMs, 100)
})

test('prefers the earlier observation for an equal-distance tie', () => {
  const match = closestFrame(1_000, [
    { id: 'later', timestampMs: 1_100 },
    { id: 'earlier', timestampMs: 900 },
  ], timestamp)
  assert.equal(match?.frame.id, 'earlier')
})

test('returns null when no frames are available', () => {
  assert.equal(closestFrame(1_000, [], timestamp), null)
})

test('returns the only available frame', () => {
  const match = closestFrame(
    1_000,
    [{ id: 'only', timestampMs: 4_000 }],
    timestamp,
  )
  assert.equal(match?.frame.id, 'only')
  assert.equal(match?.differenceMs, 3_000)
})

test('classifies close, moderate, large, and unavailable matches', () => {
  assert.equal(frameMatchQuality(5 * 60 * 1000), 'close')
  assert.equal(frameMatchQuality(6 * 60 * 1000), 'moderate')
  assert.equal(frameMatchQuality(15 * 60 * 1000), 'moderate')
  assert.equal(frameMatchQuality(16 * 60 * 1000), 'large')
  assert.equal(frameMatchQuality(null), 'unavailable')
})
