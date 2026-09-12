import type {
  CloudFrame,
  CloudImageRequest,
  CloudViewport,
} from '../../types/weather'

export interface CloudProvider {
  readonly name: string
  getLatestFrame(signal?: AbortSignal): Promise<CloudFrame | null>
  buildImageRequest(
    frame: CloudFrame,
    viewport: CloudViewport,
  ): CloudImageRequest | null
}
