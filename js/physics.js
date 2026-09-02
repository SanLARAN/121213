// ============================================================
//  Мини-физика: частицы + дистанционные связи (soft-body / ragdoll)
//  Всё в пикселях, y вниз. Решатель Гаусса-Зейделя с проекцией скорости.
// ============================================================

export class Particle {
  constructor(x, y, mass = 1) {
    this.x = x; this.y = y;
    this.px = x; this.py = y;          // предыдущая позиция (для скоростей)
    this.vx = 0; this.vy = 0;
    this.fx = 0; this.fy = 0;
    this.m = mass;
    this.im = mass > 0 ? 1 / mass : 0;
    this.grounded = false;
    this.groundNx = 0; this.groundNy = -1;
    this.contactSpeed = 0;
  }
  addForce(fx, fy) { this.fx += fx; this.fy += fy; }
  applyImpulse(ix, iy) { this.vx += ix * this.im; this.vy += iy * this.im; }
  setPos(x, y) { this.x = x; this.y = y; this.px = x; this.py = y; }
}

/**
 * Связь между двумя частицами.
 *  stiffness 0..1 — жёсткость (1 = жёсткий стержень)
 *  breakForce — рвётся при относительной перегрузке (0 = не рвётся)
 */
export class Constraint {
  constructor(a, b, rest = null, stiffness = 1, breakForce = 0) {
    this.a = a; this.b = b;
    this.rest = rest === null ? Math.hypot(b.x - a.x, b.y - a.y) : rest;
    this.stiffness = stiffness;
    this.breakForce = breakForce;
    this.broken = false;
    this.stress = 0;
  }
}

export class Physics {
  constructor() {
    this.particles = [];
    this.constraints = [];
    this.iterations = 6;
  }

  add(x, y, mass = 1) { const p = new Particle(x, y, mass); this.particles.push(p); return p; }

  link(a, b, stiffness = 1, rest = null, breakForce = 0) {
    const c = new Constraint(a, b, rest, stiffness, breakForce);
    this.constraints.push(c);
    return c;
  }

  removeParticle(p) {
    const i = this.particles.indexOf(p);
    if (i >= 0) this.particles.splice(i, 1);
    this.constraints = this.constraints.filter((c) => c.a !== p && c.b !== p);
  }

  clear() { this.particles.length = 0; this.constraints.length = 0; }

  /** Интеграция + решение связей */
  step(dt, gravity, drag = 0) {
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.im === 0) continue;
      p.vx += (p.fx * p.im) * dt;
      p.vy += (p.fy * p.im + gravity) * dt;
      if (drag > 0) {
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 1) {
          const f = Math.min(1, drag * sp * sp * dt / Math.max(1, p.m));
          p.vx -= p.vx * f; p.vy -= p.vy * f;
        }
      }
      p.fx = 0; p.fy = 0;
      p.px = p.x; p.py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.grounded = false;
    }
    this.solve();
  }

  solve() {
    for (let it = 0; it < this.iterations; it++) {
      for (let i = 0; i < this.constraints.length; i++) {
        const c = this.constraints[i];
        if (c.broken) continue;
        const a = c.a, b = c.b;
        const wsum = a.im + b.im;
        if (wsum === 0) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) { dx = 0.001; dy = 0; d = 0.001; }
        const diff = (d - c.rest) / d;
        const k = c.stiffness;
        const wa = (a.im / wsum) * k;
        const wb = (b.im / wsum) * k;
        const cx = dx * diff, cy = dy * diff;
        a.x += cx * wa; a.y += cy * wa;
        b.x -= cx * wb; b.y -= cy * wb;
        // проекция скорости вдоль связи (убирает «желе»)
        const nx = dx / d, ny = dy / d;
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const rel = rvx * nx + rvy * ny;
        const j = rel * k * 0.55;
        a.vx += nx * j * wa * 2; a.vy += ny * j * wa * 2;
        b.vx -= nx * j * wb * 2; b.vy -= ny * j * wb * 2;
        c.stress = Math.abs(d - c.rest) / Math.max(1, c.rest);
        if (c.breakForce > 0 && c.stress > c.breakForce) c.broken = true;
      }
    }
    // синхронизация скоростей с позициями (после проекции)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.im === 0) continue;
      // мягкая синхронизация, чтобы не гасить импульсы полностью
      p.vx = p.vx * 0.35 + (p.x - p.px) * 0.65;
      p.vy = p.vy * 0.35 + (p.y - p.py) * 0.65;
    }
  }

  /**
   * Столкновение частиц с террейном (terrain.heightAt / terrain.normalAt)
   * friction: 0..1+ (тангенциальное трение), restitution: отскок
   */
  collideTerrain(terrain, dt, opts = {}) {
    const { friction = 0.9, restitution = 0.1, radius = 6 } = opts;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.im === 0) continue;
      const h = terrain.heightAt(p.x);
      const pen = p.y + radius - h;
      if (pen <= 0) continue;
      const n = terrain.normalAt(p.x);
      // выталкивание по нормали
      p.x += n.x * pen;
      p.y += n.y * pen;
      const vn = p.vx * n.x + p.vy * n.y;
      const tx = -n.y, ty = n.x;
      const vt = p.vx * tx + p.vy * ty;
      const impact = -vn;
      let vnNew = vn;
      if (vn < 0) vnNew = -vn * restitution;
      const vtNew = vt * (1 - Math.min(0.95, friction * 0.35));
      p.vx = tx * vtNew + n.x * vnNew;
      p.vy = ty * vtNew + n.y * vnNew;
      p.grounded = true;
      p.groundNx = n.x; p.groundNy = n.y;
      p.contactSpeed = Math.abs(impact);
    }
  }
}
