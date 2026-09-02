// ============================================================
//  Трасса: heightfield + коллайдеры (ящики, дуги, петли)
// ============================================================
import { clamp, lerp, bezierY, rng, hashStr, smoothstep } from './utils.js';

export const SURF = {
  asphalt: { name: 'асфальт', grip: 1.0, top: '#4a4f57', body: '#2b2f36', line: '#6b7280' },
  dirt: { name: 'грунт', grip: 0.82, top: '#8a6a3d', body: '#5e4526', line: '#a3814d' },
  grass: { name: 'газон', grip: 0.9, top: '#4f9a3a', body: '#37702a', line: '#67b84e' },
  concrete: { name: 'бетон', grip: 1.08, top: '#9aa0a6', body: '#6f757c', line: '#c3c9cf' },
  wood: { name: 'фанера', grip: 1.0, top: '#c08a4a', body: '#8a5f2c', line: '#e0ab68' },
  sand: { name: 'песок', grip: 0.66, top: '#d9c27a', body: '#a58f4f', line: '#ecd9a0' },
};

const SAMPLE = 6; // px между отсчётами высоты

class Terrain {
  constructor(lenPx, baseY, seed = 1) {
    this.length = lenPx;
    this.baseY = baseY;
    this.n = Math.ceil(lenPx / SAMPLE) + 2;
    this.h = new Float32Array(this.n).fill(baseY);
    this.surf = new Uint8Array(this.n); // индекс в SURF_KEYS
    this.solid = new Uint8Array(this.n).fill(1);
    this.rand = rng(seed);
  }
  idx(x) { return clamp(Math.round(x / SAMPLE), 0, this.n - 1); }
  heightAt(x) {
    if (x < 0) return this.h[0];
    if (x > this.length) return this.h[this.n - 1];
    const f = clamp(x / SAMPLE, 0, this.n - 1.001);
    const i = Math.floor(f);
    return lerp(this.h[i], this.h[i + 1], f - i);
  }
  normalAt(x) {
    const a = this.heightAt(x - 8), b = this.heightAt(x + 8);
    const dx = 16, dy = b - a;
    const l = Math.hypot(dx, dy) || 1;
    return { x: -dy / l, y: -dx / l }; // перпендикуляр, y вверх = отрицательный
  }
  slopeAt(x) { return (this.heightAt(x + 8) - this.heightAt(x - 8)) / 16; }
  surfKeyAt(x) { return SURF_KEYS[this.surf[this.idx(x)]]; }
  surfAt(x) { return SURF[SURF_KEYS[this.surf[this.idx(x)]]]; }
  isSolid(x) { return this.solid[this.idx(x)] === 1; }
  fill(x0, x1, fn, surfKey = 'asphalt') {
    const i0 = clamp(Math.floor(x0 / SAMPLE), 0, this.n - 1);
    const i1 = clamp(Math.ceil(x1 / SAMPLE), 0, this.n - 1);
    const si = SURF_KEYS.indexOf(surfKey);
    for (let i = i0; i <= i1; i++) {
      const x = i * SAMPLE;
      this.h[i] = fn(x);
      this.surf[i] = si;
      this.solid[i] = 1;
    }
  }
  markSurf(x0, x1, surfKey) {
    const i0 = clamp(Math.floor(x0 / SAMPLE), 0, this.n - 1);
    const i1 = clamp(Math.ceil(x1 / SAMPLE), 0, this.n - 1);
    const si = SURF_KEYS.indexOf(surfKey);
    for (let i = i0; i <= i1; i++) this.surf[i] = si;
  }
}

export const SURF_KEYS = Object.keys(SURF);

/** длина трассы в «честных» метрах (для интерфейса) */
export function levelMeters(def) { return Math.round(def.length * 50 / 130); }

// ---------------- коллайдеры ----------------
export class BoxCollider {
  constructor(x, y, w, h, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.type = 'box';
    this.surf = opts.surf || 'wood';
    this.deco = opts.deco || 'crate';
    this.hp = opts.hp || 1;
    this.dead = false;
  }
}

