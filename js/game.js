// ============================================================
//  Игровой цикл: ввод, камера, трюки, комбо, доставка, частицы
// ============================================================
import { CFG, SCOOTERS, UPGRADES, TRICKS } from './config.js';
import { LEVELS, buildLevel } from './terrain.js';
import { Scooter } from './vehicle.js';
import * as R from './render.js';
import { clamp, lerp, sfx, TAU, rng } from './utils.js';

export function makeSpec(id, save) {
  const base = SCOOTERS.find((s) => s.id === id) || SCOOTERS[0];
  const s = { ...base };
  const up = (save.upgrades && save.upgrades[id]) || {};
  for (const k in UPGRADES) {
    const lvl = up[k] || 0;
    if (lvl > 0) UPGRADES[k].apply(s, lvl);
  }
  const cos = (save.cosmetics && save.cosmetics[id]) || {};
  return { spec: s, cosmetics: cos };
}

export class Game {
  constructor(canvas, ui, save) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.save = save;
    this.state = 'menu'; // menu | playing | paused | crashed | finished
    this.input = { throttle: 0, brake: 0, lean: 0, boost: false, pose: 'ride' };
    this.keys = {};
    this.touch = {};
    this.particles = [];
    this.texts = [];
    this.cam = { x: 0, y: 0, zoom: 1, shake: 0 };
    this.time = 0;
    this.lastTs = 0;
    this.acc = 0;
    this.slowmo = 1;
    this.level = null;
    this.sc = null;
    this.runStats = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.chain = 0;
    this.trick = null;
    this.crashHold = 0;
    this.dpr = 1;
    this.onStateChange = null;
    this.resize();
    this.bindInput();
  }

  // ---------------- ввод ----------------
  bindInput() {
    const kd = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (this.keys[k]) return;
      this.keys[k] = true;
      if (k === 'escape' || k === 'p') this.togglePause();
      if (k === 'r') this.restart(true);
      if (k === 'e') this.cyclePose();
      if (k === 'enter' && this.state === 'menu') this.ui && this.ui.startSelected();
      sfx.resume();
    };
    const ku = (e) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
  }

  cyclePose() {
    const order = ['ride', 'tuck', 'nohands', 'superman'];
    const i = order.indexOf(this.input.pose);
    this.input.pose = order[(i + 1) % order.length];
    sfx.ui();
    this.toast(`ПОЗА: ${this.input.pose.toUpperCase()}`, '🤸');
  }

  pollInput() {
    const k = this.keys, t = this.touch;
    const gas = k['arrowright'] || k['d'] || k['в'] || t.gas;
    const back = k['arrowleft'] || k['a'] || k['ф'] || t.back;
    const leanB = k['arrowup'] || k['w'] || k['ц'] || t.leanBack;
    const leanF = k['arrowdown'] || k['s'] || k['ы'] || t.leanFwd;
    this.input.throttle = gas ? 1 : (back ? -1 : 0);
    this.input.brake = back ? 1 : 0;
    this.input.lean = (leanF ? 1 : 0) + (leanB ? -1 : 0);
    this.input.boost = !!(k[' '] || k['shift'] || t.boost);
    if (this.input.boost && this.sc && this.sc.boost > 5 && !this.sc.boosting) {
      this.sc.boosting = true;
      sfx.boost();
    }
    if (!this.input.boost && this.sc) this.sc.boosting = false;
  }

  // ---------------- запуск ----------------
  startLevel(levelId) {
    const def = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    this.level = buildLevel(def);
    const { spec, cosmetics } = makeSpec(this.save.current, this.save);
    const startX = this.level.startX;
    const startY = this.level.terrain.heightAt(startX);
    this.sc = new Scooter(spec, startX, startY, cosmetics);
    this.cam.x = startX - 200;
    this.cam.y = startY - 300;
    this.combo = 0; this.comboTimer = 0; this.chain = 0;
    this.particles.length = 0; this.texts.length = 0;
    this.crashHold = 0;
    this.slowmo = 1;
    this.runStats = {
      levelId, distance: 0, money: 0, coins: 0, flips: 0, deliveries: 0,
      bestCombo: 0, bestAir: 0, crates: 0, started: performance.now(), maxSpeed: 0,
    };
    this.state = 'playing';
    this.level.cars.forEach((c) => { c.dead = false; c.y = this.level.terrain.heightAt(c.x); });
    this.level.colliders.forEach((c) => { c.dead = false; });
    this.level.coins.forEach((c) => { c.taken = false; });
    this.level.parcels.forEach((p) => { p.taken = false; });
    this.level.checkpoints.forEach((c) => { c.done = false; });
    this.lastCheckpoint = { x: startX, y: startY };
    sfx.startEngine();
    this.onStateChange && this.onStateChange(this.state);
  }

  restart(fromCheckpoint = true) {
    if (!this.level) return;
    const p = fromCheckpoint ? this.lastCheckpoint : { x: this.level.startX, y: this.level.terrain.heightAt(this.level.startX) };
    if (!fromCheckpoint) {
      this.level.coins.forEach((c) => { c.taken = false; });
      this.level.checkpoints.forEach((c) => { c.done = false; });
      this.runStats.coins = 0;
      this.runStats.distance = 0;
    }
    this.level.colliders.forEach((c) => { c.dead = false; });
    this.sc.reset(p.x, p.y);
    this.combo = 0; this.comboTimer = 0; this.chain = 0;
    this.cam.x = p.x - 300; this.cam.y = p.y - 300;
    this.state = 'playing';
    this.crashHold = 0;
    this.slowmo = 1;
    this.particles.length = 0;
    this.onStateChange && this.onStateChange(this.state);
  }

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; }
    else if (this.state === 'paused') { this.state = 'playing'; }
    else return;
    this.onStateChange && this.onStateChange(this.state);
  }

  toMenu() {
    this.state = 'menu';
    sfx.engineStop();
    this.onStateChange && this.onStateChange(this.state);
  }

  // ---------------- главный цикл ----------------
  frame(ts) {
    const raw = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0.016;
    this.lastTs = ts;
    this.time += raw;
    if (this.state === 'playing' || this.state === 'crashed') {
      this.acc += raw * (this.state === 'crashed' ? 0.55 : this.slowmo);
      let guard = 0;
      while (this.acc >= CFG.STEP && guard < 12) {
        this.pollInput();
        this.step(CFG.STEP);
        this.acc -= CFG.STEP;
        guard++;
      }
      if (guard >= 12) this.acc = 0;
    } else {
      this.pollInput();
    }
    this.draw(raw);
  }

  step(dt) {
    const world = this.level;
    const sc = this.sc;
    const wasAir = sc.airborne;

    // окружение
    for (const car of world.cars) {
      if (car.dead) continue;
      car.x += car.speed * car.dir * dt;
      if (car.x > car.x1) { car.x = car.x1; car.dir = -1; }
      if (car.x < car.x0) { car.x = car.x0; car.dir = 1; }
      car.y = world.terrain.heightAt(car.x);
    }

    world.onCrateSmash = (c, impact) => {
      this.runStats.crates++;
      this.addScore(TRICKS.crate.value, TRICKS.crate.icon, c.x, c.y);
      this.burst(c.x, c.y, 14, '#c9924a', 320, 'box');
      sfx.noise(0.18, 0.22, 1200);
    };
    world.onNearMiss = (car, hit) => {
      if (!hit && !car.__missed && Math.abs(sc.x - car.x) < car.w) {
        car.__missed = true;
        setTimeout(() => { car.__missed = false; }, 1200);
        this.addScore(TRICKS.nearmiss.value, TRICKS.nearmiss.icon, sc.x, sc.y - 140);
      }
    };
    world.onCrash = (reason) => {
      this.onCrash(reason);
    };

    if (!sc.crashed) {
      sc.update(this.input, world, dt);
    } else {
      sc.rider.update(sc, world, this.input, dt);
      // самокат катится дальше как мёртвый груз
      sc.vy += CFG.GRAVITY * dt;
      sc.x += sc.vx * dt; sc.y += sc.vy * dt;
      sc.angle += sc.omega * dt;
      const h = world.terrain.heightAt(sc.x);
      if (sc.y > h - sc.wheelR) {
        sc.y = h - sc.wheelR;
        sc.vy *= -0.2; sc.vx *= 0.9;
      }
    }

    this.updateCamera(dt);
    this.updatePickups(dt);
    this.updateTricks(dt, wasAir);
    this.updateEffects(dt, sc);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.bankCombo();
    }

    if (this.state === 'crashed') {
      this.crashHold -= dt;
      if (this.crashHold <= 0) {
        this.state = 'crashMenu';
        this.onStateChange && this.onStateChange(this.state);
      }
    }

    // дистанция
    this.runStats.distance = Math.max(this.runStats.distance, (sc.x - this.level.startX) / CFG.PX_PER_M);
    this.runStats.maxSpeed = Math.max(this.runStats.maxSpeed, sc.speedKmh());

    // финиш
    if (sc.x > world.finishX && this.state === 'playing') this.finishLevel();
  }

  // ---------------- трюки и очки ----------------
  updateTricks(dt, wasAir) {
    const sc = this.sc;
    if (sc.crashed) return;
    if (!this.trick) this.trick = { rot: 0, nohands: 0, superman: 0, scrub: false, air: 0 };

    const air = sc.airborne;
    if (air && !wasAir) {
      this.trick = { rot: 0, nohands: 0, superman: 0, scrub: false, air: 0 };
    }
    if (air) {
      this.trick.air = sc.airTime;
      this.trick.rot = sc.airRot;
      if (this.input.pose === 'nohands') this.trick.nohands += dt;
      if (this.input.pose === 'superman') this.trick.superman += dt;
      if (Math.abs(this.input.lean) > 0.5 && sc.speedKmh() > 35) this.trick.scrub = true;
      this.slowmo = lerp(this.slowmo, sc.airTime > 0.6 ? 0.72 : 0.9, dt * 3);
    } else {
      this.slowmo = lerp(this.slowmo, 1, dt * 6);
      if (wasAir) this.landTricks();
      // вилли / стоппи — только в движении, чтобы нельзя было
      // накручивать очки, просто зажав «назад» на месте
      const kmh = sc.speedKmh();
      if (sc.rear.grounded && !sc.front.grounded && sc.angle < -0.22 && kmh > 14 && sc.forwardSpeed() > 120) {
        this.addScore(TRICKS.wheelie.value * dt, TRICKS.wheelie.icon, sc.x, sc.y - 160, true);
        sc.wheelieT += dt;
      } else if (sc.front.grounded && !sc.rear.grounded && sc.angle > 0.22 && kmh > 14) {
        this.addScore(TRICKS.stoppie.value * dt, TRICKS.stoppie.icon, sc.x, sc.y - 160, true);
        sc.stoppieT += dt;
      }
    }

    // мёртвая петля
    if (Math.abs(sc.loopProgress) > Math.PI * 1.6) {
      this.addScore(TRICKS.loop.value, TRICKS.loop.icon, sc.x, sc.y - 200);
      sc.loopProgress = 0;
    }
  }

  landTricks() {
    const sc = this.sc;
    const t = this.trick || { rot: 0, air: 0 };
    const flips = Math.floor(Math.abs(t.rot) / (TAU * 0.82));
    let scored = false;
    if (t.air > CFG.MIN_AIR_FOR_TRICK) {
      this.addScore(TRICKS.air.value * (t.air / 0.5), TRICKS.air.icon, sc.x, sc.y - 180);
      scored = true;
    }
    if (flips >= 1) {
      const back = t.rot < 0;
      const tk = back ? TRICKS.backflip : TRICKS.frontflip;
      this.addScore(tk.value * flips, tk.icon, sc.x, sc.y - 220, false, `${tk.name} x${flips}`);
      this.runStats.flips += flips;
      scored = true;
    }
    if (t.air > 1.6) { this.addScore(TRICKS.bigair.value, TRICKS.bigair.icon, sc.x, sc.y - 260); scored = true; }
    if (t.nohands > 0.45) { this.addScore(TRICKS.nohands.value, TRICKS.nohands.icon, sc.x, sc.y - 200); scored = true; }
    if (t.superman > 0.45) { this.addScore(TRICKS.superman.value, TRICKS.superman.icon, sc.x, sc.y - 200); scored = true; }
    if (t.scrub) { this.addScore(TRICKS.scrub.value, TRICKS.scrub.icon, sc.x, sc.y - 200); scored = true; }
    this.runStats.bestAir = Math.max(this.runStats.bestAir, t.air);
    if (scored) {
      this.burst(sc.x, sc.y + sc.wheelR, 10, '#cfd3d8', 180, 'dust');
      sfx.land();
    }
    this.trick = null;
  }

  get multi() { return 1 + Math.min(4, this.chain * 0.25); }

  addScore(value, icon, x, y, silent = false, label = null) {
    if (this.state !== 'playing' && this.state !== 'crashed') return;
    const v = Math.max(1, Math.round(value * this.multi));
    this.combo += v;
    this.comboTimer = CFG.COMBO_HOLD;
    if (!silent) {
      this.chain++;
      sfx.trick(Math.min(12, this.chain));
      this.ui && this.ui.showToast(label || (icon + ' +' + v), this.chain);
      this.texts.push({ x, y, text: (label || icon) + '  +' + v, life: 1.1, maxLife: 1.1, color: '#ffe27a', size: 30, vy: -70 });
    }
    this.runStats.bestCombo = Math.max(this.runStats.bestCombo, this.combo);
  }

  bankCombo() {
    if (this.combo > 0) {
      const cash = Math.round(this.combo * 0.6);
      this.save.money += cash;
      this.runStats.money += cash;
      this.sc.addBoost(this.combo / 100 * CFG.BOOST_GAIN_PER_100);
      this.texts.push({ x: this.sc.x, y: this.sc.y - 200, text: `КОМБО → ${cash} ₽`, life: 1.4, maxLife: 1.4, color: '#7dffb0', size: 34, vy: -60 });
      sfx.money();
    }
    this.combo = 0; this.chain = 0;
  }

  // ---------------- подбор предметов ----------------
  updatePickups(dt) {
    const sc = this.sc, world = this.level;
    const hx = sc.x, hy = sc.y - 40;
    for (const co of world.coins) {
      if (co.taken) continue;
      if (Math.abs(co.x - hx) < 70 && Math.abs(co.y - hy) < 90) {
        co.taken = true;
        this.runStats.coins++;
        this.save.money += 25;
        this.runStats.money += 25;
        sc.addBoost(1.6);
        this.burst(co.x, co.y, 6, '#ffcf3d', 160, 'spark');
        sfx.coin();
      }
    }
    for (const p of world.parcels) {
      if (p.taken) continue;
      if (Math.abs(p.x - hx) < 90 && Math.abs(p.y - (sc.y - 60)) < 130) {
        p.taken = true;
        if (p.kind === 'pickup') {
          sc.parcels++;
          this.ui && this.ui.showToast('📦 ЗАКАЗ ВЗЯТ — вези на точку выдачи', 0);
          sfx.pickup();
        } else if (sc.parcels > 0) {
          sc.parcels--;
          this.runStats.deliveries++;
          this.save.stats.deliveries++;
          const bonus = Math.round(TRICKS.delivery.value * (1 + sc.speedKmh() / 60));
          this.addScore(bonus, TRICKS.delivery.icon, p.x, p.y - 120, false, 'ДОСТАВКА +' + bonus);
          this.save.money += bonus;
          this.runStats.money += bonus;
          sfx.money();
        } else {
          this.ui && this.ui.showToast('⚠️ Тут точка выдачи, а посылки нет', 0);
        }
      }
    }
    for (const cp of world.checkpoints) {
      if (cp.done) continue;
      if (sc.x > cp.x) {
        cp.done = true;
        this.lastCheckpoint = { x: cp.x + 30, y: world.terrain.heightAt(cp.x + 30) };
        if (!cp.finish) {
          this.save.money += 150;
          this.runStats.money += 150;
          this.ui && this.ui.showToast('🚩 ЧЕКПОИНТ  +150 ₽', 0);
          sfx.money();
        }
      }
    }
  }

  // ---------------- авария ----------------
  onCrash(reason) {
    if (this.state !== 'playing') return;
    this.state = 'crashed';
    this.crashHold = 2.0;
    this.cam.shake = 26;
    this.slowmo = 0.45;
    this.save.stats.crashes++;
    this.combo = 0; this.chain = 0;
    const r = this.sc.rider.ragParts;
    if (r) this.burst(r.neck.x, r.neck.y, 16, '#ff6a4a', 260, 'spark');
    this.burst(this.sc.x, this.sc.y, 18, '#8b8f96', 300, 'dust');
    sfx.crash();
    this.texts.push({ x: this.sc.x, y: this.sc.y - 160, text: reason, life: 1.8, maxLife: 1.8, color: '#ff7a6a', size: 34, vy: -40 });
    this.crashReason = reason;
    sfx.engineStop();
  }

  finishLevel() {
    this.state = 'finished';
    this.bankCombo();
    const def = this.level.def;
    const first = !this.save.levelsDone[def.id];
    const reward = Math.round(def.reward * (first ? 1 : 0.4));
    this.save.money += reward;
    this.runStats.money += reward;
    const prev = this.save.best[def.id] || {};
    this.save.best[def.id] = {
      money: Math.max(prev.money || 0, this.runStats.money),
      flips: Math.max(prev.flips || 0, this.runStats.flips),
      combo: Math.max(prev.combo || 0, this.runStats.bestCombo),
    };
    this.save.levelsDone[def.id] = true;
    // открытие следующего уровня
    const i = LEVELS.findIndex((l) => l.id === def.id);
    if (i >= 0 && i + 1 < LEVELS.length) this.save.unlocked = Math.max(this.save.unlocked || 1, i + 2);
    this.save.stats.distance += this.runStats.distance;
    this.save.stats.flips += this.runStats.flips;
    this.finishReward = reward;
    sfx.money();
    this.onStateChange && this.onStateChange(this.state);
  }

  // ---------------- эффекты ----------------
  burst(x, y, n, color, speed, shape = 'dust') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3,
        life: 0.4 + Math.random() * 0.6, maxLife: 1, size: 3 + Math.random() * 6,
        color, shape, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, g: shape === 'dust' ? 300 : 900,
      });
    }
  }

  updateEffects(dt, sc) {
    const world = this.level;
    // пыль/искры от колёс
    for (const which of ['rear', 'front']) {
      const w = which === 'rear' ? sc.rear : sc.front;
      if (!w.grounded) continue;
      const speed = Math.abs(sc.forwardSpeed());
      if (w.slip > 0.2 || speed > 500) {
        const c = world.terrain.surfKeyAt(w.contactX || sc.x);
        const col = c === 'asphalt' || c === 'concrete' ? '#b9bdc4' : (c === 'sand' ? '#e2cd92' : '#9a7a4a');
        if (Math.random() < 0.7) {
          this.particles.push({
            x: (w.contactX || sc.x) - sc.cos * 6, y: (w.contactY || sc.y) - 4,
            vx: -sc.vx * 0.25 + (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 140,
            life: 0.35 + Math.random() * 0.4, maxLife: 0.75, size: 4 + Math.random() * 7,
            color: col, shape: 'dust', g: 200,
          });
        }
      }
    }
    if (sc.scrape > 0.2) {
      const p = sc.footPoint();
      this.particles.push({
        x: p.x, y: p.y, vx: -sc.vx * 0.4, vy: -120 - Math.random() * 120,
        life: 0.25, maxLife: 0.25, size: 2.5, color: '#ffd27a', shape: 'spark', g: 900, rot: Math.random() * TAU, vr: 20,
      });
    }
    if (sc.boosting) {
      const back = sc.toWorld(-sc.wb / 2 - 12, -12);
      this.particles.push({
        x: back.x, y: back.y, vx: -sc.vx * 0.3 - 120, vy: (Math.random() - 0.5) * 80,
        life: 0.3, maxLife: 0.3, size: 5 + Math.random() * 6, color: Math.random() > 0.5 ? '#8ce8ff' : '#ffffff', shape: 'dust', g: 0,
      });
    }
    // обновление частиц
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += (p.g || 500) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      const h = world.terrain.heightAt(p.x);
      if (p.y > h) { p.y = h; p.vy *= -0.3; p.vx *= 0.7; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt; t.y += t.vy * dt; t.vy *= 0.96;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  updateCamera(dt) {
    const sc = this.sc;
    const vw = this.cssW, vh = this.cssH;
    const targetZoom = clamp(1.05 - sc.speedKmh() / 190, 0.62, 1.05) * (this.save.zoom || 1);
    this.cam.zoom = lerp(this.cam.zoom, targetZoom, 1 - Math.exp(-dt * 3));
    const viewW = vw / this.cam.zoom, viewH = vh / this.cam.zoom;
    const look = sc.vx * CFG.CAM_LOOKAHEAD;
    const tx = sc.x + look - viewW * 0.36;
    const ty = sc.y - viewH * 0.5 + (sc.airborne ? -40 : 0);
    const k = 1 - Math.exp(-dt * CFG.CAM_LERP);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k * 0.8);
    this.cam.shake *= Math.exp(-dt * 5);
  }

  // ---------------- отрисовка ----------------
  resize() {
    const c = this.canvas;
    const rect = c.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.max(320, rect.width);
    this.cssH = Math.max(240, rect.height);
    c.width = Math.floor(this.cssW * this.dpr);
    c.height = Math.floor(this.cssH * this.dpr);
  }

  draw(rawDt) {
    const ctx = this.ctx;
    const vw = this.cssW, vh = this.cssH;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    const world = this.level;
    if (!world) {
      ctx.fillStyle = '#0e1116';
      ctx.fillRect(0, 0, vw, vh);
      return;
    }
    const tod = world.def.timeOfDay;
    R.drawSky(ctx, this.cam, vw, vh, tod, world.def.tint);
    R.drawParallax(ctx, this.cam, vw, vh, world, tod);

    const z = this.cam.zoom;
    const shx = (Math.random() - 0.5) * this.cam.shake;
    const shy = (Math.random() - 0.5) * this.cam.shake;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (-this.cam.x * z + shx), dpr * (-this.cam.y * z + shy));

    R.drawTerrain(ctx, this.cam, vw / z, vh / z, world);
    R.drawDecor(ctx, this.cam, vw / z, vh / z, world, this.time);
    R.drawObjects(ctx, this.cam, vw / z, vh / z, world, this.time);
    if (this.sc) R.drawScooter(ctx, this.sc, this.time);
    R.drawParticles(ctx, this.particles);

    // всплывающий текст
    for (const t of this.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `900 ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.sc) {
      const sp = clamp(this.sc.speedKmh() / 90, 0, 1);
      R.drawSpeedFX(ctx, vw, vh, sp, this.sc.boosting);
    }
    R.drawVignette(ctx, vw, vh, 0.32);

    // индикатор вращения в воздухе
    if (this.sc && this.sc.airborne && this.sc.airTime > 0.3) {
      const deg = Math.round(Math.abs(this.sc.airRot) * 180 / Math.PI);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.font = '900 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(deg + '°', vw / 2, 96);
      ctx.restore();
    }
  }

  hudState() {
    if (!this.sc || !this.level) return null;
    const sc = this.sc;
    return {
      speed: sc.speedKmh(),
      money: this.save.money,
      combo: this.combo,
      multi: this.multi,
      comboTimer: this.comboTimer,
      boost: sc.boost,
      battery: sc.battery / sc.batteryMax,
      parcels: sc.parcels,
      distance: this.runStats ? this.runStats.distance : 0,
      progress: clamp((sc.x - this.level.startX) / (this.level.finishX - this.level.startX), 0, 1),
      air: sc.airTime,
      airborne: sc.airborne,
      coins: this.runStats ? this.runStats.coins : 0,
      crashed: sc.crashed,
      pose: this.input.pose,
    };
  }
}
