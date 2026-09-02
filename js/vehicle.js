// ============================================================
//  Самокат + райдер:
//   • кинематическая подвеска (колесо всегда стоит на грунте, пока есть ход)
//   • слип-модель: тяга ограничена сцеплением, на песке колесо буксует
//   • наклон райдера = угловое ускорение (вилли / стоппи / флипы)
//   • автовыравнивание по уклону трассы
//   • рэгдолл при аварии
// ============================================================
import { CFG } from './config.js';
import { SURF as TSURF } from './terrain.js';
import { clamp, lerp, TAU } from './utils.js';
import { Physics } from './physics.js';

function surfGrip(key) {
  const s = TSURF[key] || TSURF.asphalt;
  return s.grip;
}

// ---------- пружинное запаздывание (мягкие конечности) ----------
class Spring {
  constructor(x, y, k = 240, c = 22) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.k = k; this.c = c;
  }
  update(tx, ty, dt) {
    const ax = (tx - this.x) * this.k - this.vx * this.c;
    const ay = (ty - this.y) * this.k - this.vy * this.c;
    this.vx += ax * dt; this.vy += ay * dt;
    const maxV = 2600;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxV) { this.vx *= maxV / sp; this.vy *= maxV / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
  }
  snap(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; }
}

export class Scooter {
  /** spec: { mass, power, maxSpeed, grip, batt, susp, dur, wheelR, deck, color, accent, type } */
  constructor(spec, x, y, cosmetics = {}) {
    this.spec = spec;
    this.cosmetics = cosmetics || {};
    this.isBike = spec.type === 'pitbike';

    // геометрия
    this.wheelR = spec.wheelR;
    this.wb = this.isBike ? 300 : 210 * (spec.deck || 1);
    this.deckH = this.isBike ? 92 : 58;
    this.stemLen = this.isBike ? 150 : 178;
    this.barW = this.isBike ? 84 : 74;
    this.mass = spec.mass;

    // состояние шасси
    this.x = x; this.y = y - this.wheelR;
    this.vx = 0; this.vy = 0;
    this.angle = 0; this.omega = 0;
    // момент инерции: база + курьер с высоко расположенным центром масс
    this.comH = this.deckH + 80;
    this.inertia = this.mass * (this.wb * this.wb * 0.22 + this.comH * this.comH * 1.0);

    // подвеска
    this.suspMax = spec.susp * 2.4;
    this.kSusp = 55 * this.mass;
    this.cSusp = 2 * 0.62 * Math.sqrt(this.kSusp * this.mass * 0.5);

    this.rear = this.newWheel();
    this.front = this.newWheel();

    this.rearForce = 0;
    this.airTime = 0;
    this.airRot = 0;
    this.prevAngle = 0;
    this.crashed = false;
    this.crashReason = '';
    this.boost = 0;
    this.boosting = false;
    this.battery = spec.batt;
    this.batteryMax = spec.batt;
    this.wheelieT = 0;
    this.stoppieT = 0;
    this.groundedTime = 0;
    this.impactMax = 0;
    this.scrape = 0;
    this.hardLanding = false;
    this.loopProgress = 0;
    this.lastLoopAngle = 0;
    this.parcels = 0;

    this.rider = new Rider(this);
  }

  newWheel() {
    return { comp: 0, vcomp: 0, spin: 0, spinVel: 0, grounded: false, wasGrounded: false, slip: 0, nx: 0, ny: -1, tx: 1, ty: 0, Fn: 0, contactX: 0, contactY: 0, impact: 0 };
  }

  get cos() { return Math.cos(this.angle); }
  get sin() { return Math.sin(this.angle); }

