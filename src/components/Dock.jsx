const ITEMS = [
  {
    id: 'day', label: 'День',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M10 5.6V10l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
    ),
  },
  {
    id: 'week', label: 'Неделя',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18"><rect x="3" y="4.5" width="14" height="12.5" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M3 8.5h14M7 3v3M13 3v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
    ),
  },
  {
    id: 'stats', label: 'Сводка',
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18"><path d="M4 15V9M10 15V4.5M16 15v-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
    ),
  },
]

export default function Dock({ view, onView, onSettings }) {
  return (
    <nav className="dock">
      <div className="dock-pill glass">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            className={`dock-item ${view === it.id ? 'is-active' : ''}`}
            onClick={() => onView(it.id)}
            aria-label={it.label}
            aria-current={view === it.id}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
      </div>
      <button className="dock-gear glass" onClick={onSettings} aria-label="Настройки">
        <svg viewBox="0 0 20 20" width="17" height="17">
          <path d="M8.3 2.6h3.4l.4 2a6 6 0 011.6.9l1.9-.7 1.7 3-1.5 1.3a6 6 0 010 1.8l1.5 1.3-1.7 3-1.9-.7a6 6 0 01-1.6.9l-.4 2H8.3l-.4-2a6 6 0 01-1.6-.9l-1.9.7-1.7-3 1.5-1.3a6 6 0 010-1.8L2.7 7.8l1.7-3 1.9.7a6 6 0 011.6-.9z"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="10" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </nav>
  )
}
