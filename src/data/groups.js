import { kaiLessons } from './kai.js'

/**
 * Данные расписания.
 *
 * Модель пары:
 *  day      — 1..7 (1 = понедельник)
 *  start/end— 'HH:MM'
 *  title    — название дисциплины
 *  teacher  — преподаватель
 *  building — учебное здание (полное название)
 *  room     — аудитория
 *  subgroup — 1 | 2 | null (null = для всей группы)
 *  from/to  — период действия, 'YYYY-MM-DD'
 *  parity   — 'odd' (неч. нед.) | 'even' (чет. нед.) | null (каждую неделю)
 *  except   — массив периодов-исключений [['YYYY-MM-DD','YYYY-MM-DD'], ...]
 *  online   — занятие с ЦОР / дистант
 *  category — для цветовой маркировки
 */

export const SEMESTERS = {
  kfu: {
    title: 'Осенний семестр 2026/2027',
    start: '2026-09-07',
    end: '2026-12-30',
    // Неделя, в которой начинается семестр (07.09.2026), считается ЧЁТНОЙ —
    // это соответствует расписанию КФУ (14.09 — «неч. нед.»).
    firstWeekParity: 'even',
  },
  kai: {
    title: 'Осенний семестр 2026/2027',
    start: '2026-09-01',
    end: '2026-12-30',
    firstWeekParity: 'odd',
  },
}

/** Семестр по умолчанию (используется, если у группы он не указан). */
export const SEMESTER = SEMESTERS.kfu

/** Длительность пары по умолчанию, мин. */
export const LESSON_MINUTES = 90

export const CATEGORIES = {
  east: { label: 'Восточный язык', color: '#AF52DE' },
  foreign: { label: 'Иностранный язык', color: '#0A84FF' },
  history: { label: 'История', color: '#FF9F0A' },
  oriental: { label: 'Востоковедение', color: '#FFC24A' },
  society: { label: 'Общество и государство', color: '#FF375F' },
  sport: { label: 'Физическая культура', color: '#30D158' },
  math: { label: 'Математика', color: '#5E9BFF' },
  physics: { label: 'Физика', color: '#2FD8C4' },
  engineering: { label: 'Инженерные дисциплины', color: '#FF9F5A' },
}

const B36 = 'Учебное здание №36'
const B26 = 'Учебное здание №26'
const UNIKS = 'Культурно-спортивный комплекс УНИКС'