  toWorld(lx, ly) {
    const c = this.cos, s = this.sin;
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
  }
  localAnchors() {
    return {
      rear: { x: -this.wb / 2, y: 0 },
      front: { x: this.wb / 2, y: 0 },
      stemTop: { x: this.wb / 2 - 12, y: -this.deckH - this.stemLen },
    };
  }
  wheelPos(which) {
    const w = which === 'rear' ? this.rear : this.front;
    const a = this.localAnchors()[which];
    const p = this.toWorld(a.x, a.y);
    const ux = -this.sin, uy = -this.cos;
    return { x: p.x + ux * w.comp, y: p.y + uy * w.comp };
  }
  handlebar() { const a = this.localAnchors().stemTop; return this.toWorld(a.x, a.y); }
  hipPoint() { return this.toWorld(-this.wb * 0.06, -this.deckH - 4); }
  footPoint() { return this.toWorld(-this.wb * 0.04, -this.deckH); }

  speedKmh() { return Math.hypot(this.vx, this.vy) / CFG.PX_PER_M * 3.6; }
  forwardSpeed() { return this.vx * this.cos + this.vy * this.sin; }
  get airborne() { return !this.rear.grounded && !this.front.grounded; }

  // --------------------------------------------------
  update(input, world, dt) {
    const terr = world.terrain;
    const wasAir = this.airborne;
    const c = this.cos, s = this.sin;
    const ux = -s, uy = -c;    // «вверх» по шасси
    const fx = c, fy = s;      // «вперёд» по шасси
    const anch = this.localAnchors();
    const maxComp = this.suspMax;
    const maxExt = this.suspMax * 0.6;
    const mWheel = this.mass * 0.5;

    this.prevAngle = this.angle;
    this.hardLanding = false;
    this.rearForce = 0;

    let Fx = 0, Fy = 0, angAcc = 0;
    const wheels = [
      { w: this.rear, a: anch.rear, drive: true },
      { w: this.front, a: anch.front, drive: false },
    ];

    for (const item of wheels) {
      const w = item.w;
      const ap = this.toWorld(item.a.x, item.a.y);
      const rx = ap.x - this.x, ry = ap.y - this.y;
      w.wasGrounded = w.grounded;
      w.grounded = false;
      w.slip = 0;
      const prevComp = w.comp;

      // --- кинематика: колесо стоит на грунте, пока хватает хода подвески ---
      let wx = ap.x + ux * w.comp;
      let wy = ap.y + uy * w.comp;
      const solid = terr.isSolid(wx);
      const h = terr.heightAt(wx);
      let pen = wy + this.wheelR - h;
      let n = null;

      if (solid && pen > 0) {
        n = terr.normalAt(wx);
        // comp > 0 = подвеска сжата (колесо выше якоря)
        const upDotN = Math.max(0.35, ux * n.x + uy * n.y);
        w.comp += pen / upDotN;
        if (w.comp > maxComp) w.comp = maxComp;
        if (w.comp < -maxExt) w.comp = -maxExt;
        // пересчитываем позицию и проникновение после ограничения хода
        wx = ap.x + ux * w.comp;
        wy = ap.y + uy * w.comp;
        pen = wy + this.wheelR - terr.heightAt(wx);
        // контакт есть, пока колесо достаёт до грунта (после коррекции pen ~ 0)
        if (pen > -1.5) w.grounded = true;
      }

      // --- скорость сжатия: на земле она задаётся геометрией, в воздухе — пружиной ---
      if (w.grounded) {
        w.vcomp = (w.comp - prevComp) / dt;
      } else {
        const Fs0 = this.kSusp * w.comp + this.cSusp * w.vcomp;
        w.vcomp = clamp(w.vcomp + (-Fs0 / mWheel) * dt, -4000, 4000);
        w.comp = clamp(w.comp + w.vcomp * dt, -maxExt, maxComp);
      }

      // --- сила подвески: comp > 0 => сжата => толкает шасси вверх ---
      let Fs = this.kSusp * w.comp + this.cSusp * w.vcomp;
      if (w.grounded && n) {
        const vn = this.vx * n.x + this.vy * n.y;
        Fs += Math.max(0, -vn) * mWheel * 3.2;                  // ударный демпфер
        if (w.comp >= maxComp - 0.001 && pen > 0) {
          // подвеска на упоре: контакт становится жёстким — гасим нормальную
          // скорость и выталкиваем шасси, иначе оно утонет в грунте
          if (vn < 0) { this.vx -= n.x * vn; this.vy -= n.y * vn; }
          this.x += n.x * pen * 0.6;
          this.y += n.y * pen * 0.6;
          Fs += pen * mWheel * 6;
        }
        w.impact = Math.max(0, -vn);
        if (!w.wasGrounded && w.impact > 200) this.onLandImpact(w.impact);
        this.impactMax = Math.max(this.impactMax, w.impact);
      }
      // подвеска физически не может выдать больше ~4.5g на колесо
      Fs = Math.min(Fs, 4.5 * mWheel * CFG.GRAVITY);

      const Fsx = ux * Fs, Fsy = uy * Fs;
      Fx += Fsx; Fy += Fsy;
      angAcc += (rx * Fsy - ry * Fsx) / this.inertia;

      // --- тяга / тормоз / качение (только на земле) ---
      if (w.grounded && n) {
        const tgx = -n.y, tgy = n.x;
        const gripCoef = this.spec.grip * surfGrip(terr.surfKeyAt(wx));
        const vt = this.vx * tgx + this.vy * tgy;
        const Fn = Math.max(0, Fs);

        let Ft = 0;
        const maxV = this.spec.maxSpeed / 3.6 * CFG.PX_PER_M * (this.boosting ? 1.4 : 1);
        if (item.drive && this.battery > 0) {
          const v = this.forwardSpeed();
          const curve = clamp(1 - v / maxV, 0, 1);
          if (input.throttle > 0) Ft += this.spec.power * CFG.FORCE_SCALE * curve;
          if (input.throttle < 0) Ft -= this.spec.power * CFG.FORCE_SCALE * 0.6 * clamp(1 + v / maxV, 0, 1);
          if (this.boosting && input.throttle >= 0) Ft += this.spec.power * CFG.FORCE_SCALE * 0.85;
        }
        if (input.brake > 0) Ft -= Math.sign(vt) * this.spec.power * CFG.FORCE_SCALE * 0.95;
        Ft -= vt * CFG.ROLL_DRAG * this.mass * 0.02;

        const maxFt = Math.max(400, Fn * CFG.GRIP_MULT * gripCoef);
        const FtUsed = clamp(Ft, -maxFt, maxFt);
        Fx += tgx * FtUsed; Fy += tgy * FtUsed;
        angAcc += ((wx - this.x) * (tgy * FtUsed) - (wy - this.y) * (tgx * FtUsed)) / this.inertia;

        if (item.drive) {
          this.rearForce = FtUsed;
          const demand = Math.abs(Ft) / Math.max(1, maxFt);
          w.slip = clamp((demand - 0.88) * 3.2, 0, 1);
          if (input.brake > 0 && Math.abs(vt) > 60) w.slip = Math.max(w.slip, 0.5);
        }
        w.nx = n.x; w.ny = n.y; w.tx = tgx; w.ty = tgy; w.Fn = Fn;
        w.contactX = wx; w.contactY = wy;
      }
    }

    // --- столкновения с объектами ---
    this.collideObjects(world, dt, (oFx, oFy, px, py) => {
      Fx += oFx; Fy += oFy;
      angAcc += ((px - this.x) * oFy - (py - this.y) * oFx) / this.inertia;
    });

    // --- наклон райдера и автовыравнивание ---
    if (this.airborne) {
      angAcc += input.lean * CFG.AIR_SPIN;
    } else {
      angAcc += input.lean * CFG.GROUND_SPIN;
      // цель — средний уклон под реально стоящими колёсами
      // (иначе на бровке котлована atan(уклона 50) закрутил бы самокат)
      let nx = 0, ny = 0, cnt = 0;
      if (this.rear.grounded) { nx += this.rear.nx; ny += this.rear.ny; cnt++; }
      if (this.front.grounded) { nx += this.front.nx; ny += this.front.ny; cnt++; }
      if (cnt > 0) {
        const target = clamp(Math.atan2(-nx / cnt, -ny / cnt), -0.9, 0.9);
        angAcc += (target - this.angle) * CFG.LEVEL_K - this.omega * CFG.LEVEL_C;
      }
      // гасим вращение, пока оба колеса на земле (гироскопика/геометрия руления)
      if (this.rear.grounded && this.front.grounded) angAcc -= this.omega * 3.2;
    }

    // --- страховка: корпус не проваливается сквозь грунт ---
    this.bodyContact(world, dt);

    // --- сопротивление воздуха и гравитация ---
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 1) {
      let drag = CFG.AIR_DRAG * sp * sp;
      const vCap = this.spec.maxSpeed / 3.6 * CFG.PX_PER_M * (this.boosting ? 1.45 : 1.15);
      if (sp > vCap) drag += (sp - vCap) * this.mass * 1.6; // за пределами максималки воздух «плотнеет»
      Fx -= (this.vx / sp) * drag;
      Fy -= (this.vy / sp) * drag;
    }
    Fy += this.mass * CFG.GRAVITY;

