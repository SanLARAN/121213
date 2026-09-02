// ============================================================
//  Рендер: небо, параллакс, трасса, самокат с тюнингом, рэгдолл, эффекты
// ============================================================
import { CFG } from './config.js';
import { SURF } from './terrain.js';
import { clamp, lerp, rgba, shade, TAU } from './utils.js';

const W = (v) => v; // px

// ---------------- небо и фон ----------------
export function drawSky(ctx, cam, vw, vh, tod, tint) {
  const skyTop = mixTime(tod, ['#0b1026', '#2b4f8f', '#1a2b52', '#05060f']);
  const skyBot = mixTime(tod, ['#2a3b6b', '#b9d6f2', '#e8956a', '#120a1e']);
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, skyTop);
  g.addColorStop(1, skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  // солнце / луна
  const sunX = vw * (0.18 + tod * 0.7);
  const sunY = vh * (0.62 - Math.sin(tod * Math.PI) * 0.42);
  const isNight = tod > 0.78 || tod < 0.14;
  ctx.save();
  ctx.globalAlpha = 0.9;
  const rg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, isNight ? 90 : 160);
  rg.addColorStop(0, isNight ? '#e8eeff' : '#fff3c4');
  rg.addColorStop(0.35, isNight ? 'rgba(200,215,255,0.25)' : 'rgba(255,220,140,0.35)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(sunX, sunY, isNight ? 90 : 160, 0, TAU); ctx.fill();
  ctx.fillStyle = isNight ? '#eef2ff' : '#fff6d0';
  ctx.beginPath(); ctx.arc(sunX, sunY, isNight ? 26 : 34, 0, TAU); ctx.fill();
  ctx.restore();

  // звёзды
  if (isNight) {
    ctx.save();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137.5) % vw);
      const sy = ((i * 71.3) % (vh * 0.55));
      ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.restore();
  }
}