/** Дуга-стенка (квотерпайп / мёртвая петля). normal внутрь (dir=-1) или наружу (+1) */
export class ArcCollider {
  constructor(cx, cy, r, a0, a1, dir = -1, opts = {}) {
    this.cx = cx; this.cy = cy; this.r = r;
    this.a0 = a0; this.a1 = a1; this.dir = dir;
    this.type = 'arc';
    this.surf = opts.surf || 'concrete';
    this.tag = opts.tag || '';
    this.triggered = false;
  }
}

// ---------------- генератор трассы ----------------
class Builder {
  constructor(level) {
    this.def = level;
    this.rand = rng(hashStr(level.id) ^ (level.seed || 1337));
    const lenM = level.length;
    this.lenPx = lenM * 50;
    this.baseY = 0;
    this.terrain = new Terrain(this.lenPx + 2000, 0, hashStr(level.id));
    this.colliders = [];
    this.coins = [];
    this.parcels = [];
    this.cars = [];
    this.decor = [];
    this.checkpoints = [];
    this.spikes = [];
    this.arcs = [];
    this.x = 0;
    this.y = 0;
    this.surf = level.surf || 'asphalt';
    this.gapDepth = 900;
  }

  // участок: len метров, форма профиля
  run(lenM, fn = null, surf = null) {
    const x0 = this.x;
    const len = lenM * 50;
    const y0 = this.y;
    const s = surf || this.surf;
    this.terrain.fill(x0, x0 + len, (x) => {
      const t = (x - x0) / len;
      return y0 + (fn ? fn(t, x, this) : 0);
    }, s);
    this.x += len;
    this.y = this.terrain.heightAt(this.x - 1);
    return this;
  }

  flat(lenM, surf) { return this.run(lenM, null, surf); }

  hill(lenM, amp, waves = 1, surf) {
    return this.run(lenM, (t) => -Math.sin(t * Math.PI * waves) * amp * (0.7 + 0.3 * Math.sin(t * 3.1)), surf);
  }

  whoops(lenM, count, amp, surf) {
    return this.run(lenM, (t) => -Math.sin(t * Math.PI * 2 * count) * amp, surf);
  }

  climb(lenM, dy, surf) {
    return this.run(lenM, (t) => lerp(0, dy, smoothstep(t)), surf);
  }

  /** Кикер (трамплин): подъём + губа. h — высота вылета */
  kicker(lenM, h, surf = 'wood') {
    const x0 = this.x, len = lenM * 50, y0 = this.y;
    this.terrain.fill(x0, x0 + len, (x) => {
      const t = (x - x0) / len;
      const shape = bezierY(t, 0, 0.02, 0.55, 1);
      return y0 - shape * h;
    }, surf);
    this.x += len;
    this.y = this.terrain.heightAt(this.x - 1);
    this.decor.push({ type: 'rampdeco', x: x0, len, h });
    return this;
  }

  /** Яма/пропасть (несущая поверхность убирается) */
  pit(lenM, opts = {}) {
    const x0 = this.x, len = lenM * 50;
    const bottom = this.y + (opts.depth || this.gapDepth);
    this.terrain.fill(x0, x0 + len, () => bottom, opts.surf || 'dirt');
    this.terrain.solid.fill(this.terrain.idx(x0), this.terrain.idx(x0 + len), 0);
    if (opts.spikes) this.spikes.push({ x: x0, w: len, y: bottom });
    this.x += len;
    return this;
  }

  /** Приземление: плавный съезд вниз от губы трамплина */
  landing(lenM, drop, surf) {
    const x0 = this.x, len = lenM * 50, y0 = this.y;
    this.terrain.fill(x0, x0 + len, (x) => {
      const t = (x - x0) / len;
      return y0 + drop * smoothstep(t);
    }, surf || this.surf);
    this.x += len;
    this.y = this.terrain.heightAt(this.x - 1);
    return this;
  }

