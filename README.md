# RainWatch

RainWatch is a small, local-first weather radar web application prototype. Its first milestone answers a focused question:

> What rain is currently around me, and how has it been moving during the past two hours?

The application is being built incrementally as a static client-side web app. Version 0.1a will provide an interactive map, browser geolocation, historical RainViewer radar frames, timeline playback, and radar opacity controls.

## Current status

This initial commit contains the React, TypeScript, and Vite foundation. Radar and mapping features have not been implemented yet.

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
- MapLibre GL JS for the interactive map (planned)
- The browser Geolocation API for the user's position (planned)
- RainViewer as the first radar-data provider (planned)

External radar integration will live behind a small provider abstraction under `src/services/radar/`. UI components will consume provider-neutral radar frame data instead of constructing RainViewer URLs directly.

No backend server, database, authentication system, or API key is required for version 0.1a.

## Known limitations

- The current page is only a project-ready placeholder.
- The map, location handling, radar layer, timeline, playback, and opacity control remain to be implemented.
- RainViewer data availability and retention determine which historical frames can be shown.

## Planned implementation order

1. Interactive map
2. Browser geolocation
3. One RainViewer radar frame
4. Radar timeline
5. Playback controls
6. Opacity control and responsive cleanup
