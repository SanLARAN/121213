import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_GROUP_ID, SEMESTER } from '../data/groups.js'

const KEY = 'raspisanie.settings.v1'

export const ACCENTS = {
  blue: { label: 'Синий', color: '#0A84FF' },
  purple: { label: 'Фиолетовый', color: '#BF5AF2' },
  pink: { label: 'Розовый', color: '#FF375F' },
  orange: { label: 'Оранжевый', color: '#FF9F0A' },
  green: { label: 'Зелёный', color: '#30D158' },
  graphite: { label: 'Графит', color: '#8E8E93' },
}

export const DEFAULTS = {
  onboarded: false,
  name: '',
  groupId: DEFAULT_GROUP_ID,
  appearance: 'dark', // system | light | dark
  accent: 'blue',
  subgroup: 0, // 0 = все, 1, 2
  hidePE: false,
  showTeacher: true,
  showRoom: true,
  showPeriod: false,
  compact: false,
  showEmptyDays: true,
  colorfulCards: true,
  firstWeekParity: SEMESTER.firstWeekParity,
  hiddenSubjects: [],
  aliases: {},
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch { /* ignore */ }
  }, [settings])

  // Тема
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.appearance === 'dark'
        || (settings.appearance === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#06070a' : '#eceaf1')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.appearance])

  // Акцентный цвет
  useEffect(() => {
    const accent = ACCENTS[settings.accent] ?? ACCENTS.blue
    document.documentElement.style.setProperty('--accent', accent.color)
  }, [settings.accent])

  const update = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [])

  const reset = useCallback(() => setSettings({ ...DEFAULTS }), [])

  return { settings, update, reset }
}
