import Sheet from './Sheet.jsx'
import { CATEGORIES } from '../data/groups.js'
import {
  DAY_NAMES, formatDateLong, formatDuration, minutesOf, parseISO, toISO,
} from '../lib/schedule.js'

export default function LessonSheet({ item, onClose }) {
  const open = Boolean(item)
  const lesson = item?.lesson
  const date = item?.date
  const cat = lesson ? CATEGORIES[lesson.category] : null

  const addToCalendar = () => {
    if (!lesson || !date) return
    const p = (n) => String(n).padStart(2, '0')
    const stamp = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number)
      return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(h)}${p(m)}00`
    }
    const text = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Расписание//KPFU//RU', 'BEGIN:VEVENT',
      `UID:${lesson.id}-${toISO(date)}@raspisanie`,
      `DTSTART:${stamp(lesson.start)}`,
      `DTEND:${stamp(lesson.end)}`,
      `SUMMARY:${lesson.title}`,
      `LOCATION:${[lesson.building, lesson.room].filter(Boolean).join(', ')}`,
      `DESCRIPTION:${lesson.teacher || ''}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${lesson.title}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={lesson?.title || ''}
      subtitle={date ? `${DAY_NAMES[date.getDay()]}, ${formatDateLong(date)}` : ''}
    >
      {lesson && (
        <>
          <div className="detail-hero" style={{ '--cat': cat?.color || 'var(--accent)' }}>
            <div className="detail-time">
              <b>{lesson.start}</b>
              <span>—</span>
              <b>{lesson.end}</b>
            </div>
            <div className="detail-dur">
              {formatDuration(minutesOf(lesson.end) - minutesOf(lesson.start))} · {cat?.label}
            </div>
          </div>

          <div className="list">
            {lesson.teacher && <DetailRow label="Преподаватель" value={lesson.teacher} />}
            <DetailRow label="Место" value={[lesson.building, lesson.room].filter(Boolean).join(', ')} />
            <DetailRow label="Подгруппа" value={lesson.subgroup ? `${lesson.subgroup}-я` : 'вся группа'} />
            <DetailRow
              label="Периодичность"
              value={lesson.parity ? (lesson.parity === 'odd' ? 'по нечётным неделям' : 'по чётным неделям') : 'каждую неделю'}
            />
            <DetailRow
              label="Период"
              value={`${formatDateLong(parseISO(lesson.from))} – ${formatDateLong(parseISO(lesson.to))} ${parseISO(lesson.to).getFullYear()}`}
            />
            {lesson.except?.map(([a, b]) => (
              <DetailRow key={a} label="Исключение" value={`${formatDateLong(parseISO(a))} – ${formatDateLong(parseISO(b))}`} />
            ))}
            {lesson.note && <DetailRow label="Примечание" value={lesson.note} />}
          </div>

          <div className="detail-actions">
            <button className="btn primary" onClick={addToCalendar}>Добавить в календарь</button>
            <a
              className="btn"
              href={`https://yandex.ru/maps/?text=${encodeURIComponent(`Казань КФУ ${lesson.building}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Показать на карте
            </a>
          </div>
        </>
      )}
    </Sheet>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="row">
      <span className="row-main"><span className="row-label">{label}</span></span>
      <span className="row-trailing"><span className="row-value wrap">{value}</span></span>
    </div>
  )
}
