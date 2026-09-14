import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenMeteoCloudCoverProvider } from './OpenMeteoCloudCoverProvider.ts'

test('batches coordinates and maps current cloud-cover values', async () => {
  let requestedUrl = ''
  const provider = new OpenMeteoCloudCoverProvider(async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify([
      { current: { time: 1_789_362_900, interval: 900, cloud_cover: 12 } },
      { location_id: 1, current: { time: 1_789_362_900, interval: 900, cloud_cover: 84 } },
    ]))
  })
  const result = await provider.getCurrentCloudCover([
    { id: 'a', latitude: 30.2672, longitude: -97.7431 },
    { id: 'b', latitude: 25.033, longitude: 121.5654 },
  ])

  assert.equal(result.requestCount, 1)
  assert.deepEqual(result.readings.map((reading) => reading.cloudCoverPercent), [12, 84])
  assert.match(requestedUrl, /current=cloud_cover/)
  assert.match(requestedUrl, /latitude=30\.2672%2C25\.0330/)
})

test('rejects unsuccessful provider responses', async () => {
  const provider = new OpenMeteoCloudCoverProvider(async () => new Response('', { status: 503 }))
  await assert.rejects(
    provider.getCurrentCloudCover([{ id: 'a', latitude: 30, longitude: -97 }]),
    /failed \(503\)/,
  )
})