const mainLessons = [
  // ───────────────────────── Понедельник
  {
    day: 1, start: '08:00', end: '09:30',
    title: 'Физическая культура и спорт',
    teacher: 'Тагирова Н.П.', building: UNIKS, room: '',
    subgroup: null, from: '2026-09-07', to: '2026-12-28', category: 'sport',
  },
  {
    day: 1, start: '10:10', end: '11:40',
    title: 'Основной восточный язык',
    teacher: 'Кызылкая З.Х.', building: B36, room: '04406',
    subgroup: 2, from: '2026-09-07', to: '2026-12-28', category: 'east',
  },
  {
    day: 1, start: '10:10', end: '11:40',
    title: 'Основной восточный язык',
    teacher: 'Шафигуллина Л.Ш.', building: B36, room: '04415',
    subgroup: 1, from: '2026-09-07', to: '2026-12-28', category: 'east',
  },
  {
    day: 1, start: '12:10', end: '13:40',
    title: 'Введение в востоковедение',
    teacher: 'Валеев Р.М.', building: B36, room: '03313 (.21)',
    subgroup: null, from: '2026-09-14', to: '2026-12-21', parity: 'odd', category: 'oriental',
  },
  {
    day: 1, start: '12:10', end: '13:40',
    title: 'Введение в востоковедение',
    teacher: 'Валеев Р.М.', building: B36, room: '03313 (.21)',
    subgroup: null, from: '2026-12-28', to: '2026-12-28', category: 'oriental',
  },
  {
    day: 1, start: '12:10', end: '13:40',
    title: 'Введение в востоковедение',
    teacher: 'Валеев Р.М.', building: B26, room: '0447',
    subgroup: null, from: '2026-09-07', to: '2026-12-14', parity: 'even', category: 'oriental',
  },
  {
    day: 1, start: '13:50', end: '15:20',
    title: 'Основной восточный язык',
    teacher: 'Шафигуллина Л.Ш.', building: B36, room: '04419',
    subgroup: 1, from: '2026-09-07', to: '2026-12-28', category: 'east',
  },

  // ───────────────────────── Вторник
  {
    day: 2, start: '08:30', end: '10:00',
    title: 'Основной восточный язык',
    teacher: 'Галяутдинова Л.М.', building: B36, room: '04401',
    subgroup: 2, from: '2026-09-08', to: '2026-12-29', category: 'east',
  },
  {
    day: 2, start: '08:30', end: '10:00',
    title: 'Практический курс иностранного языка',
    teacher: 'Замалиева И.Н.', building: B36, room: '02213',
    subgroup: 1, from: '2026-09-08', to: '2026-12-29', category: 'foreign',
  },
  {
    day: 2, start: '10:10', end: '11:40',
    title: 'Введение в тюркологию',
    teacher: 'Нигматуллина А.М.', building: B36, room: '04417',
    subgroup: null, from: '2026-11-17', to: '2026-12-29', category: 'oriental',
  },
  {
    day: 2, start: '10:10', end: '11:40',
    title: 'Введение в тюркологию',
    teacher: 'Нигматуллина А.М.', building: B36, room: '04417',
    subgroup: null, from: '2026-09-08', to: '2026-11-10', category: 'oriental',
    except: [['2026-10-06', '2026-10-13']], note: 'За исключением 6.10–13.10',
  },
  {
    day: 2, start: '12:10', end: '13:40',
    title: 'История России',
    teacher: 'Федотова А.Ю.', building: B36, room: '03320',
    subgroup: null, from: '2026-09-08', to: '2026-12-29', category: 'history',
  },
  {
    day: 2, start: '13:50', end: '15:20',
    title: 'Практический курс иностранного языка',
    teacher: 'Яхин М.А.', building: B36, room: '02213',
    subgroup: 2, from: '2026-09-08', to: '2026-12-29', category: 'foreign',
  },

  // ───────────────────────── Среда
  {
    day: 3, start: '08:30', end: '10:00',
    title: 'Основной восточный язык',
    teacher: 'Галяутдинова Л.М.', building: B36, room: '04401',
    subgroup: 2, from: '2026-09-09', to: '2026-12-30', category: 'east',
  },
  {
    day: 3, start: '08:30', end: '10:00',
    title: 'Практический курс иностранного языка',
    teacher: 'Замалиева И.Н.', building: B36, room: '02213',
    subgroup: 1, from: '2026-09-09', to: '2026-12-30', category: 'foreign',
  },
  {
    day: 3, start: '10:10', end: '11:40',
    title: 'История России',
    teacher: 'Федотова А.Ю.', building: B36, room: '01111',
    subgroup: null, from: '2026-09-09', to: '2026-11-25', category: 'history',
  },
  {
    day: 3, start: '12:10', end: '13:40',
    title: 'Основы российской государственности',
    teacher: 'Гизатова Г.К.', building: B36, room: '02215',
    subgroup: null, from: '2026-11-18', to: '2026-12-30', category: 'society',
  },
  {
    day: 3, start: '12:10', end: '13:40',
    title: 'Основы российской государственности',
    teacher: 'Гизатова Г.К.', building: B36, room: '03320',
    subgroup: null, from: '2026-09-09', to: '2026-11-11', category: 'society',
  },
  {
    day: 3, start: '13:50', end: '15:20',
    title: 'Основной восточный язык',
    teacher: 'Аскаров Д.С.', building: B36, room: '04415',
    subgroup: 1, from: '2026-09-09', to: '2026-10-07', category: 'east',
  },
  {
    day: 3, start: '15:50', end: '17:20',
    title: 'Основной восточный язык',
    teacher: 'Аскаров Д.С.', building: B36, room: '04417',
    subgroup: 1, from: '2026-09-09', to: '2026-10-07', category: 'east',
  },

  // ───────────────────────── Четверг
  {
    day: 4, start: '08:00', end: '09:30',
    title: 'Физическая культура и спорт',
    teacher: 'Тагирова Н.П.', building: UNIKS, room: '',
    subgroup: null, from: '2026-09-10', to: '2026-12-24', category: 'sport',
  },
  {
    day: 4, start: '12:10', end: '13:40',
    title: 'Основы российской государственности',
    teacher: 'Гизатова Г.К.', building: B36, room: '02215',
    subgroup: null, from: '2026-11-05', to: '2026-12-24', category: 'society',
  },
  {
    day: 4, start: '12:10', end: '13:40',
    title: 'Иностранный язык',
    teacher: 'Замалиева И.Н.', building: B36, room: '02213',
    subgroup: 1, from: '2026-09-10', to: '2026-10-29', category: 'foreign',
  },
  {
    day: 4, start: '13:50', end: '15:20',
    title: 'Основной восточный язык',
    teacher: 'Шафигуллина Л.Ш.', building: B36, room: '04406',
    subgroup: 1, from: '2026-09-10', to: '2026-12-24', category: 'east',
  },
  {
    day: 4, start: '13:50', end: '15:20',
    title: 'Основной восточный язык',
    teacher: 'Кызылкая З.Х.', building: B36, room: '04401',
    subgroup: 2, from: '2026-09-10', to: '2026-12-24', category: 'east',
  },
  {
    day: 4, start: '19:10', end: '20:40',
    title: 'Физическая культура и спорт',
    teacher: 'Тагирова Н.П.', building: UNIKS, room: '',
    subgroup: null, from: '2026-10-01', to: '2026-10-01', category: 'sport',
    online: true, note: 'ЦОР на edu.kpfu.ru',
  },
  {
    day: 4, start: '19:10', end: '20:40',
    title: 'Физическая культура и спорт',
    teacher: 'Тагирова Н.П.', building: UNIKS, room: '',
    subgroup: null, from: '2026-10-15', to: '2026-10-15', category: 'sport',
    online: true, note: 'ЦОР на edu.kpfu.ru',
  },

  // ───────────────────────── Пятница
  {
    day: 5, start: '12:10', end: '13:40',
    title: 'Практический курс иностранного языка',
    teacher: 'Яхин М.А.', building: B36, room: '04403',
    subgroup: 2, from: '2026-09-11', to: '2026-12-25', category: 'foreign',
  },
  {
    day: 5, start: '13:50', end: '15:20',
    title: 'Иностранный язык',
    teacher: 'Яхин М.А.', building: B36, room: '04403',
    subgroup: 2, from: '2026-10-23', to: '2026-12-18', category: 'foreign',
  },

  // ───────────────────────── Суббота
  {
    day: 6, start: '08:30', end: '10:00',
    title: 'Основной восточный язык',
    teacher: 'Аскаров Д.С.', building: B36, room: '04401',
    subgroup: 1, from: '2026-09-12', to: '2026-12-26', category: 'east',
  },
  {
    day: 6, start: '10:10', end: '11:40',
    title: 'Основной восточный язык',
    teacher: 'Аскаров Д.С.', building: B36, room: '04401',
    subgroup: 1, from: '2026-09-12', to: '2026-12-26', category: 'east',
  },
  {
    day: 6, start: '12:10', end: '13:40',
    title: 'Всемирная история',
    teacher: 'Григер М.В.', building: B36, room: '03320',
    subgroup: null, from: '2026-09-19', to: '2026-12-26', parity: 'odd', category: 'history',
  },
  {
    day: 6, start: '17:30', end: '19:00',
    title: 'Иностранный язык',
    teacher: 'Замалиева И.Н.', building: B36, room: 'подвал, 010 (по т.п. 10, 11)',
    subgroup: 1, from: '2026-09-12', to: '2026-10-31', category: 'foreign',
    online: true, note: 'ЦОР',
  },
  {
    day: 6, start: '17:30', end: '19:00',
    title: 'Иностранный язык',
    teacher: 'Яхин М.А.', building: B36, room: 'подвал, 010 (по т.п. 10, 11)',
    subgroup: 2, from: '2026-09-12', to: '2026-10-31', category: 'foreign',
    online: true, note: 'ЦОР',
  },
  {
    day: 6, start: '19:10', end: '20:40',
    title: 'Практический курс иностранного языка',
    teacher: 'Яхин М.А.', building: B36, room: 'подвал, 010 (по т.п. 10, 11)',
    subgroup: 2, from: '2026-09-12', to: '2026-12-26', category: 'foreign',
    online: true, note: 'ЦОР',
  },
  {
    day: 6, start: '19:10', end: '20:40',
    title: 'Практический курс иностранного языка',
    teacher: 'Замалиева И.Н.', building: B36, room: 'подвал, 010 (по т.п. 10, 11)',
    subgroup: 1, from: '2026-09-12', to: '2026-12-26', category: 'foreign',
    online: true, note: 'ЦОР',
  },
]

