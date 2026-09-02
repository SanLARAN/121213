// ============================================================
//  Утилиты: математика, рандом с сидом, кривые, звук
// ============================================================

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const TAU = Math.PI * 2;

export function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}

export function approach(v, target, delta) {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return target;
}

/** Детерминированный ГПСЧ (mulberry32) — одинаковая трасса каждый заезд */
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a1, b1) => a1 + f() * (b1 - a1);
  f.int = (a1, b1) => Math.floor(a1 + f() * (b1 - a1 + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.chance = (p) => f() < p;
  return f;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Кубическая кривая Безье по Y для X (используется для рамп) */
export function bezierY(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }

/** Расстояние от точки до отрезка + ближайшая точка */
export function closestOnSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby || 1e-6;
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = clamp(t, 0, 1);
  return { x: ax + abx * t, y: ay + aby * t, t };
}

export function hexToRgb(hex) {
  const h = (hex || '#fff').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgba(hex, a) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
export function shade(hex, k) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => Math.round(clamp(v * k, 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function fmtMoney(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
export const fmtNum = (n, d = 0) => n.toFixed(d);

// ---------------- звук (WebAudio, без файлов) ----------------
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engine = null;
    this.master = null;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }
  resume() { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  tone(freq, dur, type = 'square', vol = 0.16, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.2, filterFreq = 900) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  coin() { this.tone(880, 0.07, 'square', 0.1); setTimeout(() => this.tone(1320, 0.09, 'square', 0.09), 60); }
  trick(v) { this.tone(520 + v * 3, 0.1, 'triangle', 0.14, 400); }
  crash() { this.noise(0.4, 0.35, 700); this.tone(90, 0.3, 'sawtooth', 0.15, -40); }
  land() { this.noise(0.12, 0.16, 500); }
  boost() { this.noise(0.3, 0.2, 1600); this.tone(200, 0.25, 'sawtooth', 0.08, 500); }
  ui() { this.tone(660, 0.05, 'square', 0.07); }
  pickup() { this.tone(440, 0.08, 'triangle', 0.12); setTimeout(() => this.tone(740, 0.1, 'triangle', 0.12), 70); }
  money() { [0, 90, 180].forEach((d, i) => setTimeout(() => this.tone(700 + i * 220, 0.09, 'square', 0.1), d)); }

  // гул мотора
  startEngine() {
    this.init();
    if (!this.ctx || this.engine) return;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = 60; o2.frequency.value = 90;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.value = 0.0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(); o2.start();
    this.engine = { o, o2, g, f };
  }
  engineUpdate(rpm01, load) {
    if (!this.engine) return;
    const fr = 45 + rpm01 * 260;
    this.engine.o.frequency.setTargetAtTime(fr, this.ctx.currentTime, 0.05);
    this.engine.o2.frequency.setTargetAtTime(fr * 1.5, this.ctx.currentTime, 0.05);
    this.engine.f.frequency.setTargetAtTime(320 + rpm01 * 900, this.ctx.currentTime, 0.06);
    this.engine.g.gain.setTargetAtTime(0.02 + load * 0.075, this.ctx.currentTime, 0.08);
  }
  engineStop() { if (this.engine) { this.engine.g.gain.value = 0; } }
}

export const sfx = new Sfx();
