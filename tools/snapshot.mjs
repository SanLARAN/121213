// ============================================================
//  Рекордер Canvas2D-команд: прогоняет настоящий рендер игры
//  и пишет JSON, который tools/rasterize.py превращает в PNG.
//  Это не «подделка» графики — рисуется ровно тот же код, что и в браузере.
// ============================================================
import { LEVELS } from '../js/terrain.js';
import { Game, makeSpec } from '../js/game.js';
import { Scooter } from '../js/vehicle.js';
import * as R from '../js/render.js';
import { CFG } from '../js/config.js';
import fs from 'fs';
fs.mkdirSync('tools/shots', { recursive: true });

class GradientRec {
  constructor(kind, coords) { this.kind = kind; this.coords = coords; this.stops = []; }
  addColorStop(o, c) { this.stops.push([o, c]); }
}

class RecCtx {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.ops = [];
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.path = [];
    this.cur = null;
    this.globalAlpha = 1;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
  }
  _push(op) { this.ops.push(op); }
  save() { this.stack.push([this.m.slice(), this.globalAlpha, this.fillStyle, this.strokeStyle, this.lineWidth, this.lineCap, this.font, this.textAlign, this.textBaseline]); }
  restore() { const s = this.stack.pop(); if (s) { this.m = s[0]; this.globalAlpha = s[1]; this.fillStyle = s[2]; this.strokeStyle = s[3]; this.lineWidth = s[4]; this.lineCap = s[5]; this.font = s[6]; this.textAlign = s[7]; this.textBaseline = s[8]; } }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(a) { this.transform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); }
  beginPath() { this.path = []; this.cur = null; }
  moveTo(x, y) { this.cur = [[x, y]]; this.path.push(this.cur); }
  lineTo(x, y) { if (!this.cur) this.moveTo(x, y); else this.cur.push([x, y]); }
  closePath() { if (this.cur && this.cur.length) this.cur.push(this.cur[0].slice()); }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this.cur) this.moveTo(cx, cy);
    const p0 = this.cur[this.cur.length - 1];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      this.cur.push([u * u * p0[0] + 2 * u * t * cx + t * t * x, u * u * p0[1] + 2 * u * t * cy + t * t * y]);
    }
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.cur) this.moveTo(c1x, c1y);
    const p0 = this.cur[this.cur.length - 1];
    for (let i = 1; i <= 16; i++) {
      const t = i / 16, u = 1 - t;
      this.cur.push([
        u * u * u * p0[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * p0[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      ]);
    }
  }
  arc(x, y, r, a0, a1, ccw = false) {
    let start = a0, end = a1;
    if (!ccw && end < start) end += Math.PI * 2;
    if (ccw && end > start) end -= Math.PI * 2;
    const N = Math.max(6, Math.ceil(Math.abs(end - start) / 0.16));
    if (!this.cur) { this.cur = []; this.path.push(this.cur); }
    for (let i = 0; i <= N; i++) {
      const a = start + (end - start) * (i / N);
      this.cur.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  }
  ellipse(x, y, rx, ry, rot, a0, a1) {
    const N = 24;
    this.cur = [];
    this.path.push(this.cur);
    for (let i = 0; i <= N; i++) {
      const a = a0 + (a1 - a0) * (i / N);
      const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      this.cur.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
    }
  }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  _style(v) {
    if (v instanceof GradientRec) return { gradient: { kind: v.kind, coords: v.coords, stops: v.stops } };
    return { color: String(v) };
  }
  fill() {
    if (!this.path.length) return;
    this._push({ op: 'fill', polys: this.path.map((p) => p.slice()), m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.fillStyle) });
  }
  stroke() {
    if (!this.path.length) return;
    this._push({ op: 'stroke', polys: this.path.map((p) => p.slice()), m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.strokeStyle), w: this.lineWidth, cap: this.lineCap });
  }
  fillRect(x, y, w, h) {
    this._push({ op: 'fill', polys: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]], m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.fillStyle) });
  }
  strokeRect(x, y, w, h) {
    this._push({ op: 'stroke', polys: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]], m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.strokeStyle), w: this.lineWidth, cap: this.lineCap });
  }
  clearRect(x, y, w, h) { this._push({ op: 'clear', polys: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]], m: this.m.slice() }); }
  createLinearGradient(x0, y0, x1, y1) { return new GradientRec('linear', [x0, y0, x1, y1]); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new GradientRec('radial', [x0, y0, r0, x1, y1, r1]); }
  createPattern() { return null; }
  setLineDash() {}
  getLineDash() { return []; }
  measureText(t) { return { width: String(t).length * 8 }; }
  fillText(t, x, y) {
    this._push({ op: 'text', text: String(t), x, y, m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.fillStyle), font: this.font, align: this.textAlign, baseline: this.textBaseline });
  }
  strokeText(t, x, y) {
    this._push({ op: 'textstroke', text: String(t), x, y, m: this.m.slice(), alpha: this.globalAlpha, style: this._style(this.strokeStyle), w: this.lineWidth, font: this.font, align: this.textAlign });
  }
  clip() {}
  drawImage() {}
}
function mul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

// пустой контекст для холостых кадров (физику гоняем без отрисовки)
const grad0 = { addColorStop() {} };
const NOOP = new Proxy({}, {
  get(t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad0;
    if (p === 'measureText') return () => ({ width: 10 });
    if (typeof p === 'string') return () => {};
    return undefined;
  },
  set() { return true; },
});

