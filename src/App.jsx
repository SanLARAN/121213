import { useEffect, useMemo, useRef, useState } from 'react'
import { GROUPS, SEMESTER } from './data/groups.js'
import { useSettings } from './hooks/useSettings.js'
import LessonCard from './components/LessonCard.jsx'
import GroupSheet from './components/GroupSheet.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import LessonSheet from './components/LessonSheet.jsx'
import Onboarding from './components/Onboarding.jsx'
import Dock from './components/Dock.jsx'
import StatsView from './components/StatsView.jsx'
import DotNumber from './components/DotNumber.jsx'
import { TickBar } from './components/Ticks.jsx'
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
  const next = useMemo(() => findNextLesson(group, now, settings), [group, now, settings])

  const isToday = sameDay(selected, now)
  const parity = weekParity(selected, settings.firstWeekParity)

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
      if (groupsOpen || settingsOpen || detail || !settings.onboarded) return
      if (e.target.closest?.('input')) return
      const step = view === 'week' ? 7 : 1
      if (e.key === 'ArrowLeft') go(-step)
      else if (e.key === 'ArrowRight') go(step)
      else if (e.key === 't' || e.key === 'е') goToday()
      else if (e.key === 'w' || e.key === 'ц') setView((v) => (v === 'week' ? 'day' : 'week'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    if (!touch.current || view === 'stats') return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      go(dx < 0 ? (view === 'week' ? 7 : 1) : (view === 'week' ? -7 : -1))
    }
  }

  if (!settings.onboarded) {
    return <Onboarding settings={settings} update={update} onFinish={() => setView('day')} />
  }

  const dayStart = dayLessons.length ? minutesOf(dayLessons[0].start) : 0
  const dayEnd = dayLessons.length ? minutesOf(dayLessons[dayLessons.length - 1].end) : 0
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const dayProgress = dayEnd > dayStart
    ? Math.max(0, Math.min(1, (nowMin - dayStart) / (dayEnd - dayStart)))
    : 0

  return (
    <div className="app">
      <div className="bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>

      <header className="topbar">
        <div className="toppill glass">
          <button className="group-chip" onClick={() => setGroupsOpen(true)}>
            <span className="chip-code">{group.code}</span>
            <svg viewBox="0 0 12 8" width="9" height="6" aria-hidden="true">
              <path d="M1 1.5L6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="toppill-title">
            {view === 'stats' ? 'Сводка' : `${weekNumber(selected)} неделя · ${parityLabel(parity)}`}
          </span>
          <button className="avatar-btn" onClick={() => setSettingsOpen(true)} aria-label="Профиль">
            {settings.name ? settings.name.trim()[0].toUpperCase() : '·'}
          </button>
        </div>
      </header>

      <div className="hero">
        <p className="hero-kicker">
          {greeting(now)}{settings.name ? `, ${settings.name}` : ''}
        </p>
        <div className="hero-row">
          <h1 className="large-title">
            {view === 'stats' ? 'Сводка' : view === 'week' ? 'Неделя' : relativeDayLabel(selected, now)}
          </h1>
          {view !== 'stats' && !isToday && (
            <button className="today-btn" onClick={goToday}>Сегодня</button>
          )}
        </div>
        {view !== 'stats' && (
          <p className="hero-sub">
            {view === 'day'
              ? `${formatDateLong(selected)} · ${DAY_NAMES[selected.getDay()].toLowerCase()}`
              : `${formatDateLong(week[0])} – ${formatDateLong(week[6])}`}
            {' · '}
            {plural(view === 'day'
              ? dayLessons.length
              : weekLessons.reduce((a, w) => a + w.lessons.length, 0))}
          </p>
        )}
      </div>

      {view !== 'stats' && (
        <nav className="weekstrip">
          <button className="nav-arrow" onClick={() => go(-7)} aria-label="Предыдущая неделя"><Arrow dir="left" /></button>
          <div className="days">
            {week.map((d, i) => {
              const active = sameDay(d, selected)
              const today = sameDay(d, now)
              const n = weekLessons[i].lessons.length
              return (
                <button
                  key={i}
                  className={`day-chip ${active ? 'is-active' : ''} ${today ? 'is-today' : ''}`}
                  onClick={() => { setDir(d > selected ? 1 : -1); setSelected(d); setView('day') }}
                >
                  <span className="dc-dow">{DAY_SHORT[d.getDay()]}</span>
                  <span className="dc-num">{d.getDate()}</span>
                  <span className="dc-dots">
                    {Array.from({ length: Math.min(n, 4) }).map((_, k) => <span key={k} className="dc-dot" />)}
                  </span>
                </button>
              )
            })}
          </div>
          <button className="nav-arrow" onClick={() => go(7)} aria-label="Следующая неделя"><Arrow dir="right" /></button>
        </nav>
      )}

      <main className="content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {view === 'stats' && (
          <div className="pane from-right" key="stats">
            <StatsView group={group} settings={settings} now={now} />
          </div>
        )}

        {view === 'day' && (
          <div key={`d-${selected.toDateString()}`} className={`pane ${dir > 0 ? 'from-right' : 'from-left'}`}>
            {isToday && next && <NextUp next={next} now={now} onOpen={setDetail} />}
            {isToday && dayLessons.length > 0 && (
              <div className="daybar glass">
                <span className="card-label">Учебный день</span>
                <TickBar
                  value={dayProgress}
                  ticks={38}
                  label={dayLessons[0].start}
                  sub={dayLessons[dayLessons.length - 1].end}
                />
              </div>
            )}
            <DayList
              date={selected}
              lessons={dayLessons}
              now={now}
              settings={settings}
              onOpen={setDetail}
              emptyHint={!isSemester(selected) ? 'Вне периода семестра' : undefined}
            />
          </div>
        )}

        {view === 'week' && (
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

      <Dock view={view} onView={setView} onSettings={() => setSettingsOpen(true)} />

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
        onRestartOnboarding={() => { setSettingsOpen(false); update({ onboarded: false }) }}
      />
      <LessonSheet item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function DayList({ date, lessons, now, settings, onOpen, emptyHint, compactEmpty }) {
  if (lessons.length === 0) {
    return compactEmpty
      ? <p className="empty-inline">Занятий нет</p>
      : (
        <div className="empty glass">
          <DotNumber value="00" size={6} gap={3} />
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
  const value = live ? status.endsIn : status.startsIn ?? 0
  const sameDayLesson = sameDay(date, now)
  const soon = sameDayLesson && value < 600
  const big = live || soon ? formatClock(value) : lesson.start
  const unit = live ? 'до конца' : soon ? 'через' : sameDayLesson ? 'сегодня' : relativeDayLabel(date, now).toLowerCase()

  return (
    <button className="nextup glass" onClick={() => onOpen({ lesson, date })}>
      <span className="glow c-accent" aria-hidden="true" />
      <span className="nextup-head">
        <span className="card-label">{live ? 'Идёт сейчас' : 'Следующая пара'}</span>
        <span className="badge">{lesson.start}–{lesson.end}</span>
      </span>

      <span className="nextup-value">
        <DotNumber value={big} size={7} gap={3} />
        <span className="unit">{unit}</span>
      </span>

      <span className="nextup-title">{lesson.title}</span>
      <span className="nextup-meta">{[lesson.room, lesson.teacher].filter(Boolean).join(' · ')}</span>

      <TickBar value={live ? status.progress : 0.02} ticks={40} label={live ? 'начало' : 'старт'} sub={live ? 'конец' : lesson.end} />
    </button>
  )
}

function formatClock(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h}:${String(m).padStart(2, '0')}` : String(m)
}

function greeting(now) {
  const h = now.getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function Arrow({ dir }) {
  return (
    <svg viewBox="0 0 12 20" width="8" height="13" aria-hidden="true" style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function plural(n) {
  const t = n % 10
  const h = n % 100
  if (n === 0) return 'нет занятий'
  if (t === 1 && h !== 11) return `${n} занятие`
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return `${n} занятия`
  return `${n} занятий`
}
