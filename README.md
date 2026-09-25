# RainWatch

RainWatch is a small, local-first weather radar web application prototype. Its first milestone answers a focused question:

> What rain is currently around me, and how has it been moving during the past two hours?

The application is built incrementally as a static client-side web app. Version 0.3a makes Radar the only visible primary mode and adds a compact, browser-side Rain Nearby analysis while preserving the hidden Satellite, Cloud Cover, Smooth Cloud, combined-mode, and Wind implementations for later work.

## Built through human-AI collaboration

RainWatch is a Codex-assisted project. The project owner defines the goals, constraints, and product decisions and reviews the results; OpenAI Codex assists with implementation, testing, and documentation.

## Documentation

- [`progress.html`](progress.html) is the concise visual project dashboard.
- [`docs/journal/2026-09-25-0.3a.md`](docs/journal/2026-09-25-0.3a.md) records the Radar-first interface, Rain Nearby technique, performance, and verification.
- [`docs/journal/2026-09-18-0.2g.md`](docs/journal/2026-09-18-0.2g.md) records bounded Satellite retries, last-available behavior, paused experiment controls, and verification.
- [`docs/journal/2026-09-18-0.2f.md`](docs/journal/2026-09-18-0.2f.md) records combined timestamp matching, bandwidth, failure handling, and verification.
- [`docs/journal/2026-09-17-0.2e.md`](docs/journal/2026-09-17-0.2e.md) records the historical satellite-animation milestone, bandwidth measurements, and verification.
- [`docs/journal/2026-09-17-0.2d.md`](docs/journal/2026-09-17-0.2d.md) records the current surface-wind milestone and its verification.
- [`docs/journal/2026-09-17-0.2c3.md`](docs/journal/2026-09-17-0.2c3.md) records the integrated Smooth Cloud usability trial and its verification.
- [`docs/journal/2026-09-17-open-meteo-map-spike.md`](docs/journal/2026-09-17-open-meteo-map-spike.md) evaluates Open-Meteo's official spatial Weather Map Layer without changing production Cloud Cover.
- [`docs/journal/2026-09-14-cloud-density-experiment.md`](docs/journal/2026-09-14-cloud-density-experiment.md) records the 7 × 7 through 21 × 21 Cloud Cover density evaluation.
- [`docs/journal/2026-09-14-0.2c.md`](docs/journal/2026-09-14-0.2c.md) records the model Cloud Cover milestone and its verification.
- [`docs/journal/2026-09-12-0.2b.md`](docs/journal/2026-09-12-0.2b.md) records the satellite milestone and its verification.
- [`docs/journal/2026-09-12.md`](docs/journal/2026-09-12.md) records the latest implementation details, verification, changed files, and commit subjects.
- [`docs/journal/2026-09-10.md`](docs/journal/2026-09-10.md) records the 0.1 development history.

## Current status

RainWatch 0.3a (`0.3.0-alpha.1`) is implemented and deployed. Radar is the only visible mode; one central feature configuration hides Satellite, both Cloud Cover experiments, Radar + Satellite, and Wind without deleting their source or tests. Stored hidden modes safely normalize to Radar.

Rain Nearby analyzes a single coordinate-centered, 512-pixel RainViewer tile for each of the five newest historical frames plus one coverage mask. The latest frame reports a conservative weak, moderate, or strong Universal Blue radar return at the approximate target, or the nearest return's direction and approximate distance within 100 miles. Recent nearest-distance changes produce only conservative approaching, moving-away, unclear, or unavailable wording. It does not calculate an ETA or forecast.

Radar, Satellite, and Radar + Satellite remain active. Cloud Cover and Smooth Cloud · Lab stay visible but are disabled and labelled as paused. Their providers, hooks, UI, tests, documentation, and research artifacts remain in the repository; a stored paused mode safely falls back to Radar.

Live verification found both providers publishing at ten-minute intervals, with overlapping NOAA archive records ending at `:09/:19/...` and RainViewer records at `:10/:20/...`; normal matches were therefore one minute apart. RainWatch treats five minutes or less as Close, six through fifteen minutes as Moderate, and more than fifteen minutes as Large. Fifteen minutes is the configurable acceptable-match ceiling: it tolerates one missing/offset publication but not two. Equal-distance matches deterministically choose the earlier observation.

