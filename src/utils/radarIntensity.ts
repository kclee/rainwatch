export type RadarIntensity = 'weak' | 'moderate' | 'strong'

const UNIVERSAL_BLUE_20_TO_64 = [
  '00a3e0', '009ad5', '0091ca', '0088bf', '007fb4',
  '0077aa', '0070a3', '00699c', '006295', '005b8e',
  '005588', '005180', '004e78', '004a70', '004768',
  'ffee00', 'ffe000', 'ffd200', 'ffc500', 'ffb700',
  'ffaa00', 'ff9f00', 'ff9500', 'ff8b00', 'ff8100',
  'ff4400', 'f23600', 'e62800', 'd91b00', 'cd0d00',
  'c10000', 'a80000', '8f0000', '760000', '5d0000',
  'ffaaff', 'ff9fff', 'ff95ff', 'ff8bff', 'ff81ff',
  'ff77ff', 'ff6cff', 'ff62ff', 'ff58ff', 'ff4eff',
] as const

const DBZ_BY_RGB = new Map<string, number>(
  UNIVERSAL_BLUE_20_TO_64.map((color, index) => [color, index + 20]),
)
DBZ_BY_RGB.set('ffffff', 65)
DBZ_BY_RGB.set('00ff00', 75)

export function universalBlueDbz(red: number, green: number, blue: number, alpha: number) {
  if (alpha < 250) return null
  const key = [red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
  return DBZ_BY_RGB.get(key) ?? null
}

export function classifyDbz(dbz: number | null): RadarIntensity | null {
  if (dbz === null || dbz < 20) return null
  if (dbz < 35) return 'weak'
  if (dbz < 45) return 'moderate'
  return 'strong'
}

export function classifyUniversalBluePixel(
  red: number,
  green: number,
  blue: number,
  alpha: number,
) {
  return classifyDbz(universalBlueDbz(red, green, blue, alpha))
}