  /**
   * Кикер с постоянным радиусом: на выходе угол ровно deg.
   * rise = R(1-cos), run = R*sin — как настоящий трамплин.
   */
  ramp(deg, radius, surf = 'wood') {
    const th = (deg * Math.PI) / 180;
    const x0 = this.x, y0 = this.y;
    const run = radius * Math.sin(th);
    const rise = radius * (1 - Math.cos(th));
    this.terrain.fill(x0, x0 + run, (x) => {
      const t = clamp((x - x0) / Math.max(1, run), 0, 1);
      const phi = Math.asin(clamp(t * Math.sin(th), -1, 1));
      return y0 - radius * (1 - Math.cos(phi));
    }, surf);
    this.x += run;
    this.y = this.terrain.heightAt(this.x - 1);
    this.decor.push({ type: 'rampdeco', x: x0, len: run, h: rise });
    return this;
  }

  /** Полка с ящиками */
  crates(x, count, opts = {}) {
    const y = this.terrain.heightAt(x);
    for (let i = 0; i < count; i++) {
      const s = opts.size || 44;
      this.colliders.push(new BoxCollider(x + i * (s + 2), y - s / 2, s, s, { hp: opts.hp || 1, deco: opts.deco || 'crate' }));
    }
    return this;
  }

  tower(x, levels, opts = {}) {
    const y = this.terrain.heightAt(x);
    const s = opts.size || 44;
    for (let l = 0; l < levels; l++) {
      const w = opts.wide ? Math.max(1, levels - l) : 1;
      for (let k = 0; k < w; k++) {
        this.colliders.push(new BoxCollider(x + k * (s + 2) - (w - 1) * s / 2, y - s / 2 - l * s, s, s, { hp: 1 }));
      }
    }
    return this;
  }

  arc(cx, cy, r, a0, a1, dir = -1, opts = {}) {
    const a = new ArcCollider(cx, cy, r, a0, a1, dir, opts);
    this.colliders.push(a);
    this.arcs.push(a);
    return a;
  }

  /** Мёртвая петля радиуса r, стоит на земле в точке x */
  loop(x, r, opts = {}) {
    const groundY = this.terrain.heightAt(x);
    const cy = groundY - r;
    this.arc(x, cy, r, -Math.PI, Math.PI, -1, { tag: 'loop', surf: 'concrete' });
    this.decor.push({ type: 'loop', x, cy, r });
    return this;
  }

  /** Квотерпайпы для хафпайпа */
  quarter(x, r, side, opts = {}) {
    const groundY = this.terrain.heightAt(x);
    const cx = x + (side > 0 ? -r : r);
    const cy = groundY;
    if (side > 0) this.arc(cx, cy, r, -Math.PI / 2, 0, -1, { surf: 'concrete', tag: 'qp' });
    else this.arc(cx, cy, r, Math.PI, Math.PI * 1.5, -1, { surf: 'concrete', tag: 'qp' });
    this.decor.push({ type: 'quarter', x, cy, r, side });
    return this;
  }

  coinsArc(x, count, spread, height) {
    const y = this.terrain.heightAt(x + spread / 2);
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      this.coins.push({ x: x + t * spread, y: y - height * Math.sin(Math.PI * t) - 40, taken: false });
    }
    return this;
  }
  coinsLine(x, count, gap, height) {
    for (let i = 0; i < count; i++) {
      const cx = x + i * gap;
      this.coins.push({ x: cx, y: this.terrain.heightAt(cx) - height, taken: false });
    }
    return this;
  }
  parcel(x, kind = 'pickup') {
    this.parcels.push({ x, y: this.terrain.heightAt(x) - 60, kind, taken: false });
    return this;
  }
  car(x, range, speed, opts = {}) {
    this.cars.push({ x, x0: x - range / 2, x1: x + range / 2, y: 0, dir: 1, speed, w: opts.w || 150, h: opts.h || 70, color: opts.color || '#c94f4f', kind: opts.kind || 'sedan' });
    return this;
  }
  checkpoint(x) {
    this.checkpoints.push({ x, y: this.terrain.heightAt(x), done: false });
    return this;
  }
  decorItem(type, x, opts = {}) {
    this.decor.push({ type, x, y: this.terrain.heightAt(x), ...opts });
    return this;
  }
}

