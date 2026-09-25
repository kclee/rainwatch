import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyUniversalBluePixel, universalBlueDbz } from './radarIntensity.ts'

test('classifies documented Universal Blue colors conservatively', () => {
  assert.equal(universalBlueDbz(0, 163, 224, 255), 20)
  assert.equal(classifyUniversalBluePixel(0, 163, 224, 255), 'weak')
  assert.equal(classifyUniversalBluePixel(255, 238, 0, 255), 'moderate')
  assert.equal(classifyUniversalBluePixel(255, 68, 0, 255), 'strong')
})

test('does not classify transparent or below-threshold colors as rain', () => {
  assert.equal(classifyUniversalBluePixel(0, 163, 224, 0), null)
  assert.equal(classifyUniversalBluePixel(0, 0, 0, 255), null)
})
