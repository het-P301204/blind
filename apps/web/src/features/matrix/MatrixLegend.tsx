const LEGEND_ITEMS = [
  { color: '#292722', label: 'No Coverage', border: false },
  { color: '#4A3D1A', label: 'Limited', border: false },
  { color: '#5C480F', label: 'Partial', border: false },
  { color: '#7A4020', label: 'Strong', border: false },
  { color: '#292722', label: 'Unknown', border: true },
] as const

export default function MatrixLegend() {
  return (
    <div className="border-t border-border bg-graphite px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      {/* Color swatches */}
      <div className="flex items-center gap-5 flex-wrap">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{
                backgroundColor: item.color,
                border: item.border ? '1px solid #B8B1A2' : '1px solid rgba(255,255,255,0.06)',
              }}
            />
            <span className="text-[11px] text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted/70 italic leading-relaxed sm:ml-auto max-w-xs sm:text-right hidden sm:block">
        Scores reflect mapped Sigma rule coverage — not empirical detection effectiveness.
      </p>
    </div>
  )
}
