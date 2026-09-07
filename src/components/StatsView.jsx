import { useMemo } from 'react'
import { CATEGORIES, SEMESTER } from '../data/groups.js'
import DotNumber from './DotNumber.jsx'
import { TickBar, TickColumn } from './Ticks.jsx'
import {
  addDays, lessonsForDate, minutesOf, mondayOf, parseISO, semesterStats, startOfDay, toISO, weekDates,
} from '../lib/schedule.js'

export default function StatsView({ group, settings, now }) {
  const data = useMemo(() => {
    const stats = semesterStats(group, settings)

    const week = weekDates(now)
    const weekLessons = week.map((d) => lessonsForDate(group, d, settings))
    const weekCount = weekLessons.reduce((a, l) => a + l.length, 0)
    const weekMinutes = weekLessons.flat().reduce((a, l) => a + minutesOf(l.end) - minutesOf(l.start), 0)
    const busiest = week
      .map((d, i) => ({ d, n: weekLessons[i].length }))
      .sort((a, b) => b.n - a.n)[0]

    const start = parseISO(SEMESTER.start)
    const end = parseISO(SEMESTER.end)
    const progress = Math.max(0, Math.min(1, (startOfDay(now) - start) / (end - start)))

    // сколько занятий уже позади
    let done = 0
    for (let d = new Date(start); d < startOfDay(now); d = addDays(d, 1)) {
      done += lessonsForDate(group, d, settings).length
    }

    const teachers = new Map()
    const cats = new Map()
    for (const l of group.lessons) {
      if (settings.hiddenSubjects.includes(l.title)) continue
      teachers.set(l.teacher, (teachers.get(l.teacher) || 0) + 1)
    }
    for (const [title, n] of stats.subjects) {
      const c = group.lessons.find((l) => l.title === title)?.category
      cats.set(c, (cats.get(c) || 0) + n)
    }

    return {
      stats,
      weekCount,
      weekHours: Math.round(weekMinutes / 60),
      busiest,
      progress,
      done,
      teachers: [...teachers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      cats: [...cats.entries()].sort((a, b) => b[1] - a[1]),
      total: stats.total,
    }
  }, [group, settings, toISO(startOfDay(now))]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxCat = Math.max(...data.cats.map(([, n]) => n), 1)

  return (
    <div className="stats">
      <section className="glass card wide">
        <span className="glow" aria-hidden="true" />
        <span className="card-label">Эта неделя</span>
        <div className="card-value">
          <DotNumber value={String(data.weekCount)} size={7} gap={3} />
          <span className="unit">пар</span>
          <div className="card-value-side"><TickColumn value={Math.min(1, data.weekCount / 40)} /></div>
        </div>
        <span className="card-sub">
          {data.weekHours} ак. часов · пик: {['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][data.busiest.d.getDay()]} ({data.busiest.n})
        </span>
      </section>

      <div className="stats-grid">
        <section className="glass card">
          <span className="glow c-blue" aria-hidden="true" />
          <span className="card-label">Прогресс семестра</span>
          <div className="card-value">
            <DotNumber value={`${Math.round(data.progress * 100)}%`} size={5} gap={2.5} />
          </div>
          <TickBar value={data.progress} ticks={26} label="сен" sub="дек" />
        </section>

        <section className="glass card">
          <span className="glow c-green" aria-hidden="true" />
          <span className="card-label">Занятий пройдено</span>
          <div className="card-value">
            <DotNumber value={String(data.done)} size={5} gap={2.5} />
            <span className="unit">из {data.total}</span>
          </div>
          <TickBar value={data.total ? data.done / data.total : 0} ticks={26} label="старт" sub="сессия" />
        </section>

        <section className="glass card">
          <span className="glow c-purple" aria-hidden="true" />
          <span className="card-label">Всего часов</span>
          <div className="card-value">
            <DotNumber value={String(data.stats.hours)} size={5} gap={2.5} />
            <span className="unit">ак. ч</span>
          </div>
          <span className="card-sub">за весь семестр</span>
        </section>

        <section className="glass card">
          <span className="glow c-amber" aria-hidden="true" />
          <span className="card-label">Дисциплин</span>
          <div className="card-value">
            <DotNumber value={String(data.stats.subjects.length)} size={5} gap={2.5} />
          </div>
          <span className="card-sub">{data.teachers.length} преподавателя чаще всего</span>
        </section>
      </div>

      <section className="glass card wide">
        <span className="card-label">Нагрузка по дисциплинам</span>
        <div className="bars">
          {data.stats.subjects.slice(0, 6).map(([title, n]) => {
            const cat = group.lessons.find((l) => l.title === title)?.category
            const max = data.stats.subjects[0][1]
            return (
              <div className="bar-row" key={title}>
                <span className="bar-name">{title}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${(n / max) * 100}%`, background: CATEGORIES[cat]?.color }}
                  />
                </span>
                <span className="bar-num">{n}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="glass card wide">
        <span className="card-label">Категории</span>
        <div className="chips">
          {data.cats.map(([c, n]) => (
            <span className="cat-chip" key={c} style={{ '--cat': CATEGORIES[c]?.color }}>
              <i />
              {CATEGORIES[c]?.label}
              <b>{Math.round((n / maxCat) * 100) / 100 ? n : n}</b>
            </span>
          ))}
        </div>
      </section>

      <section className="glass card wide">
        <span className="card-label">Преподаватели</span>
        <div className="teachers">
          {data.teachers.map(([t, n]) => (
            <div className="teacher-row" key={t}>
              <span className="avatar">{initials(t)}</span>
              <span className="teacher-name">{t}</span>
              <span className="teacher-num">{n} в расписании</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function initials(name = '') {
  const [fam, rest = ''] = name.split(' ')
  return `${fam[0] || ''}${rest[0] || ''}`.toUpperCase()
}
