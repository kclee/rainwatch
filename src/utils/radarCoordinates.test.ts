import assert from 'node:assert/strict'
import test from 'node:test'
import { latLonToRadarPixel, pixelOffsetToDirection, pixelOffsetToMiles } from './radarCoordinates.ts'

test('converts lat/lon to Web Mercator tile and pixel coordinates', () => {
  assert.deepEqual(latLonToRadarPixel(0, 0, 1), {
    tileX: 1,
    tileY: 1,
    pixelX: 0,
    pixelY: 0,
  })
  const austin = latLonToRadarPixel(30.2672, -97.7431, 6)
  assert.equal(austin.tileX, 14)
  assert.equal(austin.tileY, 26)
  assert.ok(austin.pixelX >= 0 && austin.pixelX < 256)
  assert.ok(austin.pixelY >= 0 && austin.pixelY < 256)
})

test('converts pixel offsets into approximate distance and compass direction', () => {
  const distance = pixelOffsetToMiles(10, 0, 30, 6, 512)
  assert.ok(distance > 6 && distance < 7)
  assert.equal(pixelOffsetToDirection(0, -10), 'N')
  assert.equal(pixelOffsetToDirection(10, -10), 'NE')
  assert.equal(pixelOffsetToDirection(-10, 0), 'W')
})