    // --- интегрирование ---
    this.vx += (Fx / this.mass) * dt;
    this.vy += (Fy / this.mass) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.omega = clamp(this.omega + angAcc * dt, -11, 11);
    this.angle += this.omega * dt;

    // --- вращение колёс (визуал + букс) ---
    for (const item of wheels) {
      const w = item.w;
      const vRoll = w.grounded ? (this.vx * w.tx + this.vy * w.ty) : this.forwardSpeed();
      const target = vRoll / this.wheelR;
      if (item.drive && input.throttle > 0) {
        const driveSpin = target * (1 + w.slip * 2.6) + (this.boosting ? 26 : 8);
        w.spinVel = lerp(w.spinVel, Math.max(target, driveSpin), 1 - Math.exp(-dt * 9));
      } else {
        w.spinVel = lerp(w.spinVel, target, 1 - Math.exp(-dt * 16));
      }
      w.spin += w.spinVel * dt;
    }

    // --- воздух / земля ---
    if (this.airborne) {
      this.airTime += dt;
      this.groundedTime = 0;
      let d = this.angle - this.prevAngle;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.airRot += d;
    } else {
      this.groundedTime += dt;
      if (this.airTime > 0) this.airTime = 0;
      this.airRot = 0;
    }

    // отрыв от земли: при НАСТОЯЩЕМ вылете вверх самокат подкидывает назад
    // (нос вверх) и слегка вверх — как стант-вылет. Микроподскоки не трогаем.
    if (!wasAir && this.airborne && this.vy < -260) {
      const th = input.throttle > 0 ? 1 : 0.35;
      this.omega -= CFG.TAKEOFF_POP * th;
      this.vy -= 90 * th;
    }
    // в воздухе без ввода гасим вращение, чтобы не крутило само по себе
    if (this.airborne && input.lean === 0) this.omega *= 1 - Math.min(0.9, 1.5 * dt);

