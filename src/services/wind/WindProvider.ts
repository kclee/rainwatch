import type { WindReading, WindTarget } from '../../types/weather.ts'

export interface WindProvider {
  readonly name: string
  readonly modelName: string
  getCurrentWind(
    target: WindTarget,
    signal?: AbortSignal,
  ): Promise<WindReading>
}

