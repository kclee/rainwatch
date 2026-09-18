import {
  CLOUD_REQUEST_TIMEOUT_MS,
  SATELLITE_METADATA_RETRY_DELAYS_MS,
} from '../../config/cloud.ts'

export type SatelliteFailureCategory =
  | 'network'
  | 'timeout'
  | 'http'
  | 'provider'
  | 'unavailable'
  | 'rendering'

export class SatelliteRequestError extends Error {
  readonly category: SatelliteFailureCategory
  readonly retryable: boolean
  readonly status: number | null

  constructor(
    message: string,
    options: {
      category: SatelliteFailureCategory
      retryable: boolean
      status?: number
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'SatelliteRequestError'
    this.category = options.category
    this.retryable = options.retryable
    this.status = options.status ?? null
  }
}

export function satelliteHttpError(status: number, context: string) {
  const retryable = status === 408 || status === 429 || status >= 500
  return new SatelliteRequestError(`${context} failed with HTTP ${status}.`, {
    category: 'http',
    retryable,
    status,
  })
}

export function satelliteProviderError(message: string, retryable = true) {
  return new SatelliteRequestError(message, {
    category: 'provider',
    retryable,
  })
}

function normalizeFailure(error: unknown, didTimeOut: boolean) {
  if (didTimeOut) {
    return new SatelliteRequestError('The NOAA Satellite request timed out.', {
      category: 'timeout',
      retryable: true,
      cause: error,
    })
  }
  if (error instanceof SatelliteRequestError) return error
  if (error instanceof DOMException && error.name === 'AbortError') throw error
  return new SatelliteRequestError(
    error instanceof Error ? error.message : 'NOAA Satellite could not be reached.',
    { category: 'network', retryable: true, cause: error },
  )
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout)
      reject(new DOMException('The request was cancelled.', 'AbortError'))
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}

interface SatelliteRetryOptions {
  signal?: AbortSignal
  timeoutMs?: number
  retryDelaysMs?: readonly number[]
  onRetry?: (error: SatelliteRequestError, nextAttempt: number) => void
}

export async function withSatelliteRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: SatelliteRetryOptions = {},
): Promise<T> {
  const {
    signal,
    timeoutMs = CLOUD_REQUEST_TIMEOUT_MS,
    retryDelaysMs = SATELLITE_METADATA_RETRY_DELAYS_MS,
    onRetry,
  } = options

  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted()
    const attemptController = new AbortController()
    let didTimeOut = false
    const cancelAttempt = () => attemptController.abort()
    signal?.addEventListener('abort', cancelAttempt, { once: true })
    const timeout = setTimeout(() => {
      didTimeOut = true
      attemptController.abort()
    }, timeoutMs)

    try {
      return await operation(attemptController.signal)
    } catch (error: unknown) {
      if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError')
      const failure = normalizeFailure(error, didTimeOut)
      const delayMs = retryDelaysMs[attempt]
      if (!failure.retryable || delayMs === undefined) throw failure
      onRetry?.(failure, attempt + 2)
      await waitForRetry(delayMs, signal)
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', cancelAttempt)
    }
  }
}

export function satelliteFailureMessage(error: unknown) {
  if (!(error instanceof SatelliteRequestError)) {
    return 'Network error while loading Satellite.'
  }
  switch (error.category) {
    case 'timeout':
      return 'NOAA Satellite timed out.'
    case 'http':
      return error.retryable
        ? 'NOAA Satellite service is temporarily unavailable.'
        : `NOAA Satellite request was rejected${error.status ? ` (${error.status})` : ''}.`
    case 'provider':
    case 'unavailable':
      return 'NOAA Satellite service is temporarily unavailable.'
    case 'rendering':
      return 'Satellite image could not be rendered.'
    case 'network':
      return 'Network error while loading Satellite.'
  }
}
