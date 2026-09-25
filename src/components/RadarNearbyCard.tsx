import type { RadarNearbyState } from '../hooks/useRadarNearby'

interface RadarNearbyCardProps {
  state: RadarNearbyState
  targetSource: 'user-location' | 'map-center'
}

function trendLabel(trend: NonNullable<RadarNearbyState['analysis']>['trend']) {
  if (trend === 'approaching') return 'Appears to be approaching'
  if (trend === 'moving-away') return 'Appears to be moving away'
  if (trend === 'unclear') return 'Trend unclear'
  return 'Movement unavailable'
}

export function RadarNearbyCard({ state, targetSource }: RadarNearbyCardProps) {
  const targetLabel = targetSource === 'user-location' ? 'Near you' : 'At map center'
  let content = <p>Waiting for Radar data…</p>

  if (state.status === 'loading') {
    content = <p>Checking recent Radar…</p>
  } else if (state.status === 'error') {
    content = (
      <>
        <strong>Analysis unavailable</strong>
        <p>Map Radar remains available.</p>
      </>
    )
  } else if (state.status === 'ready') {
    const { latest, coverageAvailable, trend } = state.analysis
    if (!coverageAvailable) {
      content = (
        <>
          <strong>Radar coverage unavailable here</strong>
          <p>Try moving the map center.</p>
        </>
      )
    } else if (latest.atLocation) {
      content = (
        <>
          <strong>Precipitation over your {targetSource === 'user-location' ? 'area' : 'map center'}</strong>
          <p>{latest.atLocation[0].toUpperCase() + latest.atLocation.slice(1)} radar return</p>
          <small>{trendLabel(trend)}</small>
        </>
      )
    } else if (latest.nearestDistanceMiles !== null && latest.nearestDirection) {
      content = (
        <>
          <strong>No rain at your {targetSource === 'user-location' ? 'area' : 'map center'}</strong>
          <p>Nearest · {latest.nearestDirection} · ~{Math.max(1, Math.round(latest.nearestDistanceMiles))} mi</p>
          <small>{trendLabel(trend)}</small>
        </>
      )
    } else {
      content = (
        <>
          <strong>No nearby rain detected</strong>
          <p>in available Radar within ~100 mi</p>
          <small>{trendLabel(trend)}</small>
        </>
      )
    }
  }

  return (
    <aside
      className="radar-nearby-card"
      aria-live="polite"
      data-status={state.status}
      data-analysis-requests={state.analysis?.requestCount}
      data-analysis-bytes={state.analysis?.responseBytes}
      data-analysis-ms={state.analysis?.durationMs}
      data-analysis-frames={state.analysis?.analyzedFrameCount}
    >
      <span>Rain Nearby · {targetLabel}</span>
      {content}
    </aside>
  )
}
