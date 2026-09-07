import { useMemo, useState } from 'react'
import Sheet from './Sheet.jsx'
import Segmented from './Segmented.jsx'
import { Group, Row, Switch } from './Rows.jsx'
import { ACCENTS } from '../hooks/useSettings.js'
import { CATEGORIES, semesterOf } from '../data/groups.js'
import { buildICS, semesterStats, subjectList, parityLabel, weekNumber, weekParity } from '../lib/schedule.js'

export default function SettingsSheet({ open, onClose, settings, update, reset, group, onOpenGroups, onRestartOnboarding, now }) {
  const [showSubjects, setShowSubjects] = useState(false)
  const [exported, setExported] = useState(false)

  const stats = useMemo(
    () => (open ? semesterStats(group, settings) : null),
    [open, group, settings],
  )
  const subjects = useMemo(() => subjectList(group), [group])
  const sem = semesterOf(group)
  const hasParity = useMemo(() => group.lessons.some((l) => l.parity), [group])

  const exportICS = () => {
    const { text } = buildICS(group, settings)
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `raspisanie-${group.code}.ics`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2200)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Настройки" subtitle={`${group.university} · ${sem.title}`}>
      <Group title="Профиль">
        <div className="row">
          <span className="row-icon" style={{ background: 'var(--accent)' }}><IconGroup /></span>
          <span className="row-main"><span className="row-label">Имя</span></span>
          <span className="row-trailing">
            <input
              className="inline-input no-drag"
              value={settings.name}
              maxLength={24}
              placeholder="не указано"
              onChange={(e) => update({ name: e.target.value })}
            />
          </span>
        </div>
        <Row
          icon={<IconReset />}
          iconColor="#8E8E93"
          label="Пройти настройку заново"
          sub="Экран регистрации с выбором группы"
          chevron
          onClick={onRestartOnboarding}
        />
      </Group>

      <Group title="Группа">
        <Row
          icon={<IconGroup />}
          iconColor="var(--accent)"
          label={`${group.university} · ${group.code}`}
          sub={`${group.title} · ${group.course} курс`}
          chevron
          onClick={onOpenGroups}
        />
        <div className="row">
          <span className="row-main">
            <span className="row-label">Своё название группы</span>
            <span className="row-sub">Как показывать её в шапке</span>
          </span>
          <span className="row-trailing">
            <input
              className="inline-input no-drag"
              value={settings.aliases?.[group.id] ?? ''}
              maxLength={14}
              placeholder={group.code}
              onChange={(e) => update((cur) => ({
                aliases: { ...cur.aliases, [group.id]: e.target.value },
              }))}
            />
          </span>
        </div>
        <Row icon={<IconSplit />} iconColor="#AF52DE" label="Подгруппа" sub="Показывать только свои занятия">
          <Segmented
            size="sm"
            value={settings.subgroup}
            onChange={(v) => update({ subgroup: v })}
            options={[
              { value: 0, label: 'Все' },
              { value: 1, label: '1-я' },
              { value: 2, label: '2-я' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Оформление">
        <Row icon={<IconTheme />} iconColor="#5E5CE6" label="Тема">
          <Segmented
            size="sm"
            value={settings.appearance}
            onChange={(v) => update({ appearance: v })}
            options={[
              { value: 'system', label: 'Авто' },
              { value: 'light', label: 'Светлая' },
              { value: 'dark', label: 'Тёмная' },
            ]}
          />
        </Row>
        <div className="row accent-row">
          <span className="row-icon" style={{ background: '#FF375F' }}><IconDrop /></span>
          <span className="row-main"><span className="row-label">Акцент</span></span>
          <span className="accents no-drag">
            {Object.entries(ACCENTS).map(([key, a]) => (
              <button
                key={key}
                className={`swatch ${settings.accent === key ? 'is-active' : ''}`}
                style={{ '--sw': a.color }}
                onClick={() => update({ accent: key })}
                aria-label={a.label}
                title={a.label}
              />
            ))}
          </span>
        </div>
        <Row icon={<IconCompact />} iconColor="#FF9F0A" label="Компактные карточки" sub="Только время и предмет">
          <Switch checked={settings.compact} onChange={(v) => update({ compact: v })} label="Компактные карточки" />
        </Row>
        <Row icon={<IconPalette />} iconColor="#30D158" label="Цвета дисциплин" sub="Своя метка для каждого блока">
          <Switch checked={settings.colorfulCards} onChange={(v) => update({ colorfulCards: v })} label="Цвета дисциплин" />
        </Row>
        <Row icon={<IconAscii />} iconColor="#1c1c1e" label="ASCII-графика" sub="Анимированный полутоновый постер">
          <Switch checked={settings.asciiArt !== false} onChange={(v) => update({ asciiArt: v })} label="ASCII-графика" />
        </Row>
      </Group>

      <Group title="Содержимое карточек">
        <Row label="Преподаватель">
          <Switch checked={settings.showTeacher} onChange={(v) => update({ showTeacher: v })} label="Преподаватель" />
        </Row>
        <Row label="Аудитория и здание">
          <Switch checked={settings.showRoom} onChange={(v) => update({ showRoom: v })} label="Аудитория" />
        </Row>
        <Row label="Период проведения" sub="Даты начала и окончания курса">
          <Switch checked={settings.showPeriod} onChange={(v) => update({ showPeriod: v })} label="Период" />
        </Row>
        <Row label="Пустые дни в неделе">
          <Switch checked={settings.showEmptyDays} onChange={(v) => update({ showEmptyDays: v })} label="Пустые дни" />
        </Row>
        <Row label="Скрыть физкультуру">
          <Switch checked={settings.hidePE} onChange={(v) => update({ hidePE: v })} label="Скрыть физкультуру" />
        </Row>
      </Group>

      <Group
        title="Учебная неделя"
        footer={hasParity
          ? `Сейчас идёт ${weekNumber(now, sem)}-я учебная неделя — ${parityLabel(weekParity(now, settings.firstWeekParity, sem))}. Если в деканате нумеруют иначе, переключите чётность первой недели.`
          : `Сейчас идёт ${weekNumber(now, sem)}-я учебная неделя. В расписании этой группы занятия заданы конкретными датами, поэтому чётность ни на что не влияет.`}
      >
        <Row icon={<IconCalendar />} iconColor="#FF3B30" label="Первая неделя семестра">
          <Segmented
            size="sm"
            value={settings.firstWeekParity}
            onChange={(v) => update({ firstWeekParity: v })}
            options={[
              { value: 'even', label: 'Чёт.' },
              { value: 'odd', label: 'Неч.' },
            ]}
          />
        </Row>
      </Group>

      <Group
        title="Дисциплины"
        footer={settings.hiddenSubjects.length ? `Скрыто дисциплин: ${settings.hiddenSubjects.length}` : 'Можно скрыть предметы, которые вы не посещаете.'}
      >
        <Row
          label="Показывать дисциплины"
          value={`${subjects.length - settings.hiddenSubjects.length} из ${subjects.length}`}
          chevron
          onClick={() => setShowSubjects((v) => !v)}
        />
        {showSubjects && subjects.map((s) => {
          const hidden = settings.hiddenSubjects.includes(s)
          return (
            <Row key={s} label={s} sub={CATEGORIES[categoryOf(group, s)]?.label}>
              <Switch
                checked={!hidden}
                label={s}
                onChange={(v) => update((cur) => ({
                  hiddenSubjects: v
                    ? cur.hiddenSubjects.filter((x) => x !== s)
                    : [...cur.hiddenSubjects, s],
                }))}
              />
            </Row>
          )
        })}
      </Group>

      <Group
        title="Данные"
        footer={stats ? `В семестре ${stats.total} занятий · примерно ${stats.hours} академических часов с учётом ваших фильтров.` : undefined}
      >
        <Row
          icon={<IconExport />}
          iconColor="#0A84FF"
          label={exported ? 'Файл сохранён' : 'Экспорт в календарь (.ics)'}
          sub="Apple Календарь, Google Calendar"
          chevron
          onClick={exportICS}
        />
        <Row
          icon={<IconReset />}
          iconColor="#8E8E93"
          label="Сбросить настройки"
          sub="Вернуть значения по умолчанию"
          chevron
          onClick={() => { if (confirm('Сбросить все настройки?')) reset() }}
        />
      </Group>

      <p className="about">
        Расписание · {sem.title}<br />
        Данные: kpfu.ru · kai.ru
      </p>
    </Sheet>
  )
}

function categoryOf(group, title) {
  return group.lessons.find((l) => l.title === title)?.category
}

/* Иконки */
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
const IconGroup = () => (<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="7.5" cy="7" r="3" {...s} /><path d="M2.5 16c.7-3 2.6-4.5 5-4.5s4.3 1.5 5 4.5" {...s} /><path d="M13.5 5.2a3 3 0 010 5.6M15 16c-.3-1.6-.9-2.8-1.8-3.7" {...s} /></svg>)
const IconSplit = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M3 10h5m4 0h5M10 3v5m0 4v5" {...s} /></svg>)
const IconTheme = () => (<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="5" {...s} /><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" {...s} /></svg>)
const IconDrop = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 2.5s5 5.6 5 8.8a5 5 0 11-10 0c0-3.2 5-8.8 5-8.8z" {...s} /></svg>)
const IconCompact = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M3 5.5h14M3 10h14M3 14.5h14" {...s} /></svg>)
const IconPalette = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 2.5a7.5 7.5 0 000 15c1 0 1.5-.7 1.5-1.5 0-1.2 1-1.7 2-1.7h1A3 3 0 0017.5 11c0-4.7-3.4-8.5-7.5-8.5z" {...s} /><circle cx="7" cy="8" r="1" fill="currentColor" /><circle cx="11" cy="6.5" r="1" fill="currentColor" /></svg>)
const IconCalendar = () => (<svg viewBox="0 0 20 20" width="14" height="14"><rect x="3" y="4.5" width="14" height="13" rx="3" {...s} /><path d="M3 8.5h14M7 2.5v3M13 2.5v3" {...s} /></svg>)
const IconExport = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" {...s} /><path d="M4 12v3.5A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5V12" {...s} /></svg>)
const IconAscii = () => (<svg viewBox="0 0 20 20" width="14" height="14"><g fill="currentColor"><circle cx="5" cy="6" r="1"/><circle cx="10" cy="6" r="1.4"/><circle cx="15" cy="6" r="1"/><circle cx="5" cy="10" r="1.4"/><circle cx="10" cy="10" r="2"/><circle cx="15" cy="10" r="1.4"/><circle cx="5" cy="14" r="1"/><circle cx="10" cy="14" r="1.4"/><circle cx="15" cy="14" r="1"/></g></svg>)
const IconReset = () => (<svg viewBox="0 0 20 20" width="14" height="14"><path d="M16 10a6 6 0 11-2-4.5" {...s} /><path d="M16.5 3v3.5H13" {...s} /></svg>)
