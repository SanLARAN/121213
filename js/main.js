// ============================================================
//  Точка входа: инициализация, главный цикл, реакция на состояния
// ============================================================
import { Game } from './game.js';
import { UI } from './ui.js';
import { loadSave, persist } from './save.js';
import { sfx } from './utils.js';

const save = loadSave();
if (!save.unlocked) save.unlocked = 1;

const canvas = document.getElementById('game');
const game = new Game(canvas, null, save);
const ui = new UI(game, save);
game.ui = ui;

game.onStateChange = (st) => {
  if (st === 'menu') ui.showScreen('menu');
  else if (st === 'playing') ui.showScreen('none');
  else if (st === 'paused') ui.showScreen('pause');
  else if (st === 'crashMenu') ui.showScreen('crash');
  else if (st === 'finished') ui.showScreen('finish');
  persist(save);
};

// ресайз
function onResize() {
  game.resize();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
onResize();

// главный цикл
let saveTick = 0;
function loop(ts) {
  game.frame(ts);
  ui.updateHUD();
  saveTick++;
  if (saveTick % 300 === 0) persist(save);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// первый звук по первому касанию
const kick = () => { sfx.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
window.addEventListener('pointerdown', kick);
window.addEventListener('keydown', kick);

// не даём прокручивать страницу стрелками/свайпом
document.addEventListener('touchmove', (e) => {
  if (e.target.closest && e.target.closest('.screen')) return;
  e.preventDefault();
}, { passive: false });

window.addEventListener('beforeunload', () => persist(save));

// отладка в консоли
window.__KUGO = { game, ui, save };