    // --- батарея ---
    const drain = (input.throttle > 0 ? 1 : 0) * (this.boosting ? 4.5 : 1) * dt * 1.1;
    this.battery = clamp(this.battery - drain, 0, this.batteryMax);
    if (this.groundedTime > 0.5 && input.throttle <= 0) this.battery = Math.min(this.batteryMax, this.battery + dt * 2.2);

    if (this.boosting) {
      this.boost = Math.max(0, this.boost - CFG.BOOST_DRAIN * dt);
      if (this.boost <= 0) this.boosting = false;
    }

    this.checkCrash(world, input);
    this.rider.update(this, world, input, dt);
  }

  /** Контакт деки/рамы с грунтом: не даём шасси утонуть, трём с искрами */
  bodyContact(world, dt) {
    const terr = world.terrain;
    const pts = [this.toWorld(-this.wb * 0.34, -this.deckH + 10), this.toWorld(this.wb * 0.16, -this.deckH + 10)];
    for (const p of pts) {
      if (!terr.isSolid(p.x)) continue;
      const pen = p.y - terr.heightAt(p.x);
      if (pen <= 0) continue;
      const n = terr.normalAt(p.x);
      this.x += n.x * pen * 0.7;
      this.y += n.y * pen * 0.7;
      const vn = this.vx * n.x + this.vy * n.y;
      if (vn < 0) {
        const tx = -n.y, ty = n.x;
        const vt = this.vx * tx + this.vy * ty;
        this.vx = tx * vt * 0.86;
        this.vy = ty * vt * 0.86;
        this.omega *= 0.86;
        this.scrape = Math.min(1, this.scrape + 0.3);
      }
    }
  }

  onLandImpact(impact) {
    // ломаемся только на действительно жёстком приземлении
    const limit = 1200 + this.spec.dur * 12;
    this.landedHard = impact;
    if (impact > limit) this.hardLanding = true;
  }

  collideObjects(world, dt, applyForce) {
    const R = this.wheelR;
    for (const c of world.colliders) {
      if (c.dead) continue;
      if (c.type === 'box') {
        const pts = [this.wheelPos('rear'), this.wheelPos('front'), this.footPoint(), this.handlebar()];
        for (const p of pts) {
          const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2, y0 = c.y - c.h / 2, y1 = c.y + c.h / 2;
          const cx = clamp(p.x, x0, x1), cy = clamp(p.y, y0, y1);
          const dx = p.x - cx, dy = p.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, ny = dy / d;
          const pen = R - d;
          const impact = Math.abs(this.vx * nx + this.vy * ny);
          applyForce(nx * pen * this.mass * 22, ny * pen * this.mass * 22 - this.mass * 60, p.x, p.y);
          if (impact > 300) {
            c.hp -= 1;
            if (c.hp <= 0) { c.dead = true; world.onCrateSmash && world.onCrateSmash(c, impact); }
          }
        }
      } else if (c.type === 'arc') {
        const pts = [this.wheelPos('rear'), this.wheelPos('front')];
        for (const p of pts) {
          const dx = p.x - c.cx, dy = p.y - c.cy;
          const d = Math.hypot(dx, dy) || 0.001;
          const diff = d - c.r;
          // для петель (dir=-1) работаем по внутренней поверхности
          const signed = diff * c.dir;
          if (signed > 0 || signed < -R) continue;
          let a = Math.atan2(dy, dx);
          while (a < c.a0) a += TAU;
          if (a > c.a1) continue;
          const nx = (dx / d) * c.dir, ny = (dy / d) * c.dir;
          const p2 = R + signed;
          if (p2 <= 0) continue;
          const vn = this.vx * nx + this.vy * ny;
          const Fn = Math.max(0, -vn) * this.mass * 12 + p2 * this.mass * 20;
          applyForce(nx * Fn, ny * Fn, p.x, p.y);
          if (c.tag === 'loop') {
            let da = a - this.lastLoopAngle;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            this.loopProgress += da;
            this.lastLoopAngle = a;
          }
        }
      }
    }
    // машины
    for (const car of world.cars) {
      if (car.dead) continue;
      const x0 = car.x - car.w / 2, x1 = car.x + car.w / 2;
      const y1 = car.y, y0 = car.y - car.h;
      const p = this.wheelPos('rear');
      const cx = clamp(p.x, x0, x1), cy = clamp(p.y, y0, y1);
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        const impact = Math.abs(this.vx * nx + this.vy * ny);
        applyForce(nx * (R - d) * this.mass * 30, ny * (R - d) * this.mass * 30, p.x, p.y);
        if (impact > 220 && !this.crashed) {
          world.onNearMiss && world.onNearMiss(car, true);
          this.crash(world, 'Собрал бампером «Ларгус»');
        } else if (impact > 50) {
          world.onNearMiss && world.onNearMiss(car, false);
        }
      }
    }
    // шипы в котловане
    for (const s of world.spikes) {
      if (this.x > s.x && this.x < s.x + s.w) {
        const p = this.wheelPos('rear');
        if (p.y > s.y - 130) { this.crash(world, 'Улетел в котлован на арматуру'); return; }
      }
    }
  }

  checkCrash(world, input) {
    if (this.crashed) return;
    if (this.hardLanding) { this.crash(world, 'Рама не выдержала приземления'); return; }
    const terr = world.terrain;
    const deck = this.footPoint();
    const bar = this.handlebar();
    const head = this.rider.head;
    // дека/руль должны реально воткнуться в грунт, а не чиркнуть
    const fresh = this.groundedTime < 0.3 ? 14 : 0;   // первые 0.3 с после приземления прощаем
    for (const p of [deck, bar]) {
      const depth = p.y - terr.heightAt(p.x);
      if (terr.isSolid(p.x) && depth > 0) this.scrape = Math.min(1, this.scrape + 0.08);
      if (terr.isSolid(p.x) && depth > 22 + fresh) {
        const sp = Math.hypot(this.vx, this.vy);
        if (sp > 500) { this.crash(world, 'Воткнулся рулём в асфальт'); return; }
      }
    }
    this.scrape *= 0.94;
    if (terr.isSolid(head.x) && head.y + 12 > terr.heightAt(head.x)) {
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 320 || this.rider.detached) { this.crash(world, 'Приложился головой'); return; }
    }
    if (!this.airborne && Math.abs(((this.angle + Math.PI) % TAU + TAU) % TAU - Math.PI) > 1.95) {
      this.crash(world, 'Перевернулся через руль'); return;
    }
    if (this.y > 4000) { this.crash(world, 'Улетел в пропасть'); return; }
    if (this.x < -200) { this.x = -200; this.vx = Math.max(0, this.vx); }
  }

  crash(world, reason) {
    if (this.crashed) return;
    this.crashed = true;
    this.crashReason = reason;
    this.rider.detach(this, world);
    world.onCrash && world.onCrash(reason);
  }

  reset(x, y) {
    this.x = x; this.y = y - this.wheelR;
    this.vx = 0; this.vy = 0; this.angle = 0; this.omega = 0;
    this.rear = this.newWheel();
    this.front = this.newWheel();
    this.airTime = 0; this.airRot = 0; this.crashed = false;
    this.battery = this.batteryMax;
    this.rider.reset(this);
  }

  addBoost(v) { this.boost = clamp(this.boost + v, 0, CFG.BOOST_MAX); }
}