/** Демонстрационные группы — чтобы был виден переключатель групп. */
const demoRegion = [
  { day: 1, start: '10:10', end: '11:40', title: 'Теория международных отношений', teacher: 'Хайруллин Т.Р.', building: B36, room: '02213', subgroup: null, from: '2026-09-07', to: '2026-12-28', category: 'society' },
  { day: 1, start: '12:10', end: '13:40', title: 'Иностранный язык', teacher: 'Замалиева И.Н.', building: B36, room: '02215', subgroup: 1, from: '2026-09-07', to: '2026-12-28', category: 'foreign' },
  { day: 1, start: '12:10', end: '13:40', title: 'Иностранный язык', teacher: 'Яхин М.А.', building: B36, room: '02216', subgroup: 2, from: '2026-09-07', to: '2026-12-28', category: 'foreign' },
  { day: 2, start: '08:30', end: '10:00', title: 'Экономика регионов мира', teacher: 'Сафиуллин Л.Н.', building: B26, room: '0447', subgroup: null, from: '2026-09-08', to: '2026-12-29', parity: 'even', category: 'society' },
  { day: 2, start: '10:10', end: '11:40', title: 'Всемирная история', teacher: 'Григер М.В.', building: B36, room: '03320', subgroup: null, from: '2026-09-08', to: '2026-12-29', category: 'history' },
  { day: 3, start: '10:10', end: '11:40', title: 'История России', teacher: 'Федотова А.Ю.', building: B36, room: '01111', subgroup: null, from: '2026-09-09', to: '2026-12-30', category: 'history' },
  { day: 3, start: '12:10', end: '13:40', title: 'Физическая культура и спорт', teacher: 'Тагирова Н.П.', building: UNIKS, room: '', subgroup: null, from: '2026-09-09', to: '2026-12-30', category: 'sport' },
  { day: 4, start: '08:30', end: '10:00', title: 'Основной восточный язык', teacher: 'Кызылкая З.Х.', building: B36, room: '04406', subgroup: null, from: '2026-09-10', to: '2026-12-24', category: 'east' },
  { day: 5, start: '10:10', end: '11:40', title: 'Основы российской государственности', teacher: 'Гизатова Г.К.', building: B36, room: '02215', subgroup: null, from: '2026-09-11', to: '2026-12-25', category: 'society' },
  { day: 5, start: '12:10', end: '13:40', title: 'Практический курс иностранного языка', teacher: 'Яхин М.А.', building: B36, room: '04403', subgroup: 2, from: '2026-09-11', to: '2026-12-25', category: 'foreign' },
]

