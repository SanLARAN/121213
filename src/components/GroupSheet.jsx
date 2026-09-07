import { useMemo, useState } from 'react'
import Sheet from './Sheet.jsx'
import { GROUPS } from '../data/groups.js'

export default function GroupSheet({ open, onClose, value, onSelect }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s
      ? GROUPS.filter((g) => [g.code, g.title, g.institute, String(g.course)]
        .join(' ').toLowerCase().includes(s))
      : GROUPS
    const byInstitute = new Map()
    for (const g of list) {
      if (!byInstitute.has(g.institute)) byInstitute.set(g.institute, [])
      byInstitute.get(g.institute).push(g)
    }
    return [...byInstitute.entries()]
  }, [q])

  return (
    <Sheet open={open} onClose={onClose} title="Выбор группы" subtitle="Институт международных отношений, КФУ">
      <div className="search no-drag">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M11 11l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Группа, направление, курс"
          aria-label="Поиск группы"
        />
        {q && (
          <button className="search-clear" onClick={() => setQ('')} aria-label="Очистить">×</button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="empty small">
          <p>Ничего не найдено</p>
          <span>Попробуйте другой запрос — например «04.1»</span>
        </div>
      )}

      {filtered.map(([institute, groups]) => (
        <section className="list-group" key={institute}>
          <h3 className="list-title">{institute}</h3>
          <div className="list">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`row is-tappable ${g.id === value ? 'is-selected' : ''}`}
                onClick={() => { onSelect(g.id); onClose() }}
              >
                <span className="group-code">{g.code}</span>
                <span className="row-main">
                  <span className="row-label">
                    {g.title}
                    {g.demo && <span className="badge subtle inline">демо</span>}
                  </span>
                  <span className="row-sub">{g.course} курс · {g.lessons.length} занятий в расписании</span>
                </span>
                <span className="row-trailing">
                  {g.id === value && (
                    <svg className="check" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                      <path d="M3 10.5l4.5 4.5L17 5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="list-footer">
        Расписание группы 04.1-101 загружено с сайта КФУ. Остальные группы добавлены
        для демонстрации переключения — их данные условные.
      </p>
    </Sheet>
  )
}