// ============================================================
//  Райдер: поза + пружинные конечности, рэгдолл при аварии
// ============================================================
export class Rider {
  constructor(scooter) {
    this.head = { x: scooter.x, y: scooter.y - 150 };
    this.headS = new Spring(this.head.x, this.head.y, 190, 17);
    this.chestS = new Spring(this.head.x, this.head.y + 50, 320, 26);
    this.hipS = new Spring(this.head.x, this.head.y + 100, 400, 30);
    this.kneeS = new Spring(this.head.x, this.head.y + 130, 260, 20);
    this.elbowS = new Spring(this.head.x + 30, this.head.y + 60, 240, 19);
    this.detached = false;
    this.physics = new Physics();
    this.ragParts = null;
    this.pose = 'ride';
    this.t = 0;
    this.handsOn = true;
    this.bar = { x: 0, y: 0 };
    this.hip = { x: 0, y: 0 };
    this.chest = { x: 0, y: 0 };
    this.knee = { x: 0, y: 0 };
    this.hand = { x: 0, y: 0 };
  }

  reset(scooter) {
    this.detached = false;
    this.physics.clear();
    this.ragParts = null;
    const h = scooter.toWorld(-scooter.wb * 0.06, -scooter.deckH - 150);
    this.head.x = h.x; this.head.y = h.y;
    this.headS.snap(h.x, h.y);
    const c = scooter.toWorld(-scooter.wb * 0.02, -scooter.deckH - 95);
    this.chestS.snap(c.x, c.y);
    const hp = scooter.hipPoint();
    this.hipS.snap(hp.x, hp.y);
    const kn = scooter.toWorld(-scooter.wb * 0.1, -scooter.deckH - 46);
    this.kneeS.snap(kn.x, kn.y);
    const bar = scooter.handlebar();
    this.elbowS.snap(bar.x, bar.y);
    this.pose = 'ride';
  }

