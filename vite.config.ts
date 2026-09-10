import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function repositoryBase() {
  const repository =
    process.env.GITHUB_REPOSITORY?.split('/').at(-1) ??
    process.env.npm_package_name

  if (!repository || !/^[a-zA-Z0-9._-]+$/.test(repository)) {
    throw new Error('Unable to derive a safe repository name for the Pages base path.')
  }

  return `/${repository}/`
}

export default defineConfig(({ command, isPreview }) => {
  const isProductionBuild = command === 'build' || isPreview

  return {
    base: isProductionBuild ? repositoryBase() : '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/rainwatch.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'RainWatch',
          short_name: 'RainWatch',
          description: 'A focused, animated weather radar viewer.',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#07111f',
          theme_color: '#07111f',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.rainviewer\.com\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/tilecache\.rainviewer\.com\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
  }
})
