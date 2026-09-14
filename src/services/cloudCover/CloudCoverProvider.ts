import type {
  CloudCoverCoordinate,
  CloudCoverReading,
} from '../../types/weather.ts'

export interface CloudCoverProviderResult {
  readings: CloudCoverReading[]
  requestCount: number
  requestUrlLength: number
  responseBytes: number
  responseDurationMs: number
}

export interface CloudCoverProvider {
  readonly name: string
  readonly modelName: string
  getCurrentCloudCover(
    coordinates: CloudCoverCoordinate[],
    signal?: AbortSignal,
  ): Promise<CloudCoverProviderResult>
}