  detach(scooter, world) {
    if (this.detached) return;
    this.detached = true;
    const phys = this.physics;
    phys.clear();
    const mk = (x, y, m) => {
      const p = phys.add(x, y, m);
      p.vx = scooter.vx; p.vy = scooter.vy;
      return p;
    };
    const head = mk(this.head.x, this.head.y, 6);
    const neck = mk(this.chest.x || this.chestS.x, this.chest.y || this.chestS.y, 14);
    const pelvis = mk(this.hip.x || this.hipS.x, this.hip.y || this.hipS.y, 16);
    const handL = mk(neck.x + 26, neck.y + 6, 4);
    const handR = mk(neck.x - 20, neck.y + 10, 4);
    const footL = mk(pelvis.x + 30, pelvis.y + 56, 5);
    const footR = mk(pelvis.x - 20, pelvis.y + 58, 5);
    phys.link(head, neck, null, 1, 4);
    phys.link(neck, pelvis, null, 1, 4);
    phys.link(neck, handL, null, 0.9, 4);
    phys.link(neck, handR, null, 0.9, 4);
    phys.link(pelvis, footL, null, 0.9, 4);
    phys.link(pelvis, footR, null, 0.9, 4);
    phys.link(head, pelvis, null, 0.5, 4);
    this.ragParts = { head, neck, pelvis, handL, handR, footL, footR };
  }

