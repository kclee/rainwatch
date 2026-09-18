export interface ClosestFrameMatch<T> {
  frame: T
  timestampMs: number
  differenceMs: number
}

export function closestFrame<T>(
  targetTimestampMs: number,
  candidates: readonly T[],
  getTimestampMs: (candidate: T) => number,
): ClosestFrameMatch<T> | null {
  if (!Number.isFinite(targetTimestampMs)) return null

  let best: ClosestFrameMatch<T> | null = null
  for (const frame of candidates) {
    const timestampMs = getTimestampMs(frame)
    if (!Number.isFinite(timestampMs)) continue
    const differenceMs = Math.abs(timestampMs - targetTimestampMs)
    if (
      !best ||
      differenceMs < best.differenceMs ||
      (differenceMs === best.differenceMs && timestampMs < best.timestampMs)
    ) {
      best = { frame, timestampMs, differenceMs }
    }
  }

  return best
}

export function frameMatchQuality(
  differenceMs: number | null,
): FrameMatchQuality {
  if (differenceMs === null || !Number.isFinite(differenceMs)) {
    return 'unavailable'
  }
  if (differenceMs <= CLOSE_FRAME_MATCH_DIFFERENCE_MS) return 'close'
  if (differenceMs <= MAX_FRAME_MATCH_DIFFERENCE_MS) return 'moderate'
  return 'large'
}
import {
  CLOSE_FRAME_MATCH_DIFFERENCE_MS,
  MAX_FRAME_MATCH_DIFFERENCE_MS,
} from '../config/frameMatching.ts'
import type { FrameMatchQuality } from '../types/weather'
