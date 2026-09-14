const categories = [
  { label: 'Mostly clear', range: '0–19%', color: '#dbeafe' },
  { label: 'Partly cloudy', range: '20–49%', color: '#93c5fd' },
  { label: 'Mostly cloudy', range: '50–79%', color: '#cbd5e1' },
  { label: 'Overcast', range: '80–100%', color: '#ffffff' },
]

export function CloudCoverLegend() {
  return (
    <div className="cloud-cover-legend" aria-label="Cloud Cover interpretation">
      <p>
        Cloud Cover <span>· model-derived total</span>
      </p>
      <div className="cloud-cover-legend__scale">
        {categories.map((category) => (
          <div className="cloud-cover-legend__item" key={category.label}>
            <span
              className="cloud-cover-legend__swatch"
              style={{ backgroundColor: category.color }}
            />
            <span>
              {category.label} <small>{category.range}</small>
            </span>
          </div>
        ))}
      </div>
      <small>Interpretive categories; values are approximate forecast-model coverage.</small>
    </div>
  )
}
