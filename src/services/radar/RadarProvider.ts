import type { RadarFrame } from '../../types/weather'

export interface RadarProvider {
  getHistoricalFrames(signal?: AbortSignal): Promise<RadarFrame[]>
}
