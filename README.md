# RainWatch

RainWatch is a small, local-first weather radar web application prototype. Its first milestone answers a focused question:

> What rain is currently around me, and how has it been moving during the past two hours?

The application is built incrementally as a static client-side web app. Version 0.2b adds latest NOAA GOES cloud/satellite imagery and Radar, Cloud, and Both map modes to the deployed, installable radar viewer.

## Built through human-AI collaboration

RainWatch is a Codex-assisted project. The project owner defines the goals, constraints, and product decisions and reviews the results; OpenAI Codex assists with implementation, testing, and documentation.

## Documentation

- [`progress.html`](progress.html) is the concise visual project dashboard.
- [`docs/journal/2026-09-12-0.2b.md`](docs/journal/2026-09-12-0.2b.md) records the satellite milestone and its verification.
- [`docs/journal/2026-09-12.md`](docs/journal/2026-09-12.md) records the latest implementation details, verification, changed files, and commit subjects.
- [`docs/journal/2026-09-10.md`](docs/journal/2026-09-10.md) records the 0.1 development history.

## Current status

RainWatch 0.2b (`0.2.0-beta.1`) is implemented. Radar mode preserves the complete 0.2a experience. Cloud mode displays the latest merged NOAA/NESDIS GOES-East and GOES-West GeoColor image. Both mode layers cloud imagery below radar while showing independent timestamps and opacity controls.

## Prerequisites

- Node.js 22.12 or newer
- npm 10 or newer
- A modern web browser

## Development

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Build the production-ready static files:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

The production preview uses the same repository subpath as GitHub Pages. Open `http://localhost:4173/rainwatch/`, not the server root.

Run the linter:

```powershell
npm run lint
```

Regenerate committed PWA icons after changing the source SVG:

```powershell
npm run generate:icons
```

## GitHub Pages deployment

Pushing `main` runs `.github/workflows/deploy-pages.yml`. It installs the locked dependencies, builds RainWatch with the `/rainwatch/` base path, uploads the static artifact, and deploys it through GitHub Pages.

For the first deployment, open the repository's **Settings → Pages** and select **GitHub Actions** under **Build and deployment → Source** if it is not already selected. The expected public URL is:

<https://kclee.github.io/rainwatch/>

The base path is derived from the actual repository/package name rather than duplicated in source paths. Local development remains available at `/`.

## Install on iPhone or iPad

1. Open the deployed HTTPS URL in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**, then **Add**.

RainWatch opens in a standalone window from the Home Screen. The application shell can reopen after it has loaded successfully once, but fresh map tiles, radar frames, satellite imagery, weather metadata, and geolocation behavior still require the browser and network services to be available.

## Architecture

RainWatch uses:

- React and TypeScript for the interface
- Vite for local development and production builds
- `vite-plugin-pwa` and Workbox for the manifest, service worker, and app-shell precache
- MapLibre GL JS for the interactive map
- The browser Geolocation API for the user's position
- RainViewer as the first radar-data provider
- NOAA/NESDIS `Most_Recent_MERGEDGC` as the cloud/satellite provider

External radar integration will live behind a small provider abstraction under `src/services/radar/`. UI components will consume provider-neutral radar frame data instead of constructing RainViewer URLs directly.

The RainViewer integration is implemented in `src/services/radar/RainViewerRadarProvider.ts`. It reads only the API's historical `radar.past` frames, validates the response, and produces provider-neutral tile templates for the map.

The NOAA integration is isolated in `src/services/cloud/NoaaGoesCloudProvider.ts`. It reads the latest image record from the official [`Most_Recent_MERGEDGC` ImageServer](https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/Most_Recent_MERGEDGC/ImageServer), then builds a viewport-sized Web Mercator `exportImage` request for MapLibre. Requests are capped at 1600 × 1200 pixels and 1.5× pixel density and occur only when cloud imagery is visible, refreshed, resized, or the map finishes moving.

The development basemap is configured in `src/config/map.ts`. It currently uses OpenFreeMap and can be replaced by setting `VITE_BASEMAP_STYLE_URL` without changing the map component.

MapLibre's module worker is bundled explicitly through Vite so vector roads, boundaries, and place labels work in both development and the production GitHub Pages build.

No backend server, database, authentication system, or API key is required for version 0.2b.

## Known limitations

- The map starts at a general continental United States view until the user explicitly requests location access.
- Location accuracy depends on the browser, device, network, and operating-system location services.
- The timeline is limited to the historical frames currently returned by RainViewer, typically approximately two hours.
- Playback advances every 800 milliseconds and loops from the newest frame to the oldest.
- Radar opacity defaults to 70 percent and can be adjusted from fully transparent to fully opaque.
- RainViewer data availability and retention determine which historical frames can be shown.
- The intensity legend is a compact visual guide to RainViewer's Universal Blue reflectivity palette; it does not convert colors into exact rainfall rates.
- Radar is marked delayed when the newest frame is at least 30 minutes old. This threshold represents roughly three missed updates at RainViewer's current typical cadence and may need adjustment if that cadence changes.
- Manual refresh updates radar metadata. A failed refresh keeps already-loaded frames visible and labels them as the last available data; an empty successful response removes the radar overlay.
- NOAA GeoColor is satellite imagery rather than an exact cloud-cover percentage. It uses visible-color information by day and infrared/multispectral rendering at night, so its appearance changes after dark.
- NOAA's latest merged image normally advances about every ten minutes. RainWatch warns when the image timestamp is at least 35 minutes old, allowing for slower scans and ordinary publication delay.
- Radar and satellite observations have separate timestamps and are not synchronized.
- Cloud imagery is a single latest image in 0.2b; cloud history and cloud animation are intentionally deferred.
- The NOAA service extends to approximately 76° north and south; polar areas and views crossing the antimeridian are not a focus of this milestone.
- Map and radar imagery require internet access even though the application has no backend.
- Offline support is deliberately limited to the application shell. Live NOAA imagery, RainViewer metadata and radar imagery, OpenFreeMap tiles, and geolocation are not cached by RainWatch.
- iOS does not show a universal automatic install prompt; installation uses Safari's **Add to Home Screen** action.
- Browser geolocation normally requires localhost or HTTPS and still needs a manual permission-granted acceptance check.
- Vite reports a bundle-size advisory because MapLibre and its worker are substantial browser dependencies.

## Next milestone

Version 0.2b is deployed on GitHub Pages. Pause for product review before defining the next bounded milestone.
