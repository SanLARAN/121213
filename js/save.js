// ============================================================
//  Сохранение прогресса (localStorage)
// ============================================================
const KEY = 'kugo_stunt_save_v2';

const defaultSave = () => ({
  money: 2500,
  owned: ['kids', 'm2'],
  current: 'm2',
  upgrades: {},
  cosmetics: {},
  levelsDone: {},
  best: {},
  unlocked: 1,
  stats: { distance: 0, flips: 0, deliveries: 0, crashes: 0, bestCombo: 0 },
  muted: false,
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const s = { ...defaultSave(), ...JSON.parse(raw) };
    s.stats = { ...defaultSave().stats, ...(s.stats || {}) };
    if (!s.owned.includes('kids')) s.owned.push('kids');
    return s;
  } catch (e) {
    return defaultSave();
  }
}

export function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* приватный режим */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return defaultSave();
}
