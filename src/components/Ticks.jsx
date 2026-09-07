/** Шкалы из штрихов с жёлтым маркером — как на референсе. */

export function TickBar({ value = 0, ticks = 34, marker = true, label, sub }) {
  const v = Math.max(0, Math.min(1, value))
  const activeCount = Math.round(v * ticks)
  return (
    <div className="tickbar">
      <div className="tickbar-track" aria-hidden="true">
        {Array.from({ length: ticks }).map((_, i) => (
          <span key={i} className={`tick ${i < activeCount ? 'is-on' : ''}`} />
        ))}
      </div>
      {marker && (
        <span className="tick-marker" style={{ left: `${v * 100}%` }} aria-hidden="true">
          <svg viewBox="0 0 12 8" width="11" height="7"><path d="M6 8L0 0h12z" fill="currentColor" /></svg>
        </span>
      )}
      {(label || sub) && (
        <div className="tickbar-legend">
          <span>{label}</span>
          <span>{sub}</span>
        </div>
      )}
    </div>
  )
}

/** Вертикальная «лесенка» штрихов (как в карточке Activity). */
export function TickColumn({ value = 0.5, ticks = 22 }) {
  const v = Math.max(0, Math.min(1, value))
  const idx = Math.round((1 - v) * (ticks - 1))
  return (
    <div className="tickcol" aria-hidden="true">
      <div className="tickcol-rows">
        {Array.from({ length: ticks }).map((_, i) => (
          <span
            key={i}
            className={`tickcol-row ${i === idx ? 'is-mark' : ''}`}
            style={{ width: `${28 + Math.abs(Math.sin((i / ticks) * Math.PI)) * 44}%` }}
          />
        ))}
      </div>
      <span className="tickcol-marker" style={{ top: `${(idx / (ticks - 1)) * 100}%` }}>
        <svg viewBox="0 0 8 12" width="7" height="10"><path d="M8 6L0 0v12z" fill="currentColor" /></svg>
      </span>
    </div>
  )
}