const demoTurk = [
  { day: 1, start: '08:30', end: '10:00', title: 'Введение в тюркологию', teacher: 'Нигматуллина А.М.', building: B36, room: '04417', subgroup: null, from: '2026-09-07', to: '2026-12-28', category: 'oriental' },
  { day: 1, start: '10:10', end: '11:40', title: 'Татарский язык', teacher: 'Галяутдинова Л.М.', building: B36, room: '04401', subgroup: null, from: '2026-09-07', to: '2026-12-28', category: 'east' },
  { day: 2, start: '12:10', end: '13:40', title: 'Основной восточный язык', teacher: 'Аскаров Д.С.', building: B36, room: '04415', subgroup: 1, from: '2026-09-08', to: '2026-12-29', category: 'east' },
  { day: 2, start: '12:10', end: '13:40', title: 'Основной восточный язык', teacher: 'Шафигуллина Л.Ш.', building: B36, room: '04419', subgroup: 2, from: '2026-09-08', to: '2026-12-29', category: 'east' },
  { day: 3, start: '13:50', end: '15:20', title: 'История России', teacher: 'Федотова А.Ю.', building: B36, room: '03320', subgroup: null, from: '2026-09-09', to: '2026-12-30', parity: 'odd', category: 'history' },
  { day: 4, start: '10:10', end: '11:40', title: 'Иностранный язык', teacher: 'Замалиева И.Н.', building: B36, room: '02213', subgroup: null, from: '2026-09-10', to: '2026-12-24', category: 'foreign' },
  { day: 4, start: '19:10', end: '20:40', title: 'Физическая культура и спорт', teacher: 'Тагирова Н.П.', building: UNIKS, room: '', subgroup: null, from: '2026-09-10', to: '2026-12-24', category: 'sport', online: true, note: 'ЦОР' },
  { day: 6, start: '10:10', end: '11:40', title: 'Всемирная история', teacher: 'Григер М.В.', building: B36, room: '03320', subgroup: null, from: '2026-09-12', to: '2026-12-26', parity: 'even', category: 'history' },
]

