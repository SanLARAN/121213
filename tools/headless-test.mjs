// ============================================================
//  Головлесс-прогон реальной игровой логики (без браузера)
//  node tools/headless-test.mjs
// ============================================================
import { LEVELS, buildLevel } from '../js/terrain.js';
import { Scooter } from '../js/vehicle.js';
import { Game, makeSpec } from '../js/game.js';
import { CFG } from '../js/config.js';

let fails = 0, checks = 0;
const fails_list = [];
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; fails_list.push(msg); console.error('  ✗ ' + msg); }
}
function num(v, msg) { ok(Number.isFinite(v), msg + ` (получено ${v})`); }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- заглушки DOM ----------
const gradient = { addColorStop() {} };
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'canvas') return canvasStub;
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => gradient;
    if (p === 'measureText') return () => ({ width: 10 });
    if (typeof p === 'string') return () => {};
    return undefined;
  },
  set() { return true; },
});
const canvasStub = {
  width: 1280, height: 720,
  getContext: () => ctxStub,
  getBoundingClientRect: () => ({ width: 1280, height: 720, left: 0, top: 0 }),
  addEventListener() {},
};
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
  AudioContext: null, requestAnimationFrame: () => {},
};
globalThis.document = {
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, appendChild() {}, addEventListener() {}, querySelector: () => null, classList: { toggle() {}, add() {}, remove() {} } }),
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