// ---------- стабы окружения ----------
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, AudioContext: null };
globalThis.document = {
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, appendChild() {}, addEventListener() {}, querySelector: () => null, classList: { toggle() {}, add() {}, remove() {} } }),
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const mkSave = (over = {}) => ({
  money: 90000, owned: ['kids', 'm2', 's3', 'kirin', 'gbooster', 'pitbike'], current: 'kirin',
  upgrades: { kirin: { motor: 3, battery: 2, wheels: 3, suspension: 2, frame: 2 } },
  cosmetics: { kirin: { paint: { id: 'cyan', color: '#00e5ff' }, glow: { id: 'purple', color: '#b14cff' }, wheelskin: { id: 'turbo' }, rider: { id: 'yando', box: '#ff2e2e' }, wing: { id: 'spoiler' } } },
  levelsDone: {}, best: {}, unlocked: 9, muted: true,
  stats: { distance: 0, flips: 0, deliveries: 0, crashes: 0, bestCombo: 0 },
  ...over,
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function pilot(game) {
  const sc = game.sc;
  const a = ((sc.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const want = clamp(-a * 3.2, -7, 7);
  const lean = clamp((want - sc.omega) * 0.35, -1, 1);
  game.keys['arrowup'] = lean < -0.15;
  game.keys['arrowdown'] = lean > 0.15;
}

const W = 1280, H = 720;

function shot(name, build) {
  const ctx = new RecCtx(W, H);
  build(ctx);
  fs.writeFileSync(`tools/shots/${name}.json`, JSON.stringify({ w: W, h: H, ops: ctx.ops }));
  console.log(`  ${name}: ${ctx.ops.length} команд`);
}

// --- 1. Кадр заезда: разгон по двору ---
const save = mkSave();
const game = new Game({ width: W, height: H, getContext: () => null, getBoundingClientRect: () => ({ width: W, height: H }), addEventListener() {} }, null, save);
game.ctx = NOOP;
game.resize = function () { this.cssW = W; this.cssH = H; this.dpr = 1; };
game.resize();
game.startLevel('dvor');
let t = 0;
for (let i = 0; i < 60 * 12; i++) { t += 16.6667; game.keys['arrowright'] = true; pilot(game); game.frame(t); }
shot('01-razgon', (ctx) => { game.ctx = ctx; game.draw(0.016); });

// --- 2. Кадр в воздухе после трамплина ---
const g2 = new Game({ width: W, height: H, getContext: () => null, getBoundingClientRect: () => ({ width: W, height: H }), addEventListener() {} }, null, mkSave({ current: 'gbooster' }));
g2.ctx = NOOP;
g2.resize = function () { this.cssW = W; this.cssH = H; this.dpr = 1; };
g2.resize();
g2.startLevel('karer');
let t2 = 0, snapped = false;
for (let i = 0; i < 60 * 60 && !snapped; i++) {
  t2 += 16.6667;
  g2.keys['arrowright'] = true;
  if (g2.sc.airborne && g2.sc.airTime > 0.35) { g2.keys['arrowup'] = true; g2.keys['arrowdown'] = false; }
  else pilot(g2);
  g2.frame(t2);
  if (g2.sc.airborne && g2.sc.airTime > 0.6) {
    shot('02-vozduh', (ctx) => { g2.ctx = ctx; g2.draw(0.016); });
    snapped = true;
  }
}
if (!snapped) console.log('  ! не удалось поймать кадр в воздухе');

// --- 3. Превью самоката для карточки гаража ---
{
  const ctx = new RecCtx(560, 216);
  const { spec, cosmetics } = makeSpec('kirin', save);
  const sc = new Scooter(spec, 0, 0, cosmetics);
  const fakeWorld = { terrain: { heightAt: () => 0, isSolid: () => false, surfKeyAt: () => 'asphalt' } };
  sc.angle = -0.14;
  for (let i = 0; i < 40; i++) sc.rider.update(sc, fakeWorld, { lean: 0, pose: 'ride' }, 1 / 60);
  ctx.save();
  ctx.translate(560 * 0.44, 216 * 0.72);
  ctx.scale(0.62, 0.62);
  ctx.translate(-sc.x, -sc.y);
  R.drawScooter(ctx, sc, 0.4);
  ctx.restore();
  fs.writeFileSync('tools/shots/03-preview.json', JSON.stringify({ w: 560, h: 216, ops: ctx.ops }));
  console.log(`  03-preview: ${ctx.ops.length} команд`);
}

// --- 4. Питбайк ---
{
  const ctx = new RecCtx(560, 216);
  const { spec, cosmetics } = makeSpec('pitbike', mkSave({ current: 'pitbike', cosmetics: { pitbike: { paint: { id: 'gold', color: '#ffc400' }, glow: { id: 'red', color: '#ff3b3b' }, wheelskin: { id: 'spokes' }, rider: { id: 'gold', box: '#ffcf3d' }, wing: { id: 'flag' } } } }));
  const sc = new Scooter(spec, 0, 0, cosmetics);
  const fakeWorld = { terrain: { heightAt: () => 0, isSolid: () => false, surfKeyAt: () => 'asphalt' } };
  sc.angle = -0.1;
  for (let i = 0; i < 40; i++) sc.rider.update(sc, fakeWorld, { lean: 0, pose: 'ride' }, 1 / 60);
  ctx.save();
  ctx.translate(560 * 0.44, 216 * 0.76);
  ctx.scale(0.52, 0.52);
  ctx.translate(-sc.x, -sc.y);
  R.drawScooter(ctx, sc, 0.4);
  ctx.restore();
  fs.writeFileSync('tools/shots/04-pitbike.json', JSON.stringify({ w: 560, h: 216, ops: ctx.ops }));
  console.log(`  04-pitbike: ${ctx.ops.length} команд`);
}

console.log('готово');