// ============================================================
//  УРОВНИ
// ============================================================
export const LEVELS = [
  {
    id: 'dvor', name: 'Районный двор', place: 'Гаражи у «Пятёрочки»', length: 1500, surf: 'asphalt',
    goal: 'Разберись с газом, забери посылки и крутни первый бэкфлип.',
    reward: 900, tint: '#8fb7e8', timeOfDay: 0.35,
    build(b) {
      b.flat(70);
      b.decorItem('lamp', 30 * 50); b.decorItem('bench', 46 * 50); b.decorItem('lamp', 62 * 50);
      b.checkpoint(70 * 50);
      b.coinsLine(76 * 50, 10, 62, 80);
      b.flat(30);
      b.ramp(24, 1160);
      b.coinsArc(b.x, 10, 1190, 190);
      b.landing(50, 110);
      b.flat(30);
      b.parcel(b.x + 200, 'pickup');
      b.flat(30);
      b.whoops(50, 4, 40, 'dirt');
      b.flat(20);
      b.hill(70, 130, 1);
      b.ramp(28, 1400);
      b.coinsArc(b.x, 12, 1530, 240);
      b.landing(60, 160);
      b.parcel(b.x + 250, 'drop');
      b.flat(40);
      b.checkpoint(b.x);
      b.crates(b.x + 150, 4);
      b.tower(b.x + 500, 3);
      b.flat(40);
      b.hill(80, 180, 2);
      b.ramp(32, 1650);
      b.coinsArc(b.x, 14, 1870, 290);
      b.landing(70, 220);
      b.flat(40);
      b.parcel(b.x + 300, 'pickup');
      b.checkpoint(b.x + 400);
      b.flat(60);
      b.ramp(34, 1820);
      b.coinsArc(b.x, 14, 2040, 320);
      b.landing(70, 240);
      b.parcel(b.x + 400, 'drop');
      b.flat(60);
    },
  },
  {
    id: 'prospekt', name: 'Проспект в час пик', place: 'Пробка, такси и бордюры', length: 1900, surf: 'asphalt',
    goal: 'Доставь три посылки и не собери бампером такси.',
    reward: 1600, tint: '#e8a98f', timeOfDay: 0.62,
    build(b) {
      b.flat(60);
      b.decorItem('lamp', 20 * 50); b.decorItem('lamp', 55 * 50);
      b.checkpoint(60 * 50);
      b.coinsLine(66 * 50, 12, 70, 90);
      b.car(80 * 50, 420, 190, { color: '#d94f4f' });
      b.parcel(100 * 50, 'pickup');
      b.flat(30);
      b.hill(70, 150, 1);
      b.ramp(30, 1570);
      b.coinsArc(b.x, 14, 1700, 270);
      b.landing(60, 200);
      b.parcel(b.x + 250, 'drop');
      b.car(b.x + 500, 520, 230, { color: '#4f7fd9', kind: 'taxi' });
      b.flat(40);
      b.checkpoint(b.x);
      b.whoops(60, 6, 55);
      b.flat(20);
      b.car(b.x + 200, 620, 270, { color: '#e0e0e0', kind: 'van' });
      b.flat(30);
      b.hill(80, 200, 2);
      b.ramp(34, 1820);
      b.coinsArc(b.x, 16, 2125, 330);
      b.landing(70, 250);
      b.parcel(b.x + 300, 'pickup');
      b.flat(50);
      b.checkpoint(b.x);
      b.ramp(30, 1320);
      b.pit(16, { depth: 800 });
      b.landing(50, 170);
      b.flat(40);
      b.parcel(b.x + 300, 'drop');
      b.flat(40);
      b.car(b.x + 300, 700, 300, { color: '#d94f4f' });
      b.hill(90, 240, 2);
      b.ramp(36, 1980);
      b.coinsArc(b.x, 18, 2465, 370);
      b.landing(80, 290);
      b.flat(50);
      b.parcel(b.x + 350, 'pickup');
      b.checkpoint(b.x + 450);
      b.flat(60);
      b.ramp(36, 2060);
      b.coinsArc(b.x, 18, 2550, 380);
      b.landing(80, 300);
      b.parcel(b.x + 400, 'drop');
      b.flat(60);
    },
  },
  {
    id: 'pole', name: 'Колхозное поле', place: 'Грязь, солома и «Беларус»', length: 2100, surf: 'dirt',
    goal: 'Грязь скользит: держи газ в пол и не утони в яме.',
    reward: 2400, tint: '#cfd98f', timeOfDay: 0.2,
    build(b) {
      b.flat(60, 'dirt');
      b.decorItem('hay', 30 * 50); b.decorItem('tractor', 52 * 50); b.decorItem('hay', 70 * 50);
      b.checkpoint(60 * 50);
      b.coinsLine(66 * 50, 14, 80, 80);
      b.whoops(70, 8, 60, 'dirt');
      b.flat(20);
      b.parcel(b.x + 200, 'pickup');
      b.flat(20);
      b.hill(80, 210, 2, 'dirt');
      b.ramp(32, 1650, 'wood');
      b.coinsArc(b.x, 14, 2040, 310);
      b.landing(70, 240, 'dirt');
      b.parcel(b.x + 300, 'drop');
      b.flat(40);
      b.checkpoint(b.x);
      b.ramp(30, 1480, 'wood');
      b.pit(20, { depth: 900, spikes: true, surf: 'sand' });
      b.landing(60, 200, 'dirt');
      b.flat(30);
      b.tower(b.x + 250, 4, { wide: true });
      b.hill(90, 250, 3, 'dirt');
      b.ramp(36, 2060, 'wood');
      b.coinsArc(b.x, 16, 2380, 360);
      b.landing(80, 280, 'dirt');
      b.parcel(b.x + 400, 'pickup');
      b.flat(50);
      b.checkpoint(b.x);
      b.whoops(80, 10, 70, 'sand');
      b.car(b.x + 300, 800, 250, { color: '#3f7a2f', kind: 'tractor' });
      b.flat(40);
      b.hill(100, 280, 2, 'dirt');
      b.ramp(38, 2230, 'wood');
      b.coinsArc(b.x, 18, 2720, 420);
      b.landing(90, 320, 'dirt');
      b.parcel(b.x + 400, 'drop');
      b.flat(60);
      b.checkpoint(b.x);
      b.flat(50);
      b.ramp(38, 2310, 'wood');
      b.coinsArc(b.x, 18, 2805, 430);
      b.landing(90, 330, 'dirt');
      b.flat(70);
    },
  },
  {
    id: 'stroyka', name: 'Ночная стройка', place: 'Котлованы, арматура, бетон', length: 2300, surf: 'concrete',
    goal: 'В конце мёртвая петля. Не сбавляй газ на подходе.',
    reward: 3600, tint: '#6f7fd9', timeOfDay: 0.9,
    build(b) {
      b.flat(60, 'concrete');
      b.decorItem('lamp', 25 * 50); b.decorItem('lamp', 50 * 50);
      b.checkpoint(60 * 50);
      b.crates(b.x + 300, 6, { size: 46 });
      b.coinsLine(70 * 50, 12, 80, 90);
      b.hill(70, 190, 2, 'concrete');
      b.ramp(34, 1820, 'wood');
      b.coinsArc(b.x, 16, 2210, 340);
      b.landing(70, 250, 'concrete');
      b.parcel(b.x + 300, 'pickup');
      b.flat(40);
      b.checkpoint(b.x);
      b.ramp(32, 1570, 'wood');
      b.pit(18, { depth: 1000, spikes: true, surf: 'concrete' });
      b.landing(60, 220, 'concrete');
      b.flat(30);
      b.tower(b.x + 250, 5, { wide: true, size: 42 });
      b.hill(80, 240, 2, 'concrete');
      b.ramp(38, 2140, 'wood');
      b.coinsArc(b.x, 18, 2550, 400);
      b.landing(80, 300, 'concrete');
      b.flat(50);
      b.checkpoint(b.x);
      b.car(b.x + 400, 700, 270, { color: '#e8b53f', kind: 'truck' });
      b.parcel(b.x + 800, 'drop');
      b.flat(40);
      b.hill(90, 260, 3, 'concrete');
      b.ramp(40, 2310, 'wood');
      b.coinsArc(b.x, 18, 2805, 430);
      b.landing(80, 320, 'concrete');
      b.flat(60);
      b.checkpoint(b.x);
      // разгонная прямая и мёртвая петля
      b.flat(100, 'concrete');
      b.coinsLine(b.x - 400, 14, 60, 60);
      b.loop(b.x + 150, 260);
      b.flat(80, 'concrete');
      b.parcel(b.x + 300, 'drop');
      b.flat(70);
    },
  },
  {
    id: 'karer', name: 'Карьер «Залипалово»', place: 'Обрывы, камни, бесконечный флип', length: 2600, surf: 'dirt',
    goal: 'Максимальная дистанция. Тут ломают самокаты пачками.',
    reward: 5200, tint: '#d98f6f', timeOfDay: 0.45,
    build(b) {
      b.flat(60, 'dirt');
      b.checkpoint(60 * 50);
      b.hill(90, 290, 2, 'dirt');
      b.ramp(36, 2060, 'wood');
      b.coinsArc(b.x, 18, 2550, 390);
      b.landing(80, 300, 'dirt');
      b.flat(40);
      b.checkpoint(b.x);
      b.ramp(34, 1730, 'wood');
      b.pit(24, { depth: 1100, spikes: true, surf: 'sand' });
      b.landing(70, 240, 'dirt');
      b.parcel(b.x + 300, 'pickup');
      b.flat(40);
      b.whoops(90, 12, 80, 'dirt');
      b.hill(100, 330, 3, 'dirt');
      b.ramp(40, 2390, 'wood');
      b.coinsArc(b.x, 20, 2975, 450);
      b.landing(90, 340, 'dirt');
      b.parcel(b.x + 400, 'drop');
      b.flat(50);
      b.checkpoint(b.x);
      b.tower(b.x + 300, 6, { wide: true, size: 44 });
      b.hill(110, 370, 2, 'dirt');
      b.ramp(42, 2560, 'wood');
      b.coinsArc(b.x, 20, 3230, 490);
      b.landing(100, 380, 'dirt');
      b.flat(60);
      b.parcel(b.x + 400, 'pickup');
      b.checkpoint(b.x + 500);
      b.flat(60);
      b.ramp(42, 2640, 'wood');
      b.coinsArc(b.x, 20, 3400, 510);
      b.landing(100, 400, 'dirt');
      b.parcel(b.x + 500, 'drop');
      b.hill(120, 390, 3, 'dirt');
      b.ramp(44, 2800, 'wood');
      b.coinsArc(b.x, 22, 3570, 540);
      b.landing(110, 420, 'dirt');
      b.flat(90);
    },
  },
];