/** ПД-автопилот: держит горизонт и гасит вращение */
function pilot(game) {
  const sc = game.sc;
  const a = ((sc.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const wantOmega = clamp(-a * 3.2, -7, 7);
  const lean = clamp((wantOmega - sc.omega) * 0.35, -1, 1);
  game.keys['arrowup'] = lean < -0.15;
  game.keys['arrowdown'] = lean > 0.15;
}

const mkSave = (over = {}) => ({
  money: 100000, owned: ['kids', 's3', 'gbooster'], current: 's3',
  upgrades: { s3: { motor: 2, wheels: 1 } }, cosmetics: {},
  levelsDone: {}, best: {}, unlocked: 9, muted: false,
  stats: { distance: 0, flips: 0, deliveries: 0, crashes: 0, bestCombo: 0 },
  ...over,
});
const save = mkSave();

console.log('=== 1. Генерация трасс ===');
for (const def of LEVELS) {
  const lv = buildLevel(def);
  let nan = 0, maxSlope = 0;
  for (let x = 0; x < lv.length; x += 20) {
    if (!Number.isFinite(lv.terrain.heightAt(x))) nan++;
    maxSlope = Math.max(maxSlope, Math.abs(lv.terrain.slopeAt(x)));
  }
  ok(nan === 0, `${def.id}: высоты без NaN`);
  ok(lv.checkpoints.length >= 4, `${def.id}: чекпоинтов ${lv.checkpoints.length}`);
  ok(lv.coins.length > 5, `${def.id}: монет ${lv.coins.length}`);
  console.log(`  ${def.id}: ${Math.round(lv.length / CFG.PX_PER_M)} м, объектов ${lv.colliders.length}, монет ${lv.coins.length}, посылок ${lv.parcels.length}, машин ${lv.cars.length}, макс.уклон ${maxSlope.toFixed(2)}`);
}

console.log('=== 2. Спеки и тюнинг ===');
const base = makeSpec('s3', mkSave({ upgrades: {} })).spec;
const upg = makeSpec('s3', save).spec;
ok(upg.power > base.power, `мотор 2 ур. поднимает тягу: ${base.power} -> ${upg.power}`);
ok(upg.wheelR > base.wheelR, `колёса 1 ур. увеличивают радиус: ${base.wheelR} -> ${upg.wheelR}`);

console.log('=== 3. Реальный заезд: автопилот по «Районному двору» ===');
const game = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
game.resize();
game.startLevel('dvor');
let ts = 0;
for (let i = 0; i < 60 * 90; i++) {
  ts += 16.6667;
  game.keys['arrowright'] = true;
  pilot(game);
  if (game.state === 'finished' || game.state === 'crashMenu') break;
  game.frame(ts);
}
const rs = game.runStats;
num(game.sc.x, 'x самоката');
num(game.sc.angle, 'угол шасси');
console.log(`  дистанция ${Math.round(rs.distance)} м, макс ${Math.round(rs.maxSpeed)} км/ч, монет ${rs.coins}, флипов ${rs.flips}, ящиков ${rs.crates}, комбо ${Math.round(rs.bestCombo)}, денег ${rs.money} ₽, состояние ${game.state}${game.crashReason ? ' — ' + game.crashReason : ''}`);
ok(rs.distance > 400, `проехал ${Math.round(rs.distance)} м (>400)`);
ok(rs.coins > 10, `собрал монет ${rs.coins}`);
ok(rs.money > 500, `заработал ${rs.money} ₽`);
ok(game.save.money > 100000, 'деньги легли в сохранение');

console.log('=== 4. Трамплин: вылет, вращение, приземление ===');
{
  const rampDef = {
    id: 'ramp-test', name: 'ramp', place: '', length: 900, surf: 'asphalt',
    goal: '', reward: 0, tint: '#888', timeOfDay: 0.4,
    build(b) { b.flat(120); b.ramp(40, 1400); b.landing(200, 200); b.flat(100); },
  };
  LEVELS.push(rampDef);
  const g = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
  g.resize();
  g.startLevel('ramp-test');
  let t = 0, air = 0, maxHeight = 0, rot = 0, groundY = 0, launchSpeed = 0, flips = 0;
  for (let i = 0; i < 60 * 40; i++) {
    t += 16.6667;
    g.keys['arrowright'] = true;
    // как живой игрок: крутим бэкфлип первые 0.6 с, потом выравниваемся
    // как живой игрок: крутим до ~330°, потом выравниваемся
    if (g.sc.airborne && Math.abs(g.sc.airRot) < 5.6) {
      g.keys['arrowup'] = true; g.keys['arrowdown'] = false;
    } else {
      pilot(g);
    }
    const wasAir = g.sc.airborne;
    g.frame(t);
    if (g.sc.airborne) {
      air = Math.max(air, g.sc.airTime);
      rot = Math.max(rot, Math.abs(g.sc.airRot));
      const gy = g.level.terrain.heightAt(g.sc.x);
      maxHeight = Math.max(maxHeight, gy - g.sc.y);
      if (!wasAir) launchSpeed = g.sc.speedKmh();
    }
    if (g.runStats.flips > flips) flips = g.runStats.flips;
    if (g.state === 'crashMenu') break;
  }
  console.log(`  вылет на ${Math.round(launchSpeed)} км/ч, эйр ${air.toFixed(2)} с, высота ${Math.round(maxHeight)} px, поворот ${Math.round(rot * 180 / Math.PI)}°, засчитано флипов ${flips}, состояние ${g.state}`);
  ok(air > 0.6, `время в воздухе ${air.toFixed(2)} с (>0.6)`);
  ok(maxHeight > 150, `высота прыжка ${Math.round(maxHeight)} px (>150)`);
  ok(rot > 3.0, `накрутил ${Math.round(rot * 180 / Math.PI)}°`);
  ok(flips >= 1, `игра засчитала ${flips} флипов`);
  LEVELS.pop();
}

console.log('=== 5. Рэгдолл после аварии ===');
{
  const lv = buildLevel(LEVELS[0]);
  const { spec } = makeSpec('s3', save);
  const world = { terrain: lv.terrain, colliders: [], cars: [], coins: [], parcels: [], spikes: [], onCrash() {}, onCrateSmash() {}, onNearMiss() {} };
  const s2 = new Scooter(spec, 400, lv.terrain.heightAt(400), {});
  for (let i = 0; i < 400; i++) s2.update({ throttle: 1, brake: 0, lean: 0, pose: 'ride' }, world, CFG.STEP);
  const v0 = s2.speedKmh();
  ok(v0 > 20, `разогнался до ${v0.toFixed(1)} км/ч`);
  s2.crash(world, 'тест');
  ok(s2.crashed, 'флаг аварии выставлен');
  ok(s2.rider.detached, 'райдер отцепился в рэгдолл');
  for (let i = 0; i < 180; i++) s2.rider.update(s2, world, { lean: 0, pose: 'ride' }, CFG.STEP);
  const rp = s2.rider.ragParts;
  num(rp.head.x, 'рэгдолл: голова x');
  num(rp.head.y, 'рэгдолл: голова y');
  ok(rp.head.y < lv.terrain.heightAt(rp.head.x) + 30, 'голова не провалилась сквозь землю');
  const spread = Math.hypot(rp.handL.x - rp.footR.x, rp.handL.y - rp.footR.y);
  ok(spread > 40, `рэгдолл раскинулся: ${Math.round(spread)} px`);
  console.log(`  разгон ${v0.toFixed(1)} км/ч, голова (${Math.round(rp.head.x)}, ${Math.round(rp.head.y)}), разброс конечностей ${Math.round(spread)} px`);
}

console.log('=== 6. Устойчивость: 60 секунд по холмам без аварии ===');
{
  const flatDef = {
    id: 'flat-test', name: 'flat', place: '', length: 4000, surf: 'asphalt',
    goal: '', reward: 0, tint: '#888', timeOfDay: 0.4,
    build(b) { b.flat(150); b.hill(150, 180, 2); b.flat(100); b.whoops(150, 10, 60); b.flat(150); b.hill(150, 220, 3); b.flat(200); },
  };
  LEVELS.push(flatDef);
  const g3 = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
  g3.resize();
  g3.startLevel('flat-test');
  let t = 0;
  for (let i = 0; i < 60 * 60; i++) {
    t += 16.6667;
    g3.keys['arrowright'] = true;
    pilot(g3);
    if (g3.state !== 'playing') break;
    g3.frame(t);
  }
  console.log(`  дистанция ${Math.round(g3.runStats.distance)} м, макс ${Math.round(g3.runStats.maxSpeed)} км/ч, состояние ${g3.state}${g3.crashReason ? ' — ' + g3.crashReason : ''}`);
  ok(g3.state === 'playing', `не разбился за 60 секунд (${g3.state}${g3.crashReason ? ': ' + g3.crashReason : ''})`);
  ok(g3.runStats.distance > 900, `проехал ${Math.round(g3.runStats.distance)} м за минуту`);
  ok(g3.runStats.maxSpeed > 60, `разогнался до ${Math.round(g3.runStats.maxSpeed)} км/ч`);
  LEVELS.pop();
}

console.log('=== 7. Все трассы автопилотом (информативно) ===');
for (const def of LEVELS) {
  const g2 = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
  g2.resize();
  g2.startLevel(def.id);
  let t = 0;
  for (let i = 0; i < 60 * 90; i++) {
    t += 16.6667;
    g2.keys['arrowright'] = true;
    pilot(g2);
    if (g2.state !== 'playing') break;
    g2.frame(t);
  }
  const d = g2.runStats.distance;
  num(d, `${def.id}: дистанция`);
  console.log(`  ${def.id}: ${Math.round(d)} м, макс ${Math.round(g2.runStats.maxSpeed)} км/ч, флипов ${g2.runStats.flips}, эйр ${g2.runStats.bestAir.toFixed(2)} с, денег ${g2.runStats.money} ₽, ${g2.state}${g2.crashReason ? ' — ' + g2.crashReason : ''}`);
}

console.log('=== 8. Эксплойт: «держать W на месте» не даёт очков ===');
{
  const g4 = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
  g4.resize();
  g4.startLevel('dvor');
  let t = 0;
  for (let i = 0; i < 60 * 3; i++) {
    t += 16.6667;
    // игрок «газует» и тянет руль на себя, но самокат стоит (как у стены)
    g4.keys['arrowright'] = true;
    g4.keys['arrowup'] = true;
    g4.frame(t);
    // фиксируем на месте: сбрасываем скорость и позицию
    g4.sc.vx = 0; g4.sc.vy = 0;
    g4.sc.x = g4.level.terrain ? g4.sc.x : g4.sc.x;
  }
  const st = g4.runStats;
  console.log(`  за 3 с «газа на месте»: комбо ${Math.round(g4.combo)}, лучший ${Math.round(st.bestCombo)}, денег ${st.money} ₽`);
  ok(g4.combo === 0 && st.bestCombo === 0, `на месте очков нет (комбо ${Math.round(g4.combo)}/${Math.round(st.bestCombo)})`);
  ok(st.money === 0, `на месте денег нет (${st.money} ₽)`);
}

console.log('=== 8б. Настоящий вили в движении даёт очки ===');
{
  const g5 = new Game(canvasStub, null, mkSave({ current: 'gbooster' }));
  g5.resize();
  g5.startLevel('dvor');
  let t = 0, sawCombo = 0;
  for (let i = 0; i < 60 * 6; i++) {
    t += 16.6667;
    g5.keys['arrowright'] = true;
    g5.keys['arrowup'] = i > 60; // разгон, затем тянем руль на себя
    if (i > 60 && g5.sc.angle < -0.5) g5.keys['arrowup'] = false; // не перевернуться
    g5.frame(t);
    sawCombo = Math.max(sawCombo, g5.combo);
  }
  console.log(`  макс комбо в движении ${Math.round(sawCombo)}, лучший ${Math.round(g5.runStats.bestCombo)}`);
  ok(sawCombo > 0, `движущийся вили начисляет очки (комбо ${Math.round(sawCombo)})`);
}

console.log('=== 9. Отрисовка кадра (реальный рендер в стаб-контекст) ===');
game.state = 'playing';
game.draw(0.016);
ok(true, 'кадр отрисовался без исключений');

console.log(`\nПроверок: ${checks}, провалов: ${fails}`);
if (fails > 0) { console.error('ПРОВАЛЫ:\n - ' + fails_list.join('\n - ')); process.exit(1); }
console.log('ВСЁ ЗЕЛЁНОЕ');
