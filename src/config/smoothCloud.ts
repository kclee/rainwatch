export const SMOOTH_CLOUD_DOMAIN = 'ncep_hrrr_conus'
export const SMOOTH_CLOUD_VARIABLE = 'cloud_cover'
export const SMOOTH_CLOUD_LIBRARY_VERSION = '0.1.1'
export const DEFAULT_SMOOTH_CLOUD_OPACITY = 0.78

export const SMOOTH_CLOUD_METADATA_URL =
  `https://openmeteo.s3.amazonaws.com/data_spatial/${SMOOTH_CLOUD_DOMAIN}/latest.json`

export const SMOOTH_CLOUD_SOURCE_URL =
  `om://${SMOOTH_CLOUD_METADATA_URL}?time_step=current_time_1H&variable=${SMOOTH_CLOUD_VARIABLE}&interpolation=linear&color_blend=true`

export const SMOOTH_CLOUD_ATTRIBUTION =
  '<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo.com</a>'

export const SMOOTH_CLOUD_UNSUPPORTED_MESSAGE =
  'Smooth Cloud is experimental and currently available for the continental U.S.'

export const SMOOTH_CLOUD_FAILURE_MESSAGE =
  'Smooth Cloud could not load. The basemap is still available; switch to Cloud Cover for the global sampled view.'
