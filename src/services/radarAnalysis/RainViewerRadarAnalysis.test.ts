import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeRainViewerNearby } from './RainViewerRadarAnalysis.ts'

test('reports missing Radar analysis data before making requests', async () => {
  await assert.rejects(
    analyzeRainViewerNearby([], {
      latitude: 30,
      longitude: -98,
      source: 'map-center',
    }, new AbortController().signal),
    /unavailable/,
  )
})
