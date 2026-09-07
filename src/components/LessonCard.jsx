import { CATEGORIES } from '../data/groups.js'
import { formatDuration, parseISO, formatDateLong } from '../lib/schedule.js'

export default function LessonCard({ lesson, status = {}, settings, onClick, index = 0 }) {
  const cat = CATEGORIES[lesson.category] ?? { color: 'var(--accent)', label: '' }
  const isNow = status.state === 'now'
  const isPast = status.state === 'past'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card lesson ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''} ${settings.compact ? 'is-compact' : ''}`}
      style={{
        '--cat': settings.colorfulCards ? cat.color : 'var(--accent)',
        animationDelay: `${Math.min(index, 8) * 32}ms`,
      }}
    >
      <span className="lesson-time">
        <span className="t-start">{lesson.start}</span>
        <span className="t-end">{lesson.end}</span>
      </span>

      <span className="lesson-rail"><span className="lesson-rail-fill" /></span>

      <span className="lesson-main">
        <span className="lesson-top">
          <span className="lesson-title">{lesson.title}</span>
          {isNow && (
            <span className="badge live">
              <span className="dot" /> Сейчас
            </span>
          )}
        </span>

        {!settings.compact && (
          <span className="lesson-meta">
            {settings.showTeacher && lesson.teacher && (
              <span className="meta-item">
                <IconPerson />
                {lesson.teacher}
              </span>
            )}
            {settings.showRoom && (
              <span className="meta-item">
                <IconPin />
                {[shortBuilding(lesson.building), lesson.room].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
        )}

        <span className="lesson-badges">
          {lesson.subgroup && <span className="badge">{lesson.subgroup} подгруппа</span>}
          {lesson.parity && <span className="badge">{lesson.parity === 'odd' ? 'неч. неделя' : 'чёт. неделя'}</span>}
          {lesson.online && <span className="badge online">ЦОР</span>}
          {settings.compact && settings.showRoom && lesson.room && <span className="badge">{lesson.room}</span>}
          {settings.showPeriod && (
            <span className="badge subtle">
              {formatDateLong(parseISO(lesson.from))} – {formatDateLong(parseISO(lesson.to))}
            </span>
          )}
        </span>

        {isNow && (
          <span className="progress">
            <span className="progress-fill" style={{ width: `${Math.round(status.progress * 100)}%` }} />
            <span className="progress-label">осталось {formatDuration(status.endsIn)}</span>
          </span>
        )}
      </span>

      <svg className="chevron lesson-chevron" viewBox="0 0 12 20" width="8" height="13" aria-hidden="true">
        <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function shortBuilding(b = '') {
  if (b.includes('УНИКС')) return 'УНИКС'
  const m = b.match(/№\s*(\d+)/)
  return m ? `Здание №${m[1]}` : b
}

function IconPerson() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <circle cx="8" cy="5" r="3" fill="currentColor" />
      <path d="M2.5 14c.6-3 2.9-4.5 5.5-4.5s4.9 1.5 5.5 4.5z" fill="currentColor" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path d="M8 1.5c2.5 0 4.5 2 4.5 4.5 0 3.2-4.5 8.5-4.5 8.5S3.5 9.2 3.5 6c0-2.5 2-4.5 4.5-4.5z" fill="currentColor" />
      <circle cx="8" cy="6" r="1.7" fill="var(--card-bg)" />
    </svg>
  )
}
