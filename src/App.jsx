import { useEffect, useMemo, useRef, useState } from 'react'
import { GROUPS, SEMESTER } from './data/groups.js'
import { useSettings } from './hooks/useSettings.js'
import Segmented from './components/Segmented.jsx'
import LessonCard from './components/LessonCard.jsx'
import GroupSheet from './components/GroupSheet.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import LessonSheet from './components/LessonSheet.jsx'
import {
  DAY_NAMES, DAY_SHORT, MONTHS_NOM, addDays, findNextLesson, formatDateLong, formatDuration,
  isSemester, lessonStatus, lessonsForDate, minutesOf, mondayOf, parityLabel, relativeDayLabel,
  sameDay, startOfDay, weekDates, weekNumber, weekParity,
} from './lib/schedule.js'

export default function App() {
  const { settings, update, reset } = useSettings()
  const [now, setNow] = useState(() => new Date())
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState('day')
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [dir, setDir] = useState(1)
  const touch = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000)
    return () => clearInterval(t)
  }, [])

  const group = useMemo(
    () => GROUPS.find((g) => g.id === settings.groupId) ?? GROUPS[0],
    [settings.groupId],
  )

  const dayLessons = useMemo(
    () => lessonsForDate(group, selected, settings),
    [group, selected, settings],
  )

  const week = useMemo(() => weekDates(selected), [selected])
  const weekLessons = useMemo(
    () => week.map((d) => ({ date: d, lessons: lessonsForDate(group, d, settings) })),
    [week, group, settings],
  )
  const weekCounts = useMemo(
    () => week.map((d) => lessonsForDate(group, d, settings).length),
    [week, group, settings],
  )

  const next = useMemo(
    () => findNextLesson(group, now, settings),
    [group, now, settings],
  )

  const isToday = sameDay(selected, now)
  const parity = weekParity(selected, settings.firstWeekParity)
  const wNum = weekNumber(selected)

  const go = (days) => {
    setDir(days > 0 ? 1 : -1)
    setSelected((d) => addDays(d, days))
  }
  const goToday = () => {
    const t = startOfDay(new Date())
    setDir(t > selected ? 1 : -1)
    setSelected(t)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (groupsOpen || settingsOpen || detail) return
      if (e.target.closest?.('input')) return
      const step = view === 'week' ? 7 : 1
      if (e.key === 'ArrowLeft') go(-step)
      else if (e.key === 'ArrowRight') go(step)
      else if (e.key === 't' || e.key === 'е') goToday()
      else if (e.key === 'w' || e.key === 'ц') setView((v) => (v === 'day' ? 'week' : 'day'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // без deps: обработчик всегда видит актуальное состояние

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      go(dx < 0 ? (view === 'week' ? 7 : 1) : (view === 'week' ? -7 : -1))
    }
  }

  const monthLabel = view === 'week'
    ? monthRange(week)
    : `${MONTHS_NOM[selected.getMonth()]} ${selected.getFullYear()}`

  return (
    <div className="app">
      <div className="bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <header className="toolbar">
        <button className="chip group-chip" onClick={() => setGroupsOpen(true)}>
          <span className="chip-code">{group.code}</span>
          <svg viewBox="0 0 12 8" width="9" height="6" aria-hidden="true">
            <path d="M1 1.5L6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="toolbar-center">
          <span className="toolbar-title">{monthLabel}</span>
          <span className="toolbar-sub">{wNum}-я неделя · {parityLabel(parity)}</span>
        </div>

        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Настройки">
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path d="M8.3 2.6h3.4l.4 2a6 6 0 011.6.9l1.9-.7 1.7 3-1.5 1.3a6 6 0 010 1.8l1.5 1.3-1.7 3-1.9-.7a6 6 0 01-1.6.9l-.4 2H8.3l-.4-2a6 6 0 01-1.6-.9l-1.9.7-1.7-3 1.5-1.3a6 6 0 010-1.8L2.7 7.8l1.7-3 1.9.7a6 6 0 011.6-.9z"
              fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </header>

      <div className="hero">
        <div className="hero-row">
          <h1 className="large-title">
            {view === 'day' ? relativeDayLabel(selected, now) : 'Неделя'}
          </h1>
          {!isToday && (
            <button className="today-btn" onClick={goToday}>Сегодня</button>
          )}
        </div>
        <p className="hero-sub">
          {view === 'day'
            ? `${formatDateLong(selected)} · ${DAY_NAMES[selected.getDay()].toLowerCase()}`
            : `${formatDateLong(week[0])} – ${formatDateLong(week[6])}`}
          {' · '}
          {plural(view === 'day' ? dayLessons.length : weekCounts.reduce((a, b) => a + b, 0))}
        </p>

        <Segmented
          value={view}
          onChange={setView}
          options={[{ value: 'day', label: 'День' }, { value: 'week', label: 'Неделя' }]}
        />
      </div>

      <nav className="weekstrip">
        <button className="nav-arrow" onClick={() => go(-7)} aria-label="Предыдущая неделя">
          <Arrow dir="left" />
        </button>
        <div className="days">
          {week.map((d, i) => {
            const active = sameDay(d, selected)
            const today = sameDay(d, now)
            return (
              <button
                key={i}
                className={`day-chip ${active ? 'is-active' : ''} ${today ? 'is-today' : ''}`}
                onClick={() => { setDir(d > selected ? 1 : -1); setSelected(d); setView('day') }}
              >
                <span className="dc-dow">{DAY_SHORT[d.getDay()]}</span>
                <span className="dc-num">{d.getDate()}</span>
                <span className="dc-dots">
                  {Array.from({ length: Math.min(weekCounts[i], 4) }).map((_, k) => (
                    <span key={k} className="dc-dot" />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <button className="nav-arrow" onClick={() => go(7)} aria-label="Следующая неделя">
          <Arrow dir="right" />
        </button>
      </nav>

      <main className="content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {view === 'day' ? (
          <div key={`d-${selected.toDateString()}`} className={`pane ${dir > 0 ? 'from-right' : 'from-left'}`}>
            {isToday && next && <NextUp next={next} now={now} onOpen={setDetail} />}
            <DayList
              date={selected}
              lessons={dayLessons}
              now={now}
              settings={settings}
              onOpen={setDetail}
              emptyHint={!isSemester(selected) ? 'Вне периода семестра' : undefined}
            />
          </div>
        ) : (
          <div key={`w-${mondayOf(selected).toDateString()}`} className={`pane ${dir > 0 ? 'from-right' : 'from-left'}`}>
            {weekLessons
              .filter(({ lessons }) => settings.showEmptyDays || lessons.length > 0)
              .map(({ date, lessons }) => (
                <section className="week-day" key={date.toDateString()}>
                  <header className={`week-day-head ${sameDay(date, now) ? 'is-today' : ''}`}>
                    <h2>{DAY_NAMES[date.getDay()]}</h2>
                    <span>{date.getDate()} {MONTHS_NOM[date.getMonth()].toLowerCase().slice(0, 3)}. · {lessons.length || '—'}</span>
                  </header>
                  <DayList date={date} lessons={lessons} now={now} settings={settings} onOpen={setDetail} compactEmpty />
                </section>
              ))}
          </div>
        )}

        <footer className="foot">
          {SEMESTER.title} · данные kpfu.ru
          {group.demo && <><br />Демонстрационные данные группы</>}
        </footer>
      </main>

      <GroupSheet
        open={groupsOpen}
        onClose={() => setGroupsOpen(false)}
        value={group.id}
        onSelect={(id) => update({ groupId: id })}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={update}
        reset={reset}
        group={group}
        now={now}
        onOpenGroups={() => { setSettingsOpen(false); setTimeout(() => setGroupsOpen(true), 220) }}
      />
      <LessonSheet item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function DayList({ date, lessons, now, settings, onOpen, emptyHint, compactEmpty }) {
  if (lessons.length === 0) {
    return compactEmpty ? (
      <p className="empty-inline">Занятий нет</p>
    ) : (
      <div className="empty">
        <div className="empty-emoji">☕️</div>
        <p>Занятий нет</p>
        <span>{emptyHint || 'Свободный день — можно выдохнуть'}</span>
      </div>
    )
  }

  const items = []
  lessons.forEach((lesson, i) => {
    const prev = lessons[i - 1]
    if (prev) {
      const gap = minutesOf(lesson.start) - minutesOf(prev.end)
      if (gap >= 30 && prev.start !== lesson.start) {
        items.push(
          <div className="gap" key={`gap-${lesson.id}-${i}`}>
            <span className="gap-line" />
            <span className="gap-text">перерыв {formatDuration(gap)}</span>
            <span className="gap-line" />
          </div>,
        )
      }
    }
    items.push(
      <LessonCard
        key={lesson.id}
        index={i}
        lesson={lesson}
        status={lessonStatus(lesson, date, now)}
        settings={settings}
        onClick={() => onOpen({ lesson, date })}
      />,
    )
  })
  return <div className="day-list">{items}</div>
}

function NextUp({ next, now, onOpen }) {
  const { lesson, date, status } = next
  const live = status.state === 'now'
  const when = live
    ? `до конца ${formatDuration(status.endsIn)}`
    : sameDay(date, now)
      ? `через ${formatDuration(status.startsIn)}`
      : `${relativeDayLabel(date, now).toLowerCase()} в ${lesson.start}`

  return (
    <button className="nextup" onClick={() => onOpen({ lesson, date })}>
      <div className="nextup-label">
        {live ? <><span className="dot live-dot" /> Идёт сейчас</> : 'Следующая пара'}
      </div>
      <div className="nextup-title">{lesson.title}</div>
      <div className="nextup-meta">
        {lesson.start}–{lesson.end} · {when}
      </div>
      <div className="nextup-place">
        {[lesson.room, lesson.teacher].filter(Boolean).join(' · ')}
      </div>
      {live && (
        <div className="nextup-progress">
          <span style={{ width: `${Math.round(status.progress * 100)}%` }} />
        </div>
      )}
    </button>
  )
}

function Arrow({ dir }) {
  return (
    <svg viewBox="0 0 12 20" width="8" height="13" aria-hidden="true" style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function monthRange(week) {
  const a = week[0]
  const b = week[6]
  if (a.getMonth() === b.getMonth()) return `${MONTHS_NOM[a.getMonth()]} ${a.getFullYear()}`
  return `${MONTHS_NOM[a.getMonth()].slice(0, 3)}. – ${MONTHS_NOM[b.getMonth()].slice(0, 3)}. ${b.getFullYear()}`
}

function plural(n) {
  const t = n % 10
  const h = n % 100
  if (n === 0) return 'нет занятий'
  if (t === 1 && h !== 11) return `${n} занятие`
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return `${n} занятия`
  return `${n} занятий`
}