/** Конец пары по времени начала, если он не задан явно. */
function addMinutes(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + min
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

const dowOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1
}

/**
 * Нормализация занятий: id, конец пары, день недели и период —
 * поддерживаются оба формата (период + чётность и список дат).
 */
const prepare = (list, prefix) =>
  list.map((l, i) => {
    const dates = l.dates ? [...l.dates].sort() : null
    return {
      subgroup: null,
      parity: null,
      online: false,
      ...l,
      id: `${prefix}-${i}`,
      end: l.end ?? addMinutes(l.start, LESSON_MINUTES),
      day: l.day ?? (dates ? dowOf(dates[0]) : 1),
      dates,
      from: l.from ?? (dates ? dates[0] : undefined),
      to: l.to ?? (dates ? dates[dates.length - 1] : undefined),
    }
  })

export const GROUPS = [
  {
    id: '04-1-101',
    university: 'КФУ',
    semester: SEMESTERS.kfu,
    code: '04.1-101',
    title: 'Востоковедение и африканистика',
    course: 1,
    institute: 'Институт международных отношений',
    demo: false,
    lessons: prepare(mainLessons, 'm'),
  },
  {
    id: '04-1-108',
    university: 'КФУ',
    semester: SEMESTERS.kfu,
    code: '04.1-108',
    title: 'Зарубежное регионоведение',
    course: 1,
    institute: 'Институт международных отношений',
    demo: true,
    lessons: prepare(demoRegion, 'r'),
  },
  {
    id: '04-1-204',
    university: 'КФУ',
    semester: SEMESTERS.kfu,
    code: '04.1-204',
    title: 'Тюркология',
    course: 2,
    institute: 'Институт международных отношений',
    demo: true,
    lessons: prepare(demoTurk, 't'),
  },
  {
    id: 'kai-4101',
    university: 'КНИТУ-КАИ',
    code: '4101',
    title: 'Первый курс, ИАНТЭ',
    course: 1,
    institute: 'Институт авиации, наземного транспорта и энергетики',
    semester: SEMESTERS.kai,
    demo: false,
    lessons: prepare(kaiLessons, 'k'),
  },
]

export const DEFAULT_GROUP_ID = '04-1-101'

/** Семестр конкретной группы. */
export const semesterOf = (group) => group?.semester ?? SEMESTER
