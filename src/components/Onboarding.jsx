import { useEffect, useMemo, useState } from 'react'
import { GROUPS } from '../data/groups.js'
import { ACCENTS } from '../hooks/useSettings.js'
import DotNumber from './DotNumber.jsx'
import { TickBar } from './Ticks.jsx'
import { lessonsForDate, weekDates, startOfDay, parseISO } from '../lib/schedule.js'
import { semesterOf } from '../data/groups.js'

const STEPS = ['Профиль', 'Группа', 'Подгруппа', 'Оформление', 'Готово']

export default function Onboarding({ settings, update, onFinish }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(settings.name || '')
  const [groupId, setGroupId] = useState(settings.groupId)
  const [subgroup, setSubgroup] = useState(settings.subgroup)
  const [q, setQ] = useState('')
  const [uni, setUni] = useState('все')
  const [dir, setDir] = useState(1)

  const UNIS = useMemo(() => ['все', ...new Set(GROUPS.map((g) => g.university))], [])

  const group = GROUPS.find((g) => g.id === groupId) ?? GROUPS[0]

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return GROUPS
      .filter((g) => uni === 'все' || g.university === uni)
      .filter((g) => !s || `${g.code} ${g.title} ${g.institute} ${g.university} ${g.course}`.toLowerCase().includes(s))
  }, [q, uni])

  const hasSubgroups = useMemo(() => group.lessons.some((l) => l.subgroup), [group])

  const weekCount = useMemo(() => {
    const st = { subgroup, hidePE: false, hiddenSubjects: [], firstWeekParity: settings.firstWeekParity }
    return weekDates(startOfDay(parseISO(semesterOf(group).start)))
      .reduce((sum, d) => sum + lessonsForDate(group, d, st).length, 0)
  }, [group, subgroup, settings.firstWeekParity])

  useEffect(() => {
    if (!hasSubgroups && subgroup !== 0) setSubgroup(0)
  }, [hasSubgroups, subgroup])

  const go = (n) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  const finish = () => {
    update({ name: name.trim(), groupId, subgroup, onboarded: true })
    onFinish?.()
  }

  const canNext = step !== 1 || Boolean(groupId)

  return (
    <div className="onb">
      <div className="bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>

      <header className="onb-head">
        <div className="onb-step">
          <DotNumber value={`0${step + 1}/0${STEPS.length}`} size={3} gap={1.5} />
        </div>
        <TickBar value={(step + 1) / STEPS.length} ticks={40} marker={false} />
        <span className="onb-step-name">{STEPS[step]}</span>
      </header>

      <main className={`onb-body pane ${dir > 0 ? 'from-right' : 'from-left'}`} key={step}>
        {step === 0 && (
          <div className="onb-pane">
            <h1 className="onb-title">Привет.<br />Давайте настроим<br />расписание.</h1>
            <p className="onb-text">
              Занятия, подгруппы и чётность недель — всё посчитается само.
              Займёт меньше минуты.
            </p>
            <label className="field">
              <span className="field-label">Как к вам обращаться</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя"
                maxLength={24}
                onKeyDown={(e) => e.key === 'Enter' && go(1)}
              />
            </label>
            <p className="onb-hint">Необязательно — можно пропустить.</p>
          </div>
        )}

        {step === 1 && (
          <div className="onb-pane">
            <h1 className="onb-title">Ваша группа</h1>
            <div className="search">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M11 11l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Код группы, вуз или направление" />
              {q && <button className="search-clear" onClick={() => setQ('')} aria-label="Очистить">×</button>}
            </div>
            <div className="filter-chips">
              {UNIS.map((u) => (
                <button
                  key={u}
                  className={`filter-chip ${uni === u ? 'is-active' : ''}`}
                  onClick={() => setUni(u)}
                >
                  {u === 'все' ? 'Все вузы' : u}
                </button>
              ))}
            </div>
            <div className="onb-groups">
              {filtered.map((g) => (
                <button
                  key={g.id}
                  className={`glass-item ${g.id === groupId ? 'is-active' : ''}`}
                  onClick={() => setGroupId(g.id)}
                >
                  <span className="gi-code">{g.code}</span>
                  <span className="gi-main">
                    <b>{g.title}</b>
                    <span>{g.university} · {g.course} курс</span>
                  </span>
                  {g.demo && <span className="badge subtle">демо</span>}
                  {g.id === groupId && <CheckIcon />}
                </button>
              ))}
              {filtered.length === 0 && <p className="onb-hint">Ничего не найдено</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onb-pane">
            <h1 className="onb-title">Подгруппа</h1>
            <p className="onb-text">
              {hasSubgroups
                ? 'Языковые пары идут по подгруппам. Выберите свою — в расписании останутся только нужные занятия.'
                : `В расписании группы ${group.code} деления на подгруппы нет — этот шаг можно пропустить.`}
            </p>
            <div className="pick-grid">
              {[
                { v: 1, t: '1', s: 'первая подгруппа' },
                { v: 2, t: '2', s: 'вторая подгруппа' },
                { v: 0, t: '—', s: 'показывать все' },
              ].map((o) => (
                <button
                  key={o.v}
                  className={`pick ${subgroup === o.v ? 'is-active' : ''} ${!hasSubgroups && o.v ? 'is-off' : ''}`}
                  disabled={!hasSubgroups && o.v !== 0}
                  onClick={() => setSubgroup(o.v)}
                >
                  <span className="pick-num">{o.t}</span>
                  <span className="pick-sub">{o.s}</span>
                </button>
              ))}
            </div>
            <div className="onb-preview">
              <span className="card-label">Пар на первой неделе</span>
              <DotNumber value={String(weekCount)} size={5} gap={2.5} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onb-pane">
            <h1 className="onb-title">Оформление</h1>
            <p className="onb-text">Это всегда можно поменять в настройках.</p>

            <span className="field-label">Тема</span>
            <div className="theme-grid">
              {[
                { v: 'dark', t: 'Тёмная' },
                { v: 'light', t: 'Светлая' },
                { v: 'system', t: 'Авто' },
              ].map((o) => (
                <button
                  key={o.v}
                  className={`theme-card t-${o.v} ${settings.appearance === o.v ? 'is-active' : ''}`}
                  onClick={() => update({ appearance: o.v })}
                >
                  <span className="theme-prev" />
                  <span>{o.t}</span>
                </button>
              ))}
            </div>

            <span className="field-label mt">Акцент</span>
            <div className="accents big">
              {Object.entries(ACCENTS).map(([key, a]) => (
                <button
                  key={key}
                  className={`swatch ${settings.accent === key ? 'is-active' : ''}`}
                  style={{ '--sw': a.color }}
                  onClick={() => update({ accent: key })}
                  aria-label={a.label}
                />
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onb-pane">
            <h1 className="onb-title">{name ? `${name}, всё готово` : 'Всё готово'}</h1>
            <div className="summary">
              <SummaryRow label="Вуз" value={group.university} sub={group.institute} />
              <SummaryRow label="Группа" value={group.code} sub={group.title} />
              <SummaryRow
                label="Подгруппа"
                value={subgroup ? `${subgroup}-я` : '—'}
                sub={subgroup ? 'фильтр включён' : hasSubgroups ? 'показываются все' : 'в группе нет подгрупп'}
              />
              <SummaryRow label="Пар в неделю" value={String(weekCount)} sub="осенний семестр" />
            </div>
            <p className="onb-hint">
              Данные хранятся только на вашем устройстве.
            </p>
          </div>
        )}
      </main>

      <footer className="onb-foot">
        {step > 0 ? (
          <button className="btn ghost" onClick={() => go(step - 1)}>Назад</button>
        ) : (
          <button className="btn ghost" onClick={finish}>Пропустить</button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn primary" disabled={!canNext} onClick={() => go(step + 1)}>
            Далее
          </button>
        ) : (
          <button className="btn primary" onClick={finish}>Открыть расписание</button>
        )}
      </footer>
    </div>
  )
}

function SummaryRow({ label, value, sub }) {
  return (
    <div className="summary-row">
      <span className="card-label">{label}</span>
      <span className="summary-value">{value}</span>
      <span className="card-sub">{sub}</span>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="check" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M3 10.5l4.5 4.5L17 5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
