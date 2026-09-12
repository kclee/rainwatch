import type { RadarPalette } from '../types/weather'

interface RadarLegendProps {
  palette: RadarPalette
}

export function RadarLegend({ palette }: RadarLegendProps) {
  return (
    <aside className="radar-legend" aria-label="Radar intensity legend">
      <p>
        Radar intensity <span>· {palette.name}</span>
      </p>
      <div className="radar-legend__scale">
        {palette.items.map((item) => (
          <div className="radar-legend__item" key={item.label}>
            <span
              className="radar-legend__swatch"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <small>{palette.note}</small>
    </aside>
  )
}
