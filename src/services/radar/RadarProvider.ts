import type { RadarFrame, RadarPalette } from '../../types/weather'

export interface RadarProvider {
  readonly palette: RadarPalette
  getHistoricalFrames(signal?: AbortSignal): Promise<RadarFrame[]>
}
