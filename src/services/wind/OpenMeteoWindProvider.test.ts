import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenMeteoWindProvider } from './OpenMeteoWindProvider.ts'

const target = {
  latitude: 30.2672,
  longitude: -97.7431,
  source: 'map-center' as const,
}

test('maps current 10 m wind values and requests mph', async () => {
  let requestedUrl = ''
  const provider = new OpenMeteoWindProvider(async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      latitude: 30.25,
      longitude: -97.75,
      current: {
        time: 1_789_362_900,
        interval: 900,
        wind_speed_10m: 12.4,
        wind_direction_10m: 270,
        wind_gusts_10m: 19.7,
      },
    }))
  })

  const reading = await provider.getCurrentWind(target)
  assert.equal(reading.speedMph, 12.4)
  assert.equal(reading.directionFromDegrees, 270)
  assert.equal(reading.gustMph, 19.7)
  assert.equal(reading.modelTimestampMs, 1_789_362_900_000)
  assert.equal(reading.source, 'map-center')
  assert.match(requestedUrl, /current=wind_speed_10m,wind_direction_10m,wind_gusts_10m/)
  assert.match(requestedUrl, /wind_speed_unit=mph/)
  assert.match(requestedUrl, /timeformat=unixtime/)
})

test('allows unavailable gusts while preserving required wind values', async () => {
  const provider = new OpenMeteoWindProvider(async () => new Response(JSON.stringify({
    current: {
      time: 1_789_362_900,
      interval: 900,
      wind_speed_10m: 5,
      wind_direction_10m: 20,
    },
  })))

  assert.equal((await provider.getCurrentWind(target)).gustMph, null)
})

test('rejects unsuccessful and incomplete provider responses', async () => {
  const unavailableProvider = new OpenMeteoWindProvider(
    async () => new Response('', { status: 429 }),
  )
  await assert.rejects(
    unavailableProvider.getCurrentWind(target),
    /failed \(429\)/,
  )

  const incompleteProvider = new OpenMeteoWindProvider(
    async () => new Response(JSON.stringify({ current: { time: 1 } })),
  )
  await assert.rejects(
    incompleteProvider.getCurrentWind(target),
    /missing required values/,
  )
})

