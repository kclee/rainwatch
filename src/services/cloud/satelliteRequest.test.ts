import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SatelliteRequestError,
  satelliteFailureMessage,
  satelliteHttpError,
  satelliteProviderError,
  withSatelliteRetry,
} from './satelliteRequest.ts'

test('retries a transient network failure and returns the successful result', async () => {
  let calls = 0
  const result = await withSatelliteRetry(
    async () => {
      calls += 1
      if (calls === 1) throw new TypeError('fetch failed')
      return 'available'
    },
    { retryDelaysMs: [1], timeoutMs: 100 },
  )

  assert.equal(result, 'available')
  assert.equal(calls, 2)
})

test('does not retry a permanent HTTP failure', async () => {
  let calls = 0
  await assert.rejects(
    withSatelliteRetry(
      async () => {
        calls += 1
        throw satelliteHttpError(404, 'test request')
      },
      { retryDelaysMs: [1, 1], timeoutMs: 100 },
    ),
    (error: unknown) =>
      error instanceof SatelliteRequestError &&
      error.category === 'http' &&
      error.retryable === false,
  )
  assert.equal(calls, 1)
})

test('does not retry an explicitly permanent provider failure', async () => {
  let calls = 0
  await assert.rejects(
    withSatelliteRetry(
      async () => {
        calls += 1
        throw satelliteProviderError('invalid provider request', false)
      },
      { retryDelaysMs: [1, 1], timeoutMs: 100 },
    ),
    /invalid provider request/,
  )
  assert.equal(calls, 1)
})

test('limits timeout retries and reports the timeout category', async () => {
  let calls = 0
  await assert.rejects(
    withSatelliteRetry(
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          calls += 1
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          )
        }),
      { retryDelaysMs: [1], timeoutMs: 5 },
    ),
    (error: unknown) =>
      error instanceof SatelliteRequestError && error.category === 'timeout',
  )
  assert.equal(calls, 2)
})

test('keeps user-facing Satellite failure messages compact', () => {
  assert.equal(
    satelliteFailureMessage(satelliteHttpError(503, 'test request')),
    'NOAA Satellite service is temporarily unavailable.',
  )
  assert.equal(
    satelliteFailureMessage(satelliteHttpError(401, 'test request')),
    'NOAA Satellite request was rejected (401).',
  )
})