A post-0.2c density experiment compared 7 × 7, 11 × 11, 15 × 15, and 21 × 21 without interpolation. All four can return in one request when coordinate commas remain literal, but 21 × 21 roughly doubles the measured 15 × 15 response for only a modest visual improvement. Sampling alone did not remove the checkerboard effect, so the deployed/default 5 × 5 / 7 × 7 behavior remains unchanged pending a separately authorized smoothing experiment.

A later research spike confirmed that Open-Meteo's official Weather Map Layer can render smooth HRRR `cloud_cover` directly in MapLibre through partial `.om` file reads. Version 0.2c3 integrates that path as a removable, non-default lab mode. It is visually much clearer, but the package is pre-1.0, requires a GPL-2.0 licensing decision, is limited to the HRRR continental-U.S. footprint, and used about 264 KiB regionally and 1.0 MiB nationally in the measured runs. The sampled Cloud Cover mode remains the lighter global option. The original standalone experiment remains at [`public/experiments/open-meteo-cloud-map.html`](public/experiments/open-meteo-cloud-map.html).

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
- Browser-side Universal Blue Radar analysis for target overlap, nearest precipitation, and recent trend
- NOAA/NESDIS `Most_Recent_MERGEDGC` and `MERGEDGC_Last_24hr` as the latest and historical satellite providers
- Open-Meteo Best Match forecast models as the Total Cloud Cover provider
- Open-Meteo Weather Map Layer 0.1.1 with NOAA HRRR CONUS as the experimental smooth Cloud Cover provider
- Open-Meteo Best Match current conditions as the 10 m surface-wind provider

External radar integration will live behind a small provider abstraction under `src/services/radar/`. UI components will consume provider-neutral radar frame data instead of constructing RainViewer URLs directly.

The RainViewer integration is implemented in `src/services/radar/RainViewerRadarProvider.ts`. It reads only the API's historical `radar.past` frames, validates the response, and produces provider-neutral tile templates for the map.

The NOAA integration is isolated under `src/services/cloud/`. `NoaaGoesCloudProvider.ts` reads the current record from the official [`Most_Recent_MERGEDGC` ImageServer](https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/Most_Recent_MERGEDGC/ImageServer). `NoaaGoesArchiveProvider.ts` queries actual `end_time` records from the official [`MERGEDGC_Last_24hr` ImageServer](https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/MERGEDGC_Last_24hr/ImageServer), orders them chronologically, and retains up to three recent hours with a 20-frame safety cap. Both providers use the same viewport-sized Web Mercator `exportImage` builder. Requests are capped at 1600 × 1200 pixels and 1.5× pixel density.

Combined matching lives in `src/utils/frameMatching.ts`, outside providers and JSX. Satellite supplies the target timestamp; the utility compares all valid Radar timestamps and returns the smallest absolute difference. If an equal-distance tie occurs, the earlier observation wins. Satellite frames outside Radar's available window do not display a Radar layer when the nearest candidate exceeds the 15-minute ceiling. Inside the comparison window, a larger gap may still be shown with an explicit Large difference warning rather than being called synchronized.

Opening Satellite mode downloads archive metadata and only the selected image. Frames are requested lazily as the user selects them or playback reaches them; opacity changes do not request a replacement. Archive image URLs use a 40-entry, 24-hour CacheFirst PWA runtime cache, so a previously loaded frame/viewport can be reused during a loop. A map pan changes the viewport and therefore requires one new image for the selected frame. If the archive is unavailable, RainWatch keeps the current-image provider as a visible fallback. A failed individual archive image is marked so playback can skip it.

Latest and archive metadata use the same bounded reliability policy: two automatic retries after 750 ms and 1.5 seconds, with a 12-second timeout per attempt. HTTP 408, 429, and 5xx responses are retryable; other 4xx responses and explicit permanent provider errors are not. Map image rendering receives one retry after one second. Debug warnings retain the failure category, while user messages remain compact. Manual Refresh starts a new bounded attempt.