// ---------------- сборка ----------------
export function buildLevel(levelDef) {
  const b = new Builder(levelDef);
  levelDef.build(b);
  // добиваем заявленную длину трассы: финишная прямая с холмами
  const need = levelDef.length * 50 + 500 - b.x;
  if (need > 300) {
    const m = need / 50;
    b.flat(m * 0.2);
    b.hill(m * 0.22, 130, 1, levelDef.surf);
    b.flat(m * 0.12);
    b.ramp(26, 1160, 'wood');
    b.landing(m * 0.2, 150, levelDef.surf);
    b.flat(m * 0.3);
  }
  const out = {
    def: levelDef,
    terrain: b.terrain,
    colliders: b.colliders,
    coins: b.coins,
    parcels: b.parcels,
    cars: b.cars,
    decor: b.decor,
    checkpoints: b.checkpoints,
    spikes: b.spikes,
    arcs: b.arcs,
    startX: 120,
    finishX: b.x,
    length: b.x,
  };
  // чекпоинты: первый всегда у старта + финиш
  out.checkpoints.unshift({ x: 200, y: b.terrain.heightAt(200), done: false });
  out.checkpoints.push({ x: b.x - 100, y: b.terrain.heightAt(b.x - 100), done: false, finish: true });
  out.checkpoints.sort((a, c) => a.x - c.x);
  return out;
}