  update(scooter, world, input, dt) {
    this.t += dt;
    if (this.detached) {
      this.physics.iterations = 4;
      this.physics.step(dt, CFG.GRAVITY, CFG.AIR_DRAG * 40);
      this.physics.collideTerrain(world.terrain, dt, { friction: 0.65, restitution: 0.14, radius: 13 });
      if (this.ragParts) {
        this.head.x = this.ragParts.head.x;
        this.head.y = this.ragParts.head.y;
      }
      return;
    }

    const s = scooter;
    const c = Math.cos(s.angle), sn = Math.sin(s.angle);
    const toW = (lx, ly) => ({ x: s.x + lx * c - ly * sn, y: s.y + lx * sn + ly * c });

    const air = s.airborne;
    let pose = 'ride';
    if (air) {
      if (input.pose === 'superman') pose = 'superman';
      else if (input.pose === 'nohands') pose = 'nohands';
      else if (input.pose === 'tuck') pose = 'tuck';
    }
    this.pose = pose;

    const hip = toW(-s.wb * 0.06, -s.deckH - 6);
    const lean = input.lean || 0;
    const squat = air && pose === 'tuck' ? 26 : (!air ? 6 + Math.max(0, s.rear.comp) * 0.25 : 0);
    const chest = toW(-s.wb * 0.02 + lean * 16, -s.deckH - 92 + squat * 0.55);
    const headT = toW(-s.wb * 0.0 + lean * 22, -s.deckH - 142 + squat * 0.7);
    const bar = s.handlebar();
    const kneeT = toW(-s.wb * 0.1 + lean * 8, -s.deckH - 46 + squat * 0.4);

    this.hipS.update(hip.x, hip.y, dt);
    this.chestS.update(chest.x, chest.y, dt);
    this.headS.update(headT.x, headT.y, dt);
    this.kneeS.update(kneeT.x, kneeT.y, dt);

    const handsOn = pose !== 'nohands' && pose !== 'superman';
    const handT = handsOn ? { x: bar.x - 4, y: bar.y + 8 } : { x: chest.x - 34, y: chest.y - 26 };
    this.elbowS.update(handT.x, handT.y, dt);

    this.head.x = this.headS.x;
    this.head.y = this.headS.y;
    this.handsOn = handsOn;
    this.bar = bar;
    this.hip = { x: this.hipS.x, y: this.hipS.y };
    this.chest = { x: this.chestS.x, y: this.chestS.y };
    this.knee = { x: this.kneeS.x, y: this.kneeS.y };
    this.hand = { x: this.elbowS.x, y: this.elbowS.y };
  }
}
