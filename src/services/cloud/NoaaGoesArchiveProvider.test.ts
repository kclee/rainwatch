import assert from 'node:assert/strict'
import test from 'node:test'
import { NoaaGoesArchiveProvider } from './NoaaGoesArchiveProvider.ts'

function feature(objectid: number, timestampMs: number, name = `frame-${objectid}`) {
  return {
    attributes: {
      objectid,
      name,
      start_time: timestampMs - 9 * 60 * 1000,
      end_time: timestampMs,
    },
  }
}

test('discovers, sorts, and limits actual archive records to three hours', async () => {
  const newest = Date.UTC(2026, 8, 17, 12, 0)
  let requestUrl = ''
  const provider = new NoaaGoesArchiveProvider(async (input) => {
    requestUrl = String(input)
    return new Response(JSON.stringify({
      features: [
        feature(4, newest - 60 * 60 * 1000),
        feature(1, newest - 3 * 60 * 60 * 1000),
        feature(5, newest),
        feature(0, newest - 3 * 60 * 60 * 1000 - 1),
        { attributes: { objectid: 'bad', name: 'bad', end_time: newest } },
        feature(3, newest - 2 * 60 * 60 * 1000),
      ],
    }), { status: 200 })
  })

  const frames = await provider.getRecentFrames()

  assert.deepEqual(frames.map((frame) => frame.objectId), [1, 3, 4, 5])
  assert.ok(frames.every((frame) => frame.source === 'archive'))
  const query = new URL(requestUrl)
  assert.equal(query.searchParams.get('orderByFields'), 'end_time DESC')
  assert.equal(query.searchParams.get('resultRecordCount'), '30')
  assert.equal(query.searchParams.get('returnGeometry'), 'false')
})

test('returns no frames for empty archive metadata', async () => {
  const provider = new NoaaGoesArchiveProvider(async () =>
    new Response(JSON.stringify({ features: [] }), { status: 200 }),
  )
  assert.deepEqual(await provider.getRecentFrames(), [])
})

test('rejects unsuccessful archive requests and ArcGIS errors', async () => {
  const unavailable = new NoaaGoesArchiveProvider(async () =>
    new Response('', { status: 503 }),
  )
  await assert.rejects(unavailable.getRecentFrames(), /503/)

  const arcgisError = new NoaaGoesArchiveProvider(async () =>
    new Response(JSON.stringify({ error: { message: 'Service busy' } }), { status: 200 }),
  )
  await assert.rejects(arcgisError.getRecentFrames(), /Service busy/)
})

test('builds a viewport-bounded archive export locked to one real raster', () => {
  const provider = new NoaaGoesArchiveProvider()
  const request = provider.buildImageRequest({
    id: 'archive-42',
    objectId: 42,
    name: 'frame-42',
    timestampMs: Date.UTC(2026, 8, 17, 12, 0),
    source: 'archive',
    attributionLabel: 'Satellite © NOAA/NESDIS',
    attributionUrl: 'https://www.nesdis.noaa.gov/',
  }, {
    west: -130,
    south: 20,
    east: -60,
    north: 55,
    width: 2_000,
    height: 1_500,
    pixelRatio: 2,
  })

  assert.ok(request)
  const url = new URL(request.url)
  assert.match(url.pathname, /MERGEDGC_Last_24hr\/ImageServer\/exportImage$/)
  assert.equal(url.searchParams.get('size'), '1600,1200')
  assert.deepEqual(JSON.parse(url.searchParams.get('mosaicRule') ?? ''), {
    mosaicMethod: 'esriMosaicLockRaster',
    lockRasterIds: [42],
  })
  assert.deepEqual(request.coordinates, [
    [-130, 55],
    [-60, 55],
    [-60, 20],
    [-130, 20],
  ])
})