function mixTime(tod, arr) {
  // arr: [ночь, день, закат, ночь]
  const seg = clamp(tod, 0, 1) * (arr.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = arr[Math.min(i, arr.length - 1)];
  const b = arr[Math.min(i + 1, arr.length - 1)];
  return mixHex(a, b, f);
}
function hex2rgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

// ---------------- параллакс-слои ----------------
export function drawParallax(ctx, cam, vw, vh, world, tod) {
  const base = cam.y;
  // дальние холмы
  layer(ctx, cam, vw, vh, 0.15, 0.35, '#00000022', (x) => 200 + Math.sin(x * 0.0013) * 110 + Math.sin(x * 0.0041) * 45, base + 220, mixTime(tod, ['#0a0f22', '#7f9dc4', '#5b3a4e', '#080a14']));
  layer(ctx, cam, vw, vh, 0.3, 0.55, '#00000022', (x) => 150 + Math.sin(x * 0.0021 + 2) * 80 + Math.sin(x * 0.0067) * 30, base + 320, mixTime(tod, ['#0d1329', '#63809f', '#4a2c3c', '#0a0c18']));
  // город
  drawCity(ctx, cam, vw, vh, 0.42, base + 380, tod);
  // ближние деревья/столбы
  drawTreeLine(ctx, cam, vw, vh, 0.68, base + 430, tod, world);
}

function layer(ctx, cam, vw, vh, par, scale, unused, fn, yBase, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const ox = cam.x * par;
  ctx.moveTo(-10, vh + 10);
  for (let sx = -10; sx <= vw + 10; sx += 16) {
    const wx = (sx + ox) / scale;
    const y = yBase - fn(wx) * 0.55 + (cam.y - yBase) * (1 - par) * 0.35;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(vw + 10, vh + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCity(ctx, cam, vw, vh, par, yBase, tod) {
  const ox = cam.x * par;
  const step = 90;
  const i0 = Math.floor((ox - 100) / step);
  const i1 = Math.ceil((ox + vw + 100) / step);
  const col = mixTime(tod, ['#0f1530', '#8fa8c4', '#6a4358', '#0c0f1c']);
  ctx.save();
  ctx.fillStyle = col;
  const night = tod > 0.72 || tod < 0.16;
  for (let i = i0; i <= i1; i++) {
    const h = 90 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 180;
    const sx = i * step - ox;
    const y = yBase - h + (cam.y - yBase) * (1 - par) * 0.35;
    ctx.fillRect(sx, y, step * 0.72, h + 400);
    if (night) {
      ctx.fillStyle = 'rgba(255,214,120,0.55)';
      for (let wy = y + 14; wy < y + h - 8; wy += 22) {
        for (let wx2 = sx + 8; wx2 < sx + step * 0.72 - 10; wx2 += 18) {
          if (((wx2 * 7 + wy * 13) % 11) < 5) ctx.fillRect(wx2, wy, 7, 9);
        }
      }
      ctx.fillStyle = col;
    }
  }
  ctx.restore();
}

function drawTreeLine(ctx, cam, vw, vh, par, yBase, tod, world) {
  const ox = cam.x * par;
  const step = 140;
  const i0 = Math.floor((ox - 100) / step);
  const i1 = Math.ceil((ox + vw + 100) / step);
  const dark = mixTime(tod, ['#080c18', '#4f7a52', '#3c2b33', '#060810']);
  ctx.save();
  for (let i = i0; i <= i1; i++) {
    const r = ((Math.sin(i * 78.233) * 12345.6789) % 1 + 1) % 1;
    const sx = i * step - ox + r * 40;
    const y = yBase + (cam.y - yBase) * (1 - par) * 0.35;
    if (r > 0.45) {
      // дерево
      ctx.fillStyle = dark;
      ctx.fillRect(sx - 4, y - 46, 8, 50);
      ctx.beginPath(); ctx.arc(sx, y - 58, 26 + r * 12, 0, TAU); ctx.fill();
    } else {
      // столб
      ctx.fillStyle = dark;
      ctx.fillRect(sx - 3, y - 108, 6, 112);
      ctx.fillRect(sx - 18, y - 112, 36, 6);
    }
  }
  ctx.restore();
}

// ---------------- трасса ----------------
export function drawTerrain(ctx, cam, vw, vh, world) {
  const terr = world.terrain;
  const x0 = Math.max(0, cam.x - 120);
  const x1 = Math.min(terr.length + 200, cam.x + vw + 120);
  const bottom = cam.y + vh + 200;
  const step = 8;

  // тело
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  for (let x = x0; x <= x1; x += step) ctx.lineTo(x, terr.heightAt(x));
  ctx.lineTo(x1, bottom);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, cam.y - 100, 0, cam.y + vh);
  g.addColorStop(0, '#3a3f47');
  g.addColorStop(1, '#16181c');
  ctx.fillStyle = g;
  ctx.fill();

  // поверхностные полосы по типу грунта
  let runStart = x0;
  let curKey = terr.surfKeyAt(x0);
  for (let x = x0 + step; x <= x1 + step; x += step) {
    const k = terr.surfKeyAt(x);
    if (k !== curKey || x > x1) {
      strokeSurf(ctx, terr, runStart, Math.min(x, x1), SURF[curKey]);
      runStart = x;
      curKey = k;
    }
  }

  // текстура: штриховка грунта
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 26) {
    const y = terr.heightAt(x);
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 12, y + 46);
  }
  ctx.stroke();
  ctx.restore();

  // камни/крапинки
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let x = Math.floor(x0 / 40) * 40; x <= x1; x += 40) {
    const y = terr.heightAt(x);
    const r = ((Math.sin(x * 0.11) * 1000) % 1 + 1) % 1;
    ctx.fillStyle = r > 0.5 ? '#00000055' : '#ffffff22';
    ctx.beginPath(); ctx.arc(x, y + 14 + r * 40, 3 + r * 5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function strokeSurf(ctx, terr, xa, xb, surf) {
  if (xb <= xa) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xa, terr.heightAt(xa));
  for (let x = xa; x <= xb; x += 8) ctx.lineTo(x, terr.heightAt(x));
  // толстая «корка»
  ctx.lineWidth = 16;
  ctx.strokeStyle = surf.body;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = surf.top;
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = surf.line;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.restore();

  // разметка на асфальте/бетоне
  if (surf === SURF.asphalt || surf === SURF.concrete) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 34]);
    ctx.beginPath();
    ctx.moveTo(xa, terr.heightAt(xa) + 26);
    for (let x = xa; x <= xb; x += 8) ctx.lineTo(x, terr.heightAt(x) + 26);
    ctx.stroke();
    ctx.restore();
  }
  if (surf === SURF.grass) {
    ctx.save();
    ctx.strokeStyle = 'rgba(140,220,120,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = xa; x <= xb; x += 14) {
      const y = terr.heightAt(x);
      ctx.moveTo(x, y - 2); ctx.lineTo(x + 4, y - 12);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------- декор и объекты ----------------
export function drawDecor(ctx, cam, vw, vh, world, time) {
  const terr = world.terrain;
  for (const d of world.decor) {
    if (d.x < cam.x - 400 || d.x > cam.x + vw + 400) continue;
    const y = d.y !== undefined ? d.y : terr.heightAt(d.x);
    if (d.type === 'lamp') drawLamp(ctx, d.x, y, time);
    else if (d.type === 'bench') drawBench(ctx, d.x, y);
    else if (d.type === 'hay') drawHay(ctx, d.x, y);
    else if (d.type === 'tractor') drawTractor(ctx, d.x, y);
    else if (d.type === 'rampdeco') drawRampDeco(ctx, terr, d);
    else if (d.type === 'loop') drawLoopDeco(ctx, d);
    else if (d.type === 'quarter') drawQuarterDeco(ctx, d);
  }
}

function drawLamp(ctx, x, y, time) {
  ctx.save();
  ctx.fillStyle = '#2f343b';
  ctx.fillRect(x - 5, y - 210, 10, 212);
  ctx.fillRect(x - 4, y - 218, 46, 9);
  ctx.fillStyle = '#3b4149';
  ctx.beginPath(); ctx.ellipse(x + 42, y - 206, 20, 9, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x + 42, y - 200, 4, x + 42, y - 200, 130);
  g.addColorStop(0, 'rgba(255,224,150,0.55)');
  g.addColorStop(1, 'rgba(255,224,150,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + 22, y - 200); ctx.lineTo(x + 130, y - 6); ctx.lineTo(x - 46, y - 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.ellipse(x + 42, y - 200, 12, 5, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawBench(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(x - 60, y - 34, 120, 10);
  ctx.fillRect(x - 60, y - 56, 120, 9);
  ctx.fillStyle = '#3a3f45';
  ctx.fillRect(x - 52, y - 34, 8, 34);
  ctx.fillRect(x + 44, y - 34, 8, 34);
  ctx.restore();
}
function drawHay(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath(); ctx.ellipse(x, y - 40, 56, 42, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a8842f'; ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x, y - 40, 56 - Math.abs(i) * 12, 42 - Math.abs(i) * 9, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawTractor(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#2f7a3a';
  ctx.fillRect(x - 70, y - 90, 110, 56);
  ctx.fillRect(x + 20, y - 130, 54, 60);
  ctx.fillStyle = '#1d1f22';
  ctx.beginPath(); ctx.arc(x - 40, y - 26, 42, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 56, y - 18, 26, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c8c8c8';
  ctx.beginPath(); ctx.arc(x - 40, y - 26, 16, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 56, y - 18, 10, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawRampDeco(ctx, terr, d) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const x = d.x + (d.len / 6) * i;
    const y = terr.heightAt(x);
    if (i === 0) ctx.moveTo(x, y + 6); else ctx.lineTo(x, y + 6);
  }
  ctx.stroke();
  // флажки на губе
  const lipX = d.x + d.len, lipY = terr.heightAt(lipX);
  ctx.fillStyle = '#ffcf3d';
  ctx.fillRect(lipX - 3, lipY - 46, 4, 46);
  ctx.beginPath(); ctx.moveTo(lipX + 1, lipY - 46); ctx.lineTo(lipX + 30, lipY - 38); ctx.lineTo(lipX + 1, lipY - 28); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawLoopDeco(ctx, d) {
  ctx.save();
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#6f757c';
  ctx.beginPath(); ctx.arc(d.x, d.cy, d.r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#c3c9cf';
  ctx.beginPath(); ctx.arc(d.x, d.cy, d.r, 0, TAU); ctx.stroke();
  ctx.setLineDash([16, 22]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(d.x, d.cy, d.r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  // опоры
  ctx.fillStyle = '#4a4f56';
  ctx.fillRect(d.x - d.r - 12, d.cy + d.r - 20, 24, 60);
  ctx.fillRect(d.x + d.r - 12, d.cy + d.r - 20, 24, 60);
  ctx.restore();
}
function drawQuarterDeco(ctx, d) {
  ctx.save();
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#8d939a';
  ctx.beginPath();
  ctx.arc(d.x + (d.side > 0 ? -d.r : d.r), d.cy, d.r, d.side > 0 ? -Math.PI / 2 : Math.PI, d.side > 0 ? 0 : Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}

export function drawObjects(ctx, cam, vw, vh, world, time) {
  const terr = world.terrain;
  // шипы
  for (const sp of world.spikes) {
    if (sp.x + sp.w < cam.x - 100 || sp.x > cam.x + vw + 100) continue;
    ctx.save();
    ctx.fillStyle = '#8b8f96';
    ctx.beginPath();
    for (let x = sp.x; x < sp.x + sp.w; x += 34) {
      ctx.moveTo(x, sp.y); ctx.lineTo(x + 17, sp.y - 46); ctx.lineTo(x + 34, sp.y);
    }
    ctx.fill();
    ctx.restore();
  }
  // ящики
  for (const c of world.colliders) {
    if (c.dead || c.type !== 'box') continue;
    if (c.x < cam.x - 200 || c.x > cam.x + vw + 200) continue;
    drawCrate(ctx, c);
  }
  // дуги (квотерпайпы)
  for (const c of world.colliders) {
    if (c.type !== 'arc' || c.tag === 'loop') continue;
    if (c.cx < cam.x - 500 || c.cx > cam.x + vw + 500) continue;
    ctx.save();
    ctx.lineWidth = 24;
    ctx.strokeStyle = '#8d939a';
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, c.a0, c.a1); ctx.stroke();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#c3c9cf';
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, c.a0, c.a1); ctx.stroke();
    ctx.restore();
  }
  // монеты
  for (const co of world.coins) {
    if (co.taken || co.x < cam.x - 100 || co.x > cam.x + vw + 100) continue;
    const bob = Math.sin(time * 3 + co.x * 0.01) * 5;
    ctx.save();
    ctx.translate(co.x, co.y + bob);
    const sq = Math.abs(Math.cos(time * 3 + co.x * 0.02));
    ctx.scale(0.35 + sq * 0.65, 1);
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#e0a311');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8f6504'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#8f6504';
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('₽', 0, 1);
    ctx.restore();
  }
  // посылки
  for (const p of world.parcels) {
    if (p.taken || p.x < cam.x - 150 || p.x > cam.x + vw + 150) continue;
    drawParcel(ctx, p, time);
  }
  // машины
  for (const car of world.cars) {
    if (car.dead || car.x < cam.x - 300 || car.x > cam.x + vw + 300) continue;
    drawCar(ctx, car, time);
  }
  // чекпоинты
  for (const cp of world.checkpoints) {
    if (cp.x < cam.x - 200 || cp.x > cam.x + vw + 200) continue;
    drawCheckpoint(ctx, cp, terr.heightAt(cp.x), time);
  }
  // финиш
  const fx = world.finishX;
  if (fx > cam.x - 300 && fx < cam.x + vw + 300) {
    const y = terr.heightAt(fx);
    ctx.save();
    ctx.fillStyle = '#22262b';
    ctx.fillRect(fx - 10, y - 230, 14, 232);
    ctx.fillRect(fx + 130, y - 230, 14, 232);
    for (let r = 0; r < 6; r++) for (let cix = 0; cix < 5; cix++) {
      ctx.fillStyle = (r + cix) % 2 ? '#f2f2f2' : '#15171a';
      ctx.fillRect(fx + 4 + cix * 26, y - 226 + r * 22, 26, 22);
    }
    ctx.fillStyle = '#ffcf3d';
    ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ФИНИШ', fx + 70, y - 250);
    ctx.restore();
  }
}

function drawCrate(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = '#b5813f';
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.strokeStyle = '#7d5622'; ctx.lineWidth = 4;
  ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.beginPath();
  ctx.moveTo(-c.w / 2, -c.h / 2); ctx.lineTo(c.w / 2, c.h / 2);
  ctx.moveTo(c.w / 2, -c.h / 2); ctx.lineTo(-c.w / 2, c.h / 2);
  ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, 6);
  ctx.restore();
}

function drawParcel(ctx, p, time) {
  const bob = Math.sin(time * 2.4) * 6;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  const isDrop = p.kind === 'drop';
  ctx.fillStyle = isDrop ? '#2fbf6a' : '#ffcf3d';
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.rotate(Math.sin(time * 1.6) * 0.12);
  ctx.fillStyle = '#c9924a';
  ctx.fillRect(-26, -24, 52, 48);
  ctx.strokeStyle = '#8a6228'; ctx.lineWidth = 3;
  ctx.strokeRect(-26, -24, 52, 48);
  ctx.fillStyle = isDrop ? '#2fbf6a' : '#ffcf3d';
  ctx.fillRect(-26, -8, 52, 14);
  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isDrop ? '⬇' : '📦', 0, -1);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = isDrop ? '#7dffb0' : '#ffe27a';
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(isDrop ? 'ТОЧКА ВЫДАЧИ' : 'ЗАБРАТЬ ЗАКАЗ', p.x, p.y + bob - 56);
  ctx.restore();
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.scale(car.dir > 0 ? 1 : -1, 1);
  const w = car.w, h = car.h;
  ctx.fillStyle = '#15171a';
  ctx.beginPath(); ctx.arc(-w * 0.28, -14, 20, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.28, -14, 20, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8b8f96';
  ctx.beginPath(); ctx.arc(-w * 0.28, -14, 9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.28, -14, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = car.color;
  if (car.kind === 'van' || car.kind === 'truck') {
    ctx.fillRect(-w / 2, -h - 12, w, h);
    ctx.fillStyle = shade(car.color, 0.8);
    ctx.fillRect(-w / 2, -h - 12, w * 0.22, h);
  } else {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -14);
    ctx.lineTo(-w / 2, -h * 0.55);
    ctx.lineTo(-w * 0.2, -h);
    ctx.lineTo(w * 0.22, -h);
    ctx.lineTo(w / 2, -h * 0.5);
    ctx.lineTo(w / 2, -14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillRect(-w * 0.16, -h + 6, w * 0.34, h * 0.3);
  ctx.fillStyle = '#ffe27a';
  ctx.fillRect(w / 2 - 8, -h * 0.5, 8, 10);
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111';
    ctx.fillRect(-14, -h - 22, 28, 12);
    ctx.fillStyle = '#ffcf3d';
    ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('T', 0, -h - 13);
  }
  ctx.restore();
}

function drawCheckpoint(ctx, cp, y, time) {
  ctx.save();
  ctx.translate(cp.x, y);
  const done = cp.done;
  ctx.fillStyle = '#22262b';
  ctx.fillRect(-4, -190, 8, 192);
  ctx.fillStyle = done ? '#2fbf6a' : '#ffcf3d';
  const wave = Math.sin(time * 3) * 6;
  ctx.beginPath();
  ctx.moveTo(4, -188);
  ctx.lineTo(64, -172 + wave);
  ctx.lineTo(4, -140);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(0, -100, 60 + Math.sin(time * 4) * 6, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------- САМОКАТ + РАЙДЕР ----------------
export function drawScooter(ctx, sc, time) {
  const spec = sc.spec;
  const cos = sc.cosmetics || {};
  const paint = (cos.paint && cos.paint.color) || spec.color;
  const glow = cos.glow && cos.glow.color;
  const wheelskin = (cos.wheelskin && cos.wheelskin.id) || 'stock';
  const wing = (cos.wing && cos.wing.id) || 'none';
  const style = spec.style || 'city';
  const accent = spec.accent || '#222';
  const R = sc.wheelR;
  const knobby = style !== 'city';

  ctx.save();
  if (glow) {
    const g = ctx.createRadialGradient(sc.x, sc.y + R * 0.5, 4, sc.x, sc.y + R * 0.5, R * 3.4);
    g.addColorStop(0, rgba(glow, 0.5));
    g.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sc.x, sc.y + R * 0.5, R * 3.4, 0, TAU); ctx.fill();
  }
  if (sc.boosting) {
    const back = sc.toWorld(-sc.wb / 2 - 10, -10);
    ctx.save();
    ctx.translate(back.x, back.y);
    ctx.rotate(sc.angle);
    const len = 60 + Math.sin(time * 40) * 16;
    const g = ctx.createLinearGradient(0, 0, -len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(120,220,255,0.8)');
    g.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-len, 0); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // колёса
  const rim = style === 'dirt' ? accent : null;
  drawWheel(ctx, sc.wheelPos('rear').x, sc.wheelPos('rear').y, R, sc.rear.spin, { skin: wheelskin, knobby, rim, disc: knobby, glow, slip: sc.rear.slip });
  drawWheel(ctx, sc.wheelPos('front').x, sc.wheelPos('front').y, R, sc.front.spin, { skin: wheelskin, knobby, rim, disc: knobby, glow, slip: sc.front.slip });

  ctx.save();
  ctx.translate(sc.x, sc.y);
  ctx.rotate(sc.angle);
  if (style === 'dirt') drawDirtBody(ctx, sc, paint, accent, time);
  else if (style === 'offroad') drawOffroadBody(ctx, sc, paint, accent, time);
  else drawCityBody(ctx, sc, paint, accent, time);

  if (wing === 'spoiler') {
    ctx.fillStyle = '#15181c';
    ctx.beginPath();
    ctx.moveTo(-sc.wb * 0.44, -sc.deckH - 10);
    ctx.lineTo(-sc.wb * 0.66, -sc.deckH - 52);
    ctx.lineTo(-sc.wb * 0.6, -sc.deckH - 60);
    ctx.lineTo(-sc.wb * 0.4, -sc.deckH - 18);
    ctx.closePath(); ctx.fill();
  } else if (wing === 'flag') {
    ctx.strokeStyle = '#2c3138'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-sc.wb * 0.4, -sc.deckH - 6); ctx.lineTo(-sc.wb * 0.5, -sc.deckH - 96); ctx.stroke();
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.moveTo(-sc.wb * 0.5, -sc.deckH - 96);
    ctx.lineTo(-sc.wb * 0.5 + 52, -sc.deckH - 84 + Math.sin(time * 6) * 5);
    ctx.lineTo(-sc.wb * 0.5, -sc.deckH - 66);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // посылки на деке
  if (sc.parcels > 0) {
    for (let i = 0; i < Math.min(3, sc.parcels); i++) {
      const off = sc.toWorld(-sc.wb * 0.3, -sc.deckH - 20 - i * 30);
      ctx.save();
      ctx.translate(off.x, off.y);
      ctx.rotate(sc.angle);
      ctx.fillStyle = '#c9924a';
      ctx.fillRect(-16, -14, 32, 28);
      ctx.strokeStyle = '#8a6228'; ctx.lineWidth = 2.5; ctx.strokeRect(-16, -14, 32, 28);
      ctx.fillStyle = '#ffcf3d'; ctx.fillRect(-16, -4, 32, 8);
      ctx.restore();
    }
  }
  ctx.restore();

  drawRider(ctx, sc, time);
}

// ---------- городской самокат (как Kugoo S-серии) ----------
function drawCityBody(ctx, sc, paint, accent, time) {
  const wb = sc.wb, deckH = sc.deckH, R = sc.wheelR;
  const stemTop = { x: wb / 2 - 12, y: -deckH - sc.stemLen };
  ctx.lineCap = 'round';

  // заднее крыло
  ctx.strokeStyle = '#242a32'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(-wb / 2, 0, R + 9, Math.PI * 0.95, Math.PI * 1.9); ctx.stroke();
  // стоп-сигнал
  ctx.fillStyle = '#e02020';
  roundRect(ctx, -wb / 2 - R - 12, -10, 12, 7, 3); ctx.fill();

  // дека: борта + шкурка
  ctx.fillStyle = '#20242b';
  roundRect(ctx, -wb * 0.46, -deckH - 6, wb * 0.86, 15, 6); ctx.fill();
  ctx.fillStyle = paint;
  roundRect(ctx, -wb * 0.46, -deckH - 10, wb * 0.86, 7, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, -wb * 0.4, -deckH - 11, wb * 0.72, 4, 2); ctx.fill();
  // батарея в деке + индикатор
  ctx.fillStyle = '#22262b';
  roundRect(ctx, -wb * 0.3, -deckH + 8, wb * 0.5, 14, 5); ctx.fill();
  ctx.fillStyle = sc.battery / sc.batteryMax > 0.25 ? '#39e07a' : '#ff5a4a';
  ctx.fillRect(-wb * 0.28, -deckH + 11, wb * 0.46 * clamp(sc.battery / sc.batteryMax, 0, 1), 6);

  // складной узел у переднего колеса
  ctx.fillStyle = '#2c3138';
  ctx.beginPath(); ctx.arc(wb / 2 - 8, -deckH - 18, 10, 0, TAU); ctx.fill();
  // пружинка амортизатора у складного узла
  ctx.strokeStyle = '#565d66'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.lineTo(wb / 2 - 20 + i * 3, -deckH - 6 - (i % 2) * 6);
  ctx.stroke();

  // рулевая колонка: чёрный низ + светлый верх
  ctx.strokeStyle = shade(paint, 0.7); ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(wb / 2 - 8, -deckH - 10); ctx.lineTo(wb / 2 - 11, -deckH - sc.stemLen * 0.45); ctx.stroke();
  ctx.strokeStyle = '#c9ced4'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(wb / 2 - 11, -deckH - sc.stemLen * 0.45); ctx.lineTo(stemTop.x, stemTop.y); ctx.stroke();
  // фара на колонке
  ctx.fillStyle = '#111';
  roundRect(ctx, stemTop.x - 26, -deckH - sc.stemLen * 0.62, 12, 10, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,200,0.9)';
  ctx.beginPath(); ctx.arc(stemTop.x - 26, -deckH - sc.stemLen * 0.62 + 5, 3.5, 0, TAU); ctx.fill();

  // руль T + грипсы + дисплей + тормозные ручки
  ctx.strokeStyle = '#2b323b'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(stemTop.x - sc.barW / 2, stemTop.y + 2); ctx.lineTo(stemTop.x + sc.barW / 2, stemTop.y + 2); ctx.stroke();
  ctx.fillStyle = '#0d0e10';
  roundRect(ctx, stemTop.x - sc.barW / 2 - 6, stemTop.y - 4, 22, 12, 6); ctx.fill();
  roundRect(ctx, stemTop.x + sc.barW / 2 - 16, stemTop.y - 4, 22, 12, 6); ctx.fill();
  ctx.strokeStyle = '#3a3f45'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(stemTop.x - sc.barW / 2 + 14, stemTop.y + 2); ctx.lineTo(stemTop.x - sc.barW / 2 + 34, stemTop.y + 10); ctx.stroke();
  ctx.fillStyle = '#0b1a24';
  roundRect(ctx, stemTop.x - 14, stemTop.y - 24, 28, 18, 4); ctx.fill();
  ctx.fillStyle = '#49e6ff';
  ctx.fillRect(stemTop.x - 10, stemTop.y - 20, 20 * clamp(sc.battery / sc.batteryMax, 0, 1), 4);

  // переднее крыло
  ctx.strokeStyle = '#242a32'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(wb / 2, 0, R + 8, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
}

// ---------- внедорожный самокат (Kirin / G-Booster) ----------
function drawOffroadBody(ctx, sc, paint, accent, time) {
  const wb = sc.wb, deckH = sc.deckH, R = sc.wheelR;
  const stemTop = { x: wb / 2 - 14, y: -deckH - sc.stemLen };
  ctx.lineCap = 'round';

  // пружины подвески (акцент)
  spring(ctx, -wb * 0.34, -deckH * 0.4, -wb / 2 + 6, -6, accent);
  spring(ctx, wb * 0.3, -deckH * 0.4, wb / 2 - 8, -6, accent);

  // заднее крыло-обвес
  ctx.fillStyle = '#15181c';
  ctx.beginPath();
  ctx.moveTo(-wb / 2 - R - 8, 6);
  ctx.lineTo(-wb / 2 + 4, -R - 14);
  ctx.lineTo(-wb * 0.2, -deckH - 4);
  ctx.lineTo(-wb * 0.46, -deckH - 4);
  ctx.closePath(); ctx.fill();

  // массивная дека с боковиной и шевронами
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(-wb * 0.5, -deckH - 2);
  ctx.lineTo(wb * 0.42, -deckH - 2);
  ctx.lineTo(wb * 0.34, -deckH + 16);
  ctx.lineTo(-wb * 0.42, -deckH + 16);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#20242b';
  roundRect(ctx, -wb * 0.46, -deckH - 10, wb * 0.88, 8, 3); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const x = -wb * 0.3 + i * wb * 0.18;
    ctx.beginPath(); ctx.moveTo(x, -deckH + 2); ctx.lineTo(x + 10, -deckH + 8); ctx.lineTo(x, -deckH + 14); ctx.stroke();
  }

  // рулевая колонка с фарой
  ctx.strokeStyle = paint; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(wb / 2 - 8, -deckH - 6); ctx.lineTo(stemTop.x, stemTop.y); ctx.stroke();
  ctx.strokeStyle = accent; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(wb / 2 - 14, -deckH - 10); ctx.lineTo(stemTop.x - 4, stemTop.y + 8); ctx.stroke();
  ctx.fillStyle = '#0d0e10';
  roundRect(ctx, stemTop.x - 30, -deckH - sc.stemLen * 0.55, 14, 12, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,200,0.95)';
  ctx.beginPath(); ctx.arc(stemTop.x - 30, -deckH - sc.stemLen * 0.55 + 6, 4, 0, TAU); ctx.fill();

  // руль + грипсы + дисплей
  ctx.strokeStyle = '#2b323b'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(stemTop.x - sc.barW / 2, stemTop.y + 2); ctx.lineTo(stemTop.x + sc.barW / 2, stemTop.y + 2); ctx.stroke();
  ctx.fillStyle = '#0d0e10';
  roundRect(ctx, stemTop.x - sc.barW / 2 - 6, stemTop.y - 4, 24, 13, 6); ctx.fill();
  roundRect(ctx, stemTop.x + sc.barW / 2 - 18, stemTop.y - 4, 24, 13, 6); ctx.fill();
  ctx.fillStyle = '#0b1a24';
  roundRect(ctx, stemTop.x - 15, stemTop.y - 26, 30, 19, 4); ctx.fill();
  ctx.fillStyle = '#49e6ff';
  ctx.fillRect(stemTop.x - 11, stemTop.y - 21, 22 * clamp(sc.battery / sc.batteryMax, 0, 1), 4);
}

// ---------- питбайк / эндуро (Wish 01, Pit Bike V5) ----------
function drawDirtBody(ctx, sc, paint, accent, time) {
  const wb = sc.wb, deckH = sc.deckH, R = sc.wheelR;
  const bar = { x: wb / 2 - 10, y: -deckH - sc.stemLen };
  ctx.lineCap = 'round';

  // передняя вилка: две перья (акцент) от руля к оси
  ctx.strokeStyle = paint; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(bar.x - 4, bar.y + 14); ctx.lineTo(wb / 2 + 4, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bar.x + 6, bar.y + 14); ctx.lineTo(wb / 2 + 12, 2); ctx.stroke();
  // переднее крыло
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(wb / 2 - R - 4, -R * 0.6);
  ctx.lineTo(wb / 2 + R * 0.7, -R * 1.05);
  ctx.lineTo(wb / 2 + R + 4, -R * 0.5);
  ctx.closePath(); ctx.fill();
  // круглая фара
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(bar.x - 14, bar.y + 10, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,200,0.95)';
  ctx.beginPath(); ctx.arc(bar.x - 14, bar.y + 10, 7, 0, TAU); ctx.fill();

  // высокий руль + грипсы
  ctx.strokeStyle = '#2b323b'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(bar.x - sc.barW / 2, bar.y); ctx.lineTo(bar.x + sc.barW / 2, bar.y); ctx.stroke();
  ctx.fillStyle = '#0d0e10';
  roundRect(ctx, bar.x - sc.barW / 2 - 6, bar.y - 6, 22, 12, 6); ctx.fill();
  roundRect(ctx, bar.x + sc.barW / 2 - 16, bar.y - 6, 22, 12, 6); ctx.fill();

  // рама: бак/батарея + боковая панель с лого
  ctx.strokeStyle = paint; ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-wb * 0.4, -deckH * 0.7);
  ctx.lineTo(-wb * 0.02, -deckH * 1.35);
  ctx.lineTo(wb * 0.3, -deckH * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#1b1d20';
  roundRect(ctx, -wb * 0.24, -deckH * 1.28, wb * 0.34, 34, 6); ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = '900 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('K', -wb * 0.07, -deckH * 1.1);

  // седло, задранный хвост
  ctx.fillStyle = '#101214';
  ctx.beginPath();
  ctx.moveTo(-wb * 0.46, -deckH * 1.5);
  ctx.lineTo(-wb * 0.02, -deckH * 1.42);
  ctx.lineTo(-wb * 0.02, -deckH * 1.6);
  ctx.lineTo(-wb * 0.4, -deckH * 1.78);
  ctx.closePath(); ctx.fill();

  // маятник и задний амортизатор
  ctx.strokeStyle = '#3a3f45'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-wb * 0.1, -deckH * 0.5); ctx.lineTo(-wb / 2, 0); ctx.stroke();
  spring(ctx, -wb * 0.18, -deckH * 1.1, -wb * 0.34, -deckH * 0.45, paint);

  // подножки
  ctx.strokeStyle = '#15181c'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-wb * 0.1, -deckH * 0.35); ctx.lineTo(-wb * 0.02, -deckH * 0.3); ctx.stroke();
}

function spring(ctx, x0, y0, x1, y1, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.beginPath();
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const off = (i % 2 ? 5 : -5);
    ctx.lineTo(x + off * 0.6, y + off);
  }
  ctx.stroke();
}

function drawWheel(ctx, x, y, R, spin, o = {}) {
  const { skin = 'stock', knobby = false, rim = null, disc = false, glow = null, slip = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  // шина
  ctx.fillStyle = '#20242b';
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  if (knobby) {
    ctx.save();
    ctx.rotate(spin);
    ctx.fillStyle = '#20242b';
    const teeth = Math.max(8, Math.round(R / 5));
    for (let i = 0; i < teeth; i++) {
      ctx.rotate(TAU / teeth);
      ctx.fillRect(R * 0.86, -R * 0.12, R * 0.2, R * 0.24);
    }
    ctx.restore();
    ctx.strokeStyle = '#2b2f35'; ctx.lineWidth = Math.max(3, R * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, TAU); ctx.stroke();
  } else {
    ctx.strokeStyle = '#2b2f35'; ctx.lineWidth = Math.max(3, R * 0.13);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.93, 0, TAU); ctx.stroke();
  }

  ctx.save();
  ctx.rotate(spin);
  if (rim) {
    // цветной обод + спицы (эндуро)
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(3, R * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.64, 0); ctx.stroke(); }
  } else if (skin === 'spokes') {
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.7, 0); ctx.stroke(); }
  } else if (skin === 'turbo') {
    ctx.fillStyle = '#c9ced4';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7d848c';
    for (let i = 0; i < 5; i++) {
      ctx.rotate(TAU / 5);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.14); ctx.lineTo(R * 0.58, -R * 0.3); ctx.lineTo(R * 0.58, R * 0.14); ctx.lineTo(0, R * 0.14);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#3a3f45';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8b9199';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5b6169'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-R * 0.5, 0); ctx.lineTo(R * 0.5, 0); ctx.stroke();
  }
  ctx.restore();

  // тормозной диск
  if (disc) {
    ctx.strokeStyle = '#c3c9cf'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#c3c9cf';
    for (let i = 0; i < 5; i++) {
      const a = spin + (i / 5) * TAU;
      ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28, 2, 0, TAU); ctx.fill();
    }
  }
  if (glow) {
    ctx.strokeStyle = rgba(glow, 0.85);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  if (slip > 0.15) {
    ctx.save();
    ctx.globalAlpha = clamp(slip, 0, 1) * 0.5;
    ctx.fillStyle = '#d8d8d8';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - R * 0.6, y + R * 0.6 - i * 6, 6 + i * 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawRider(ctx, sc, time) {
  const r = sc.rider;
  const cos = sc.cosmetics || {};
  const kit = (cos.rider && cos.rider) || { box: '#4a7dd6' };
  const skin = '#e8b48c';
  const pants = '#2b3550';
  const jacket = '#3f5aa8';

  if (r.detached && r.ragParts) {
    const p = r.ragParts;
    ctx.save();
    ctx.lineCap = 'round';
    // ноги
    ctx.strokeStyle = pants; ctx.lineWidth = 15;
    line(ctx, p.pelvis.x, p.pelvis.y, p.footL.x, p.footL.y);
    line(ctx, p.pelvis.x, p.pelvis.y, p.footR.x, p.footR.y);
    // торс
    ctx.strokeStyle = jacket; ctx.lineWidth = 22;
    line(ctx, p.pelvis.x, p.pelvis.y, p.neck.x, p.neck.y);
    // руки
    ctx.strokeStyle = jacket; ctx.lineWidth = 11;
    line(ctx, p.neck.x, p.neck.y, p.handL.x, p.handL.y);
    line(ctx, p.neck.x, p.neck.y, p.handR.x, p.handR.y);
    // короб
    ctx.save();
    const ang = Math.atan2(p.neck.y - p.pelvis.y, p.neck.x - p.pelvis.x) + Math.PI / 2;
    ctx.translate(p.neck.x, p.neck.y); ctx.rotate(ang);
    ctx.fillStyle = kit.box || '#4a7dd6';
    roundRect(ctx, -22, -34, 44, 38, 7); ctx.fill();
    ctx.restore();
    // голова
    drawHead(ctx, p.head.x, p.head.y, Math.atan2(p.head.y - p.neck.y, p.head.x - p.neck.x) + Math.PI / 2, skin, cos);
    ctx.restore();
    return;
  }

  const hip = r.hip, chest = r.chest, head = r.head, knee = r.knee, hand = r.hand;
  const bar = r.bar;
  ctx.save();
  ctx.lineCap = 'round';

  const pose = r.pose;
  let footA = sc.toWorld(-sc.wb * 0.12, -sc.deckH - 2);
  let footB = sc.toWorld(sc.wb * 0.02, -sc.deckH - 2);
  let handA = bar ? { x: bar.x - 10, y: bar.y + 6 } : hand;
  let handB = bar ? { x: bar.x + 10, y: bar.y + 4 } : hand;

  if (pose === 'superman') {
    footA = { x: hip.x - 92, y: hip.y + 34 };
    footB = { x: hip.x - 104, y: hip.y + 46 };
    handA = { x: chest.x + 62, y: chest.y - 30 };
    handB = { x: chest.x + 52, y: chest.y - 16 };
  } else if (pose === 'nohands') {
    handA = { x: chest.x - 10, y: chest.y - 52 };
    handB = { x: chest.x + 24, y: chest.y - 56 };
  } else if (pose === 'tuck') {
    handA = bar ? { x: bar.x - 8, y: bar.y + 10 } : hand;
    handB = bar ? { x: bar.x + 8, y: bar.y + 8 } : hand;
    footA = sc.toWorld(-sc.wb * 0.08, -sc.deckH - 2);
    footB = sc.toWorld(sc.wb * 0.06, -sc.deckH - 2);
  }

  // ноги
  ctx.strokeStyle = pants; ctx.lineWidth = 15;
  line(ctx, hip.x, hip.y, knee.x, knee.y);
  line(ctx, knee.x, knee.y, footA.x, footA.y);
  ctx.lineWidth = 13;
  line(ctx, hip.x, hip.y, knee.x + 6, knee.y + 4);
  line(ctx, knee.x + 6, knee.y + 4, footB.x, footB.y);
  // ботинки
  ctx.fillStyle = '#1b1d20';
  ctx.beginPath(); ctx.arc(footA.x, footA.y, 9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(footB.x, footB.y, 8, 0, TAU); ctx.fill();

  // торс
  ctx.strokeStyle = jacket; ctx.lineWidth = 24;
  line(ctx, hip.x, hip.y, chest.x, chest.y);
  // короб курьера на спине
  const ang = Math.atan2(chest.y - hip.y, chest.x - hip.x) + Math.PI / 2;
  ctx.save();
  ctx.translate(chest.x, chest.y); ctx.rotate(ang);
  ctx.fillStyle = kit.box || '#4a7dd6';
  roundRect(ctx, -24, -30, 48, 40, 8); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, -24, -30, 48, 12, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-24, -6); ctx.lineTo(24, -6); ctx.stroke();
  ctx.restore();

  // руки
  ctx.strokeStyle = jacket; ctx.lineWidth = 11;
  line(ctx, chest.x, chest.y, (chest.x + handA.x) / 2, (chest.y + handA.y) / 2 + 8);
  line(ctx, (chest.x + handA.x) / 2, (chest.y + handA.y) / 2 + 8, handA.x, handA.y);
  line(ctx, chest.x, chest.y, (chest.x + handB.x) / 2, (chest.y + handB.y) / 2 + 12);
  line(ctx, (chest.x + handB.x) / 2, (chest.y + handB.y) / 2 + 12, handB.x, handB.y);
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(handA.x, handA.y, 6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(handB.x, handB.y, 6, 0, TAU); ctx.fill();

  // голова
  const headAng = Math.atan2(head.y - chest.y, head.x - chest.x) + Math.PI / 2;
  drawHead(ctx, head.x, head.y, headAng, skin, cos);
  ctx.restore();
}

function drawHead(ctx, x, y, ang, skin, cos) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // шея/лицо
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0, 2, 13, 0, TAU); ctx.fill();
  // шлем
  const helmet = (cos.rider && cos.rider.id === 'yando') ? '#e02020' : (cos.rider && cos.rider.id === 'gold') ? '#ffcf3d' : '#22262b';
  ctx.fillStyle = helmet;
  ctx.beginPath(); ctx.arc(0, -1, 15, Math.PI, TAU); ctx.fill();
  ctx.fillRect(-15, -2, 30, 5);
  ctx.fillStyle = 'rgba(120,200,255,0.55)';
  ctx.beginPath(); ctx.arc(4, 3, 8, -0.5, 1.1); ctx.fill();
  ctx.restore();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// ---------------- частицы ----------------
export function drawParticles(ctx, parts) {
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * (p.alpha || 1);
    ctx.fillStyle = p.color;
    if (p.shape === 'spark') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.size * 1.6, -p.size * 0.35, p.size * 3.2, p.size * 0.7);
    } else if (p.shape === 'box') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------- эффект скорости ----------------
export function drawSpeedFX(ctx, vw, vh, speed01, boosting) {
  if (speed01 < 0.35 && !boosting) return;
  const n = Math.floor((speed01 - 0.3) * 40) + (boosting ? 26 : 0);
  ctx.save();
  ctx.strokeStyle = boosting ? 'rgba(140,220,255,0.55)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const y = (i * 97.3) % vh;
    const len = 40 + ((i * 53) % 90) + (boosting ? 70 : 0);
    const x = ((i * 271 + performance.now() * (0.6 + speed01)) % (vw + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(vw - x, y);
    ctx.lineTo(vw - x - len, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawVignette(ctx, vw, vh, strength = 0.35) {
  const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}
