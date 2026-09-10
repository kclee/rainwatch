import type { LngLatLike } from 'maplibre-gl'

const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export const mapConfig = {
  styleUrl: import.meta.env.VITE_BASEMAP_STYLE_URL || DEFAULT_STYLE_URL,
  fallbackCenter: [-98.5795, 39.8283] as LngLatLike,
  fallbackZoom: 3.25,
  minZoom: 2,
  maxZoom: 16,
}
