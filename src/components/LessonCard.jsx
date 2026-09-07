import { CATEGORIES } from '../data/groups.js'
import { formatDuration, minutesOf, parseISO, formatDateLong } from '../lib/schedule.js'
import DotNumber from './DotNumber.jsx'

export default function LessonCard({ lesson, status = {}, settings, onClick, index = 0 }) {
  const cat = CATEGORIES[lesson.category] ?? { color: 'var(--accent)', label: '' }
  const isNow = status.state === 'now'
  const isPast = status.state === 'past'
  const dur = minutesOf(lesson.end) - minutesOf(lesson.start)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass lesson ${isNow ? 'is-now' : ''} ${isPast ? 'is-past' : ''} ${settings.compact ? 'is-compact' : ''}`}
      style={{
        '--cat': settings.colorfulCards ? cat.color : 'var(--accent)',
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      <span className="glow" aria-hidden="true" />

      <span className="lesson-head">
        <span className="card-label">
          {lesson.subgroup ? `${lesson.subgroup} подгруппа` : cat.label}
        </span>
        <span className="lesson-tags">
          {lesson.online && <span className="badge online">ЦОР</span>}
          {lesson.parity && <span className="badge">{lesson.parity === 'odd' ? 'неч.' : 'чёт.'}</span>}
          {isNow && <span className="badge live"><i className="dot" /> сейчас</span>}
        </span>
      </span>

      <span className="lesson-time">
        <DotNumber value={lesson.start} size={settings.compact ? 3 : 4} gap={settings.compact ? 1.5 : 2} />
        <span className="lesson-end">→ {lesson.end}</span>
      </span>

      <span className="lesson-title">{lesson.title}</span>

      {!settings.compact && (
        <span className="lesson-meta">
          {settings.showTeacher && lesson.teacher && <span>{lesson.teacher}</span>}
          {settings.showRoom && (
            <span>{[shortBuilding(lesson.building), lesson.room].filter(Boolean).join(' · ')}</span>
          )}
          <span className="dim">{formatDuration(dur)}</span>
          {settings.showPeriod && (
            <span className="dim">
              {formatDateLong(parseISO(lesson.from))} – {formatDateLong(parseISO(lesson.to))}
            </span>
          )}
        </span>
      )}

      {isNow && (
        <span className="lesson-progress">
          <span className="lesson-progress-fill" style={{ width: `${Math.round(status.progress * 100)}%` }} />
          <span className="lesson-progress-label">осталось {formatDuration(status.endsIn)}</span>
        </span>
      )}
    </button>
  )
}

function shortBuilding(b = '') {
  if (b.includes('УНИКС')) return 'УНИКС'
  const m = b.match(/№\s*(\d+)/)
  return m ? `зд. №${m[1]}` : b
}
