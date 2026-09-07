import { SEMESTER } from '../data/groups.js'

export const DAY_NAMES = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
]
export const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
export const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

/** 'YYYY-MM-DD' → Date (локальная полночь) */
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Понедельник недели, содержащей date */
export function mondayOf(date) {
  const d = startOfDay(date)
  const shift = (d.getDay() + 6) % 7
  return addDays(d, -shift)
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** Номер учебной недели: 1 для недели, в которой начинается семестр */
export function weekNumber(date) {
  const base = mondayOf(parseISO(SEMESTER.start))
  const cur = mondayOf(date)
  return Math.round((cur - base) / (7 * 24 * 3600 * 1000)) + 1
}

/** 'odd' | 'even' — чётность учебной недели */
export function weekParity(date, firstWeekParity = SEMESTER.firstWeekParity) {
  const n = weekNumber(date)
  const flip = (n - 1) % 2 === 1
  const base = firstWeekParity === 'odd' ? 'odd' : 'even'
  if (!flip) return base
  return base === 'odd' ? 'even' : 'odd'
}

export const parityLabel = (p) => (p === 'odd' ? 'нечётная' : 'чётная')

export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function inRange(iso, from, to) {
  return iso >= from && iso <= to
}

/** Проходит ли пара в конкретный день */
export function occursOn(lesson, date, opts = {}) {
  const iso = toISO(date)
  const dow = (date.getDay() + 6) % 7 + 1 // 1 = Пн
  if (lesson.day !== dow) return false
  if (!inRange(iso, lesson.from, lesson.to)) return false
  if (lesson.except?.some(([a, b]) => inRange(iso, a, b))) return false
  if (lesson.parity) {
    const p = weekParity(date, opts.firstWeekParity)
    if (p !== lesson.parity) return false
  }
  return true
}

/** Пары группы на конкретный день с учётом настроек */
export function lessonsForDate(group, date, settings = {}) {
  if (!group) return []
  const { subgroup = 0, hidePE = false, hiddenSubjects = [] } = settings
  return group.lessons
    .filter((l) => occursOn(l, date, settings))
    .filter((l) => (subgroup ? l.subgroup === null || l.subgroup === subgroup : true))
    .filter((l) => (hidePE ? l.category !== 'sport' : true))
    .filter((l) => !hiddenSubjects.includes(l.title))
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start) || (a.subgroup ?? 0) - (b.subgroup ?? 0))
}

export function weekDates(anchor) {
  const mon = mondayOf(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

/** Статус пары относительно текущего момента */
export function lessonStatus(lesson, date, now) {
  const day = startOfDay(date)
  const nowDay = startOfDay(now)
  if (day > nowDay) return { state: 'future' }
  if (day < nowDay) return { state: 'past' }
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const s = minutesOf(lesson.start)
  const e = minutesOf(lesson.end)
  if (cur < s) return { state: 'future', startsIn: Math.round(s - cur) }
  if (cur >= e) return { state: 'past' }
  return {
    state: 'now',
    progress: (cur - s) / (e - s),
    endsIn: Math.round(e - cur),
  }
}

export function formatDuration(min) {
  if (min < 1) return 'меньше минуты'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}

export function formatDateLong(date) {
  return `${date.getDate()} ${MONTHS_GEN[date.getMonth()]}`
}

export function relativeDayLabel(date, now) {
  const d = startOfDay(date)
  const n = startOfDay(now)
  const diff = Math.round((d - n) / 86400000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Завтра'
  if (diff === -1) return 'Вчера'
  return DAY_NAMES[date.getDay()]
}

export function isSemester(date) {
  const iso = toISO(date)
  return iso >= SEMESTER.start && iso <= SEMESTER.end
}

/** Ближайшая пара начиная с текущего момента (ищем вперёд до 14 дней) */
export function findNextLesson(group, now, settings) {
  for (let i = 0; i < 14; i++) {
    const date = addDays(startOfDay(now), i)
    const list = lessonsForDate(group, date, settings)
    for (const lesson of list) {
      const st = lessonStatus(lesson, date, now)
      if (st.state === 'now') return { lesson, date, status: st }
      if (st.state === 'future') return { lesson, date, status: st }
    }
  }
  return null
}

/** Статистика по семестру для экрана настроек / сводки */
export function semesterStats(group, settings) {
  const start = parseISO(SEMESTER.start)
  const end = parseISO(SEMESTER.end)
  let total = 0
  let minutes = 0
  const bySubject = new Map()
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    for (const l of lessonsForDate(group, d, settings)) {
      total++
      minutes += minutesOf(l.end) - minutesOf(l.start)
      bySubject.set(l.title, (bySubject.get(l.title) || 0) + 1)
    }
  }
  return {
    total,
    hours: Math.round(minutes / 60),
    subjects: [...bySubject.entries()].sort((a, b) => b[1] - a[1]),
  }
}

export function subjectList(group) {
  return [...new Set(group.lessons.map((l) => l.title))].sort((a, b) => a.localeCompare(b, 'ru'))
}

/* ─────────────────────────── Экспорт в календарь (.ics) ─────────────────────────── */

function icsDate(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

function escapeICS(s = '') {
  return String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

export function buildICS(group, settings) {
  const start = parseISO(SEMESTER.start)
  const end = parseISO(SEMESTER.end)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Расписание//KPFU//RU',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeICS(`Расписание ${group.code}`)}`,
  ]
  let n = 0
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    for (const l of lessonsForDate(group, d, settings)) {
      n++
      const place = [l.building, l.room].filter(Boolean).join(', ')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${group.id}-${l.id}-${toISO(d)}@raspisanie`,
        `DTSTAMP:${icsDate(new Date(), '00:00')}Z`,
        `DTSTART:${icsDate(d, l.start)}`,
        `DTEND:${icsDate(d, l.end)}`,
        `SUMMARY:${escapeICS(l.title)}${l.subgroup ? escapeICS(` (${l.subgroup} подгр.)`) : ''}`,
        `LOCATION:${escapeICS(place)}`,
        `DESCRIPTION:${escapeICS([l.teacher, l.note].filter(Boolean).join(' · '))}`,
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return { text: lines.join('\r\n'), count: n }
}
