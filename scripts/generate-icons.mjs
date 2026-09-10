import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const iconDirectory = join(projectRoot, 'public', 'icons')
const sourceIcon = join(iconDirectory, 'rainwatch.svg')

await mkdir(iconDirectory, { recursive: true })

const icons = [
  { filename: 'icon-192.png', size: 192 },
  { filename: 'icon-512.png', size: 512 },
  { filename: 'apple-touch-icon.png', size: 180 },
]

await Promise.all(
  icons.map(({ filename, size }) =>
    sharp(sourceIcon)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(join(iconDirectory, filename)),
  ),
)

console.log(
  `Generated ${icons.length} RainWatch icons from public/icons/rainwatch.svg`,
)