In the 2026-09-17 whole-USA desktop measurement, archive metadata was 4,457 bytes and the selected frame was 1,220,441 bytes (about 1.16 MiB). The 19-frame, three-hour window totaled 25,220,500 image bytes plus metadata (about 24.06 MiB) only after every frame had been viewed. Individual frames ranged from 1,220,441 to 1,367,006 bytes. One representative pan added 1,361,804 bytes (about 1.30 MiB) for the selected frame. These figures vary with viewport size, device pixel ratio, image content, and current frame cadence.

The 2026-09-18 combined-mode measurement used the same default whole-USA extent. Entering Radar + Satellite from Satellite added 10 Radar tiles totaling 97,188 bytes (about 95 KiB). Three additional matched frames added 294,550 bytes (about 96 KiB each). One full 18-frame Satellite loop had 12 Radar matches and six older Satellite-only frames; the 120 unique matched Radar tiles totaled 1,177,347 bytes (about 1.12 MiB) beyond standalone Satellite playback. Revisited Radar tile URLs completed in roughly 3–7 ms in the test browser; RainViewer supplied a two-day browser cache lifetime, while RainWatch's service-worker strategy remained unchanged and network-only for Radar.

The Open-Meteo integration is isolated under `src/services/cloudCover/`. It calls the official [`/v1/forecast`](https://open-meteo.com/en/docs) endpoint with `current=cloud_cover`, comma-separated latitude and longitude lists, Unix timestamps, and GMT. The generic API's automatic Best Match selects the highest-resolution suitable forecast models by location; a single viewport may therefore use different underlying regional models. RainWatch does not claim that these values are direct satellite measurements.

Cloud Cover uses a 5 × 5 grid below zoom 5 and a 7 × 7 grid at regional/local zooms. One cell represents each sampled model value; RainWatch deliberately does not interpolate between points or imply street-level precision. The grid extends slightly beyond the viewport, small moves are ignored, meaningful completed moves are debounced, and up to 49 coordinates fit in one Open-Meteo request. Results are reused in memory for ten minutes when the same sampled viewport is revisited. The displayed model-valid time and RainWatch's fetch time remain separate.

For the documented density experiment only, `?cloudGrid=7`, `11`, `15`, or `21` fixes the grid dimensions for that page load. Unsupported values are ignored. This is a developer test mechanism, not a permanent user setting.

Smooth Cloud · Lab dynamically loads `@openmeteo/weather-map-layer` 0.1.1 only when selected. It registers the official `om://` MapLibre protocol and requests the NOAA HRRR CONUS `cloud_cover` field for the next valid hour with linear interpolation and color blending. The official model footprint controls availability; outside that footprint RainWatch removes the raster and explains the continental-U.S. limitation. The mode has independent opacity, refresh, valid-time, loading, error, legend, and attribution UI. Its engine and WebAssembly reader are excluded from the PWA app-shell precache, and live Open-Meteo metadata and `.om` ranges remain network-only.

The Wind integration is isolated under `src/services/wind/` and requests `wind_speed_10m`, `wind_direction_10m`, and `wind_gusts_10m` from Open-Meteo's `/v1/forecast` current conditions in mph. Wind direction is meteorological—the direction air comes from—so RainWatch adds 180 degrees for the movement arrow and destination label. A 270-degree reading therefore displays as `W → E` with an east-pointing arrow. The card uses the user location only while it is inside the current viewport; otherwise it explicitly uses map center. Completed target movements of at least 25 km can refresh the value, results are reused in memory for ten minutes, and manual Wind refresh remains separate from layer refresh controls.

The development basemap is configured in `src/config/map.ts`. It currently uses OpenFreeMap and can be replaced by setting `VITE_BASEMAP_STYLE_URL` without changing the map component.

MapLibre's module worker is bundled explicitly through Vite so vector roads, boundaries, and place labels work in both development and the production GitHub Pages build.

No backend server, database, authentication system, or API key is required for version 0.2g.

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
- Satellite retry delays are deliberately short and bounded. A prolonged NOAA outage still requires manual Refresh later; RainWatch does not poll or retry forever.
- Cloud Cover and Smooth Cloud · Lab are temporarily disabled in the selector. Their retained experimental implementations are not part of the active 0.2g product surface.
- NOAA GeoColor is satellite imagery rather than an exact cloud-cover percentage. It uses visible-color information by day and infrared/multispectral rendering at night, so its appearance changes after dark.
- Open-Meteo Cloud Cover is forecast-model output rather than observed satellite imagery. The current value is represented at a 15-minute interval; outside supported 15-minute model regions it may be interpolated from hourly data.
- Open-Meteo Best Match is globally available and may combine different regional models. The generic response does not identify one fixed model name for every sampled point.
- Cloud Cover is shown as soft sampled cells. The 0–19, 20–49, 50–79, and 80–100 percent labels are RainWatch interpretation categories, not provider-defined meteorological thresholds.
- Cloud Cover is marked delayed when its represented model time is at least 45 minutes old. Underlying model runs update on provider/model-specific schedules, commonly every one to six hours.
- A typical Cloud Cover request contains 25 or 49 coordinates in one HTTP request. Browser measurements were approximately 8 KB and 16 KB respectively, excluding the basemap.
- Smooth Cloud · Lab is limited to the NOAA HRRR CONUS footprint. It is not a global replacement; sampled Cloud Cover remains available elsewhere.
- Smooth Cloud is a next-hour HRRR forecast field, not direct satellite observation. Its valid time and load time are separate from sampled Cloud Cover, Satellite, and Radar timestamps.
- The experimental mode is materially heavier. Research measurements were about 264 KiB regionally and 1.0 MiB for a fresh whole-USA weather view, plus a one-time lazy engine/WebAssembly download.
- `@openmeteo/weather-map-layer` is pinned to the pre-1.0 version 0.1.1 and currently declares GPL-2.0. Its long-term product and licensing suitability has not been decided. Required Open-Meteo attribution remains visible.
- Wind is model-derived 10 m surface wind rather than a local weather-station observation. Terrain, buildings, and exposure can make actual wind differ from the model grid point.
- Wind direction describes where air comes from; the displayed arrow points where it moves. Surface wind may differ substantially from cloud and precipitation motion aloft.
- Wind is marked stale at 45 minutes—three expected 15-minute current-condition intervals. The card has no automatic background polling and uses a ten-minute memory cache plus meaningful 25 km movement threshold.
- NOAA's latest merged image normally advances about every ten minutes. RainWatch warns when the image timestamp is at least 35 minutes old, allowing for slower scans and ordinary publication delay.
- NOAA describes the rolling archive cadence as 10 or 15 minutes depending on scan mode. RainWatch uses the records actually returned rather than manufacturing expected timestamps; a three-hour window therefore has a variable frame count.
- Radar and satellite observations have separate timestamps and are not synchronized.
- Radar + Satellite matches observation timestamps but does not synchronize sensors or make the products meteorologically equivalent. Radar measures reflected precipitation energy; GeoColor Satellite shows a multispectral cloud/land view.
- The Satellite archive spans about three hours while RainViewer exposes about two hours. Older Satellite frames can therefore have no acceptable Radar counterpart and intentionally display Satellite alone.
- The NOAA service extends to approximately 76° north and south; polar areas and views crossing the antimeridian are not a focus of this milestone.
- Map and radar imagery require internet access even though the application has no backend.
- Offline support remains deliberately limited. The application shell and previously viewed historical satellite frame/viewport URLs can be reused, but fresh NOAA metadata/current imagery, both Open-Meteo Cloud Cover sources, RainViewer metadata and radar imagery, OpenFreeMap tiles, and geolocation still need their respective browser/network services. The experimental Smooth Cloud engine is loaded only on demand.
- iOS does not show a universal automatic install prompt; installation uses Safari's **Add to Home Screen** action.
- Browser geolocation normally requires localhost or HTTPS and still needs a manual permission-granted acceptance check.
- Vite reports a bundle-size advisory because MapLibre and its worker are substantial browser dependencies.

## Next milestone

Pause for real-device use and product review. Validate the installed iPhone PWA, real location, and combined playback on a physical device. Motion vectors, cloud tracking, precipitation forecasts, and rain/cloud ETA remain deferred until explicitly requested.
