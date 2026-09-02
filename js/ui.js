// ============================================================
//  Интерфейс: меню, трассы, гараж, HUD, тосты, тач-кнопки
// ============================================================
import { SCOOTERS, UPGRADES, COSMETICS, CFG } from './config.js';
import { LEVELS, levelMeters } from './terrain.js';
import { Scooter } from './vehicle.js';
import { makeSpec } from './game.js';
import * as R from './render.js';
import { clamp, fmtMoney, sfx } from './utils.js';
import { persist } from './save.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export class UI {
  constructor(game, save) {
    this.game = game;
    this.save = save;
    this.el = {
      hud: $('#hud'), toasts: $('#toasts'), touch: $('#touch'),
      hSpeed: $('#hSpeed'), hBatt: $('#hBatt'), hBoost: $('#hBoost'),
      hCombo: $('#hCombo'), comboVal: $('#comboVal'), comboMulti: $('#comboMulti'),
      hMoney: $('#hMoney'), hParcels: $('#hParcels'), hDist: $('#hDist'),
      hCoins: $('#hCoins'), hPose: $('#hPose'),
      progressBar: $('#progressBar'),
      mMoney: $('#mMoney'), gMoney: $('#gMoney'),
      menuFleet: $('#menuFleet'), levelGrid: $('#levelGrid'),
      garageFleet: $('#garageFleet'), partsList: $('#partsList'), styleList: $('#styleList'),
      crashReason: $('#crashReason'), crashStats: $('#crashStats'),
      finMoney: $('#finMoney'), finStats: $('#finStats'),
    };
    this.current = 'menu';
    this.prevScreen = 'menu';
    this.selectedLevel = LEVELS[0].id;
    this.tab = 'fleet';
    this.bind();
    this.showScreen('menu');
  }

  // ---------------- экраны ----------------
  showScreen(name) {
    this.current = name;
    $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 'scr-' + name));
    const inGame = ['pause', 'crash', 'finish'].includes(name);
    this.el.hud.classList.toggle('on', name === 'none' || inGame);
    this.el.touch.classList.toggle('on', name === 'none' && this.touchMode);
    if (name === 'menu') this.renderMenu();
    if (name === 'levels') this.renderLevels();
    if (name === 'garage') this.renderGarage();
    if (name === 'crash') this.renderCrash();
    if (name === 'finish') this.renderFinish();
  }
  hideAll() { this.showScreen('none'); }

  bind() {
    const g = this.game;
    // навигация
    $('#btnPlay').onclick = () => { sfx.resume(); this.startSelected(); };
    $('#btnLevels').onclick = () => { sfx.ui(); this.prevScreen = 'menu'; this.showScreen('levels'); };
    $('#btnGarage').onclick = () => { sfx.ui(); this.prevScreen = 'menu'; this.showScreen('garage'); };
    $('#btnHelp').onclick = () => { sfx.ui(); this.prevScreen = 'menu'; this.showScreen('help'); };
    $('#btnSound').onclick = (e) => {
      this.save.muted = !this.save.muted;
      sfx.setMuted(this.save.muted);
      e.currentTarget.textContent = this.save.muted ? '🔇 Звук выкл' : '🔊 Звук';
      persist(this.save);
    };
    $('#btnSound').textContent = this.save.muted ? '🔇 Звук выкл' : '🔊 Звук';
    sfx.setMuted(this.save.muted);

    $$('[data-back]').forEach((b) => { b.onclick = () => { sfx.ui(); this.showScreen(this.prevScreen || 'menu'); }; });

    // табы гаража
    $$('.tab').forEach((t) => {
      t.onclick = () => {
        $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
        this.tab = t.dataset.tab;
        $('#tab-fleet').style.display = this.tab === 'fleet' ? '' : 'none';
        $('#tab-parts').style.display = this.tab === 'parts' ? '' : 'none';
        $('#tab-style').style.display = this.tab === 'style' ? '' : 'none';
        sfx.ui();
        this.renderGarage();
      };
    });

    // игровые кнопки
    $('#btnPause').onclick = () => { g.togglePause(); };
    $('#btnResume').onclick = () => { sfx.ui(); g.togglePause(); this.showScreen('none'); };
    $('#btnRestartCp').onclick = () => { sfx.ui(); g.restart(true); this.showScreen('none'); };
    $('#btnRestartAll').onclick = () => { sfx.ui(); g.restart(false); this.showScreen('none'); };
    $('#btnToMenu').onclick = () => { sfx.ui(); g.toMenu(); };
    $('#btnCrashCp').onclick = () => { sfx.ui(); g.restart(true); this.showScreen('none'); };
    $('#btnCrashRestart').onclick = () => { sfx.ui(); g.restart(false); this.showScreen('none'); };
    $('#btnCrashMenu').onclick = () => { sfx.ui(); g.toMenu(); };
    $('#btnAgain').onclick = () => { sfx.ui(); g.restart(false); this.showScreen('none'); };
    $('#btnFinMenu').onclick = () => { sfx.ui(); g.toMenu(); };
    $('#btnFinGarage').onclick = () => { sfx.ui(); g.toMenu(); this.prevScreen = 'menu'; this.showScreen('garage'); };
    $('#btnNextLevel').onclick = () => {
      sfx.ui();
      const i = LEVELS.findIndex((l) => l.id === g.level.def.id);
      const next = LEVELS[Math.min(LEVELS.length - 1, i + 1)];
      this.selectedLevel = next.id;
      g.startLevel(next.id);
      this.showScreen('none');
    };

    // тач
    this.touchMode = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const bindBtn = (id, key) => {
      const el = $(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); this.game.touch[key] = true; el.classList.add('down'); sfx.resume(); };
      const off = (e) => { e.preventDefault(); this.game.touch[key] = false; el.classList.remove('down'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    bindBtn('#t-gas', 'gas');
    bindBtn('#t-back', 'back');
    bindBtn('#t-leanB', 'leanBack');
    bindBtn('#t-leanF', 'leanFwd');
    bindBtn('#t-boost', 'boost');
    $('#t-pose').addEventListener('pointerdown', (e) => { e.preventDefault(); this.game.cyclePose(); });

    // клик по канвасу в игре — снять паузу/звук
    $('#game').addEventListener('pointerdown', () => sfx.resume());
  }

  startSelected() {
    const idx = LEVELS.findIndex((l) => l.id === this.selectedLevel);
    const allowed = Math.max(1, this.save.unlocked || 1);
    const def = LEVELS[clamp(idx < 0 ? 0 : idx, 0, allowed - 1)] || LEVELS[0];
    this.selectedLevel = def.id;
    this.game.startLevel(def.id);
    this.showScreen('none');
  }

  // ---------------- меню ----------------
  renderMenu() {
    this.el.mMoney.textContent = fmtMoney(this.save.money);
    const owned = SCOOTERS.filter((s) => this.save.owned.includes(s.id));
    this.el.menuFleet.innerHTML = '';
    owned.forEach((s) => this.el.menuFleet.appendChild(this.scooterCard(s, 'menu')));
    // по умолчанию — самая дальняя открытая трасса
    const allowed = Math.max(1, this.save.unlocked || 1);
    const nextIdx = clamp(allowed - 1, 0, LEVELS.length - 1);
    if (!this.save.levelsDone[this.selectedLevel]) this.selectedLevel = LEVELS[nextIdx].id;
  }

  scooterCard(s, mode) {
    const el = document.createElement('div');
    const owned = this.save.owned.includes(s.id);
    const up = (this.save.upgrades && this.save.upgrades[s.id]) || {};
    const upTotal = Object.values(up).reduce((a, b) => a + b, 0);
    el.className = 'card' + (owned ? ' owned' : ' locked') + (this.save.current === s.id ? ' active' : '');
    el.innerHTML = `
      ${owned ? `<div class="badge">${this.save.current === s.id ? 'ЕДЕШЬ' : 'В ПАРКЕ'}</div>` : `<div class="badge lock">НУЖНО ${fmtMoney(s.unlock)} ₽ ПРОБЕГА</div>`}
      <h3>${s.name}</h3>
      <div class="tag">${s.tag}</div>
      <canvas width="560" height="216"></canvas>
      <div class="stats"></div>
      <div class="row">
        ${owned
          ? `<button class="btn ${this.save.current === s.id ? 'ghost' : 'primary'}" data-act="select" ${this.save.current === s.id ? 'disabled' : ''}>${this.save.current === s.id ? 'Выбран' : 'Сесть'}</button>`
          : `<button class="btn gold" data-act="buy">Купить за ${fmtMoney(s.price)} ₽</button>`}
        ${owned ? `<span class="stat" style="align-self:center">Тюнинга: <b style="display:inline;height:auto;background:none">${upTotal}</b> ур.</span>` : ''}
      </div>`;
    const stats = el.querySelector('.stats');
    const { spec } = makeSpec(s.id, this.save);
    statBar(stats, 'Тяга', spec.power / 5200);
    statBar(stats, 'Максималка', spec.maxSpeed / 100);
    statBar(stats, 'Сцепление', (spec.grip - 0.9) / 0.6);
    statBar(stats, 'Батарея', spec.batt / 220);
    statBar(stats, 'Подвеска', spec.susp / 60);
    statBar(stats, 'Прочность', spec.dur / 250);

    const cv = el.querySelector('canvas');
    drawPreview(cv, this.save.current === s.id ? makeSpec(s.id, this.save) : { spec: { ...s }, cosmetics: (this.save.cosmetics && this.save.cosmetics[s.id]) || {} });

    const buy = el.querySelector('[data-act="buy"]');
    if (buy) buy.onclick = () => this.buyScooter(s);
    const sel = el.querySelector('[data-act="select"]');
    if (sel) sel.onclick = () => {
      this.save.current = s.id;
      persist(this.save);
      sfx.ui();
      this.renderMenu(); this.renderGarage();
    };
    return el;
  }

  buyScooter(s) {
    if (this.save.money < s.price) { this.showToast('Не хватает ' + fmtMoney(s.price - this.save.money) + ' ₽', 0); sfx.crash(); return; }
    this.save.money -= s.price;
    this.save.owned.push(s.id);
    this.save.current = s.id;
    persist(this.save);
    sfx.money();
    this.showToast('🛴 ' + s.name + ' в парке!', 0);
    this.renderMenu(); this.renderGarage();
  }

  // ---------------- трассы ----------------
  renderLevels() {
    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    const allowed = Math.max(1, this.save.unlocked || 1);
    LEVELS.forEach((l, i) => {
      const open = i < allowed;
      const best = this.save.best[l.id];
      const el = document.createElement('div');
      el.className = 'card level-card' + (open ? '' : ' locked');
      el.innerHTML = `
        <div class="thumb" style="background:linear-gradient(160deg, ${l.tint}, #1b2230)">
          <div class="num">ТРАССA ${i + 1}</div>
          ${this.save.levelsDone[l.id] ? '<div class="done">ПРОЙДЕНО</div>' : ''}
        </div>
        <h3>${l.name}</h3>
        <div class="tag">${l.place}<br>${l.goal}</div>
        <div class="best">${levelMeters(l)} м · награда ${fmtMoney(l.reward)} ₽${best ? ` · рекорд ${fmtMoney(best.money)} ₽ / ${best.flips} флипов` : ''}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn ${open ? 'primary' : 'ghost'}" ${open ? '' : 'disabled'}>${open ? '▶ Ехать' : '🔒 Закрыто'}</button>
        </div>`;
      if (open) {
        el.querySelector('button').onclick = () => {
          sfx.resume();
          this.selectedLevel = l.id;
          this.game.startLevel(l.id);
          this.showScreen('none');
        };
      }
      grid.appendChild(el);
    });
  }

  // ---------------- гараж ----------------
  renderGarage() {
    if (!this.el.gMoney) return;
    this.el.gMoney.textContent = fmtMoney(this.save.money);
    this.el.garageFleet.innerHTML = '';
    SCOOTERS.forEach((s) => this.el.garageFleet.appendChild(this.scooterCard(s, 'garage')));
    this.renderParts();
    this.renderStyle();
  }

  renderParts() {
    const box = this.el.partsList;
    if (!box) return;
    const id = this.save.current;
    const up = this.save.upgrades[id] || (this.save.upgrades[id] = {});
    box.innerHTML = '';
    for (const key in UPGRADES) {
      const u = UPGRADES[key];
      const lvl = up[key] || 0;
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : u.costs[lvl];
      const el = document.createElement('div');
      el.className = 'upg';
      el.innerHTML = `
        <div class="ic">${u.icon}</div>
        <div class="info">
          <b>${u.name} <span style="color:var(--muted);font-weight:700">· ур. ${lvl}/${u.max}</span></b>
          <span>${maxed ? 'Максимум: ' + u.desc[u.max - 1] : 'Следующее: ' + u.desc[lvl] + ' — ' + u.stat(lvl + 1)}</span>
          <div class="pips">${Array.from({ length: u.max }, (_, i) => `<div class="pip ${i < lvl ? 'on' : ''}"></div>`).join('')}</div>
        </div>
        <button class="btn ${maxed ? 'ghost' : 'gold'}" ${maxed || this.save.money < cost ? 'disabled' : ''}>
          ${maxed ? 'МАКС' : fmtMoney(cost) + ' ₽'}
        </button>`;
      el.querySelector('button').onclick = () => {
        if (maxed || this.save.money < cost) return;
        this.save.money -= cost;
        up[key] = lvl + 1;
        persist(this.save);
        sfx.money();
        this.renderGarage();
      };
      box.appendChild(el);
    }
    const { spec } = makeSpec(id, this.save);
    const sum = document.createElement('div');
    sum.className = 'card';
    sum.style.marginTop = '6px';
    sum.innerHTML = `<h3>Итоговые характеристики</h3>
      <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))"></div>`;
    const st = sum.querySelector('.stats');
    statBar(st, 'Тяга, Н', spec.power / 5200, Math.round(spec.power));
    statBar(st, 'Макс. скорость', spec.maxSpeed / 100, Math.round(spec.maxSpeed) + ' км/ч');
    statBar(st, 'Сцепление', (spec.grip - 0.9) / 0.6, spec.grip.toFixed(2));
    statBar(st, 'Батарея', spec.batt / 220, Math.round(spec.batt) + ' у.е.');
    statBar(st, 'Ход подвески', spec.susp / 60, Math.round(spec.susp) + ' px');
    statBar(st, 'Прочность', spec.dur / 250, Math.round(spec.dur));
    box.appendChild(sum);
  }

  renderStyle() {
    const box = this.el.styleList;
    if (!box) return;
    const id = this.save.current;
    const cos = this.save.cosmetics[id] || (this.save.cosmetics[id] = {});
    box.innerHTML = '';
    for (const key in COSMETICS) {
      const c = COSMETICS[key];
      const owned = cos[key + '_owned'] || [0];
      const cur = cos[key] ? cos[key].id : c.options[0].id;
      const el = document.createElement('div');
      el.className = 'upg';
      el.style.flexWrap = 'wrap';
      el.innerHTML = `
        <div class="info" style="flex:1 1 100%"><b>${c.name}</b></div>
        <div class="opts" style="flex:1 1 100%"></div>`;
      const opts = el.querySelector('.opts');
      c.options.forEach((o, i) => {
        const price = c.prices[i] || 0;
        const isOwned = owned.includes(i);
        const b = document.createElement('div');
        b.className = 'opt' + (cur === o.id ? ' on' : '');
        b.innerHTML = `${o.color ? `<span class="sw" style="background:${o.color}"></span>` : ''}${o.name}${!isOwned ? ` <span class="p">${price ? fmtMoney(price) + ' ₽' : ''}</span>` : ''}`;
        b.onclick = () => {
          if (!isOwned) {
            if (this.save.money < price) { this.showToast('Не хватает ' + fmtMoney(price - this.save.money) + ' ₽', 0); sfx.crash(); return; }
            this.save.money -= price;
            owned.push(i);
            cos[key + '_owned'] = owned;
            sfx.money();
          } else sfx.ui();
          cos[key] = o;
          persist(this.save);
          this.renderStyle();
          this.renderGarage();
        };
        opts.appendChild(b);
      });
      box.appendChild(el);
    }
  }

  // ---------------- авария / финиш ----------------
  renderCrash() {
    const g = this.game;
    this.el.crashReason.textContent = g.crashReason || 'Самокат решил отдохнуть';
    const rs = g.runStats || {};
    this.el.crashStats.innerHTML = kv([
      ['Дистанция', Math.round(rs.distance || 0) + ' м'],
      ['Монет собрано', '🪙 ' + (rs.coins || 0)],
      ['Флипов', rs.flips || 0],
      ['Доставок', rs.deliveries || 0],
      ['Лучшее комбо', fmtMoney(rs.bestCombo || 0)],
      ['Макс. скорость', Math.round(rs.maxSpeed || 0) + ' км/ч'],
      ['Заработано за заезд', fmtMoney(rs.money || 0) + ' ₽'],
    ]);
    persist(this.save);
  }

  renderFinish() {
    const g = this.game;
    const rs = g.runStats || {};
    this.el.finMoney.textContent = fmtMoney(rs.money || 0);
    this.el.finStats.innerHTML = kv([
      ['Трасса', g.level ? g.level.def.name : '—'],
      ['Дистанция', Math.round(rs.distance || 0) + ' м'],
      ['Флипов', rs.flips || 0],
      ['Доставок', rs.deliveries || 0],
      ['Ящиков разбито', rs.crates || 0],
      ['Лучшее комбо', fmtMoney(rs.bestCombo || 0)],
      ['Дольше всех в воздухе', (rs.bestAir || 0).toFixed(2) + ' с'],
      ['Макс. скорость', Math.round(rs.maxSpeed || 0) + ' км/ч'],
    ]);
    persist(this.save);
  }

  // ---------------- HUD ----------------
  updateHUD() {
    const s = this.game.hudState();
    if (!s) return;
    this.el.hSpeed.textContent = Math.round(s.speed);
    this.el.hBatt.style.width = (s.battery * 100).toFixed(0) + '%';
    this.el.hBatt.style.background = s.battery > 0.25 ? 'linear-gradient(90deg,#00e5a0,#7dd8ff)' : 'linear-gradient(90deg,#ff5a4a,#ff9a3d)';
    this.el.hBoost.style.width = s.boost.toFixed(0) + '%';
    this.el.comboVal.textContent = fmtMoney(s.combo);
    this.el.comboMulti.textContent = 'x' + s.multi.toFixed(2).replace(/\.00$/, '');
    this.el.hCombo.style.width = clamp(s.comboTimer / CFG.COMBO_HOLD * 100, 0, 100) + '%';
    this.el.hMoney.textContent = fmtMoney(this.save.money);
    this.el.hParcels.textContent = s.parcels;
    this.el.hDist.textContent = Math.round(s.distance) + ' м';
    this.el.hCoins.textContent = '🪙 ' + s.coins;
    this.el.progressBar.querySelector('i').style.width = (s.progress * 100).toFixed(1) + '%';
    const names = { ride: 'ЕДЕМ', tuck: 'ПРИСЕЛ', nohands: 'БЕЗ РУК', superman: 'СУПЕРМЕН' };
    this.el.hPose.textContent = names[s.pose] || 'ЕДЕМ';
  }

  showToast(text, chain = 0) {
    const t = document.createElement('div');
    t.className = 'toast' + (chain === 0 ? ' small' : '');
    t.textContent = chain > 1 ? `${text}  ×${chain}` : text;
    this.el.toasts.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .35s, transform .35s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(-16px)';
      setTimeout(() => t.remove(), 380);
    }, 900);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }
}

function kv(rows) {
  return rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
}
function statBar(box, label, frac, txt = null) {
  const d = document.createElement('div');
  d.className = 'stat';
  d.innerHTML = `${label}${txt ? ' <span style="color:#cfd8e6">' + txt + '</span>' : ''}<b><i style="width:${clamp(frac, 0, 1) * 100}%"></i></b>`;
  box.appendChild(d);
}

/** Мини-превью самоката для карточек */
export function drawPreview(canvas, { spec, cosmetics }) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const sc = new Scooter({ ...spec }, 0, 0, cosmetics || {});
  const fakeWorld = { terrain: { heightAt: () => 0, isSolid: () => false, surfKeyAt: () => 'asphalt' } };
  sc.angle = -0.14;
  for (let i = 0; i < 40; i++) sc.rider.update(sc, fakeWorld, { lean: 0, pose: 'ride' }, 1 / 60);
  const scale = 0.5;
  ctx.save();
  ctx.translate(w * 0.46, h * 0.74);
  ctx.scale(scale, scale);
  ctx.translate(-sc.x, -sc.y);
  R.drawScooter(ctx, sc, 0.4);
  ctx.restore();
}
