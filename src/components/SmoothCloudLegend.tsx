export function SmoothCloudLegend() {
  return (
    <div className="smooth-cloud-legend" aria-label="Smooth Cloud interpretation">
      <p>
        Smooth Cloud <span>· Experimental</span>
      </p>
      <div className="smooth-cloud-legend__bar" />
      <div className="smooth-cloud-legend__scale">
        <span>0% clear</span>
        <span>50%</span>
        <span>100% overcast</span>
      </div>
      <small>HRRR model field · linearly interpolated by Open-Meteo</small>
    </div>
  )
}
