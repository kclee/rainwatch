# RainWatch

RainWatch is a small, local-first weather radar web application prototype. Its first milestone answers a focused question:

> What rain is currently around me, and how has it been moving during the past two hours?

The application is being built incrementally as a static client-side web app. Version 0.1a will provide an interactive map, browser geolocation, historical RainViewer radar frames, timeline playback, and radar opacity controls.

## Built through human-AI collaboration

RainWatch is a Codex-assisted project. The project owner defines the goals, constraints, and product decisions and reviews the results; OpenAI Codex assists with implementation, testing, and documentation.

## Documentation

- [`progress.html`](progress.html) is the concise visual project dashboard.
- [`docs/journal/2026-09-10.md`](docs/journal/2026-09-10.md) records implementation details, verification, changed files, and commit subjects.

## Current status

The React, TypeScript, and Vite foundation is complete. RainWatch now displays a responsive MapLibre map with browser geolocation and the newest available historical RainViewer radar frame. The radar timeline, playback, and opacity control have not been implemented yet.

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

Run the linter:

```powershell
npm run lint
```

## Architecture

RainWatch uses:

- React and TypeScript for the interface
- Vite for local development and production builds
- MapLibre GL JS for the interactive map
- The browser Geolocation API for the user's position
- RainViewer as the first radar-data provider

External radar integration will live behind a small provider abstraction under `src/services/radar/`. UI components will consume provider-neutral radar frame data instead of constructing RainViewer URLs directly.

The RainViewer integration is implemented in `src/services/radar/RainViewerRadarProvider.ts`. It reads only the API's historical `radar.past` frames, validates the response, and produces provider-neutral tile templates for the map.

The development basemap is configured in `src/config/map.ts`. It currently uses OpenFreeMap and can be replaced by setting `VITE_BASEMAP_STYLE_URL` without changing the map component.

No backend server, database, authentication system, or API key is required for version 0.1a.

## Known limitations

- The map starts at a general continental United States view until the user explicitly requests location access.
- Location accuracy depends on the browser, device, network, and operating-system location services.
- Only the newest available historical radar frame is displayed.
- Radar opacity is temporarily fixed at 68 percent.
- The timeline, playback, and opacity control remain to be implemented.
- RainViewer data availability and retention determine which historical frames can be shown.

## Planned implementation order

1. Radar timeline
2. Playback controls
3. Opacity control and responsive cleanup
