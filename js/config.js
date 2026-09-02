// ============================================================
//  КУГО-СТАНТ — глобальный конфиг: физика, самокаты, тюнинг
// ============================================================

export const CFG = {
  // --- мир / физика ---
  GRAVITY: 1900,           // px/s^2 (~10 м/с^2 в масштабе мира)
  STEP: 1 / 120,           // физический шаг
  SUBSTEPS: 2,             // подшагов на кадр
  PX_PER_M: 130,           // пикселей в метре (для спидометра и дистанции)
  FORCE_SCALE: 30,         // перевод «ньютон-подобных» характеристик в px-единицы
  GRIP_MULT: 0.8,          // коэффициент сцепления от нормальной нагрузки
  AIR_DRAG: 0.0007,        // квадратичное сопротивление воздуха
  ROLL_DRAG: 0.35,         // качение
  RESTITUTION: 0.12,

  // --- вращение шасси ---
  TAKEOFF_POP: 1.6,        // импульс «подброса назад» при отрыве от трамплина
  AIR_SPIN: 14,            // рад/с^2 от наклона райдера в воздухе
  GROUND_SPIN: 3.6,        // рад/с^2 от наклона на земле (вилли/стоппи)
  LEVEL_K: 12,             // жёсткость автовыравнивания по уклону
  LEVEL_C: 5.0,            // демпфер вращения

  // --- камера ---
  CAM_LERP: 4.2,
  CAM_LOOKAHEAD: 0.34,
  CAM_ZOOM: 1.0,

  // --- комбо / трюки ---
  COMBO_HOLD: 3.6,         // сек, пока горит комбо после приземления
  MIN_AIR_FOR_TRICK: 0.28,
  BOOST_MAX: 100,
  BOOST_DRAIN: 46,         // в секунду
  BOOST_GAIN_PER_100: 9,   // 9% буста за каждые 100 очков трюка
};

// ---------------- САМОКАТЫ (электросамокаты и электропитбайки Kugoo) ----------------
// mass — кг (в физике масштабируется), power — Н тяги, grip — сцепление,
// batt — ёмкость (влияет на длительность буста), susp — ход подвески, dur — прочность
export const SCOOTERS = [
  {
    id: 'kids', name: 'Kugoo Mini Kid', type: 'scooter', style: 'city', price: 0,
    tag: 'Детский. Прощает всё, но не летает.',
    mass: 58, power: 950, maxSpeed: 32, grip: 1.05, batt: 40, susp: 12, dur: 60,
    color: '#3fae5a', accent: '#eafff0', deck: 0.9, wheelR: 32, unlock: 0,
  },
  {
    id: 'wish01', name: 'Kugoo Wish 01', type: 'pitbike', style: 'dirt', price: 3500,
    tag: 'Мини-эндуро с оранжевой вилкой. Первый вкус земли.',
    mass: 96, power: 1500, maxSpeed: 50, grip: 1.2, batt: 84, susp: 34, dur: 90,
    color: '#ff7a1a', accent: '#1b1d20', deck: 0.95, wheelR: 56, unlock: 0,
  },
  {
    id: 'm2', name: 'Kugoo M2 Pro', type: 'scooter', style: 'city', price: 4500,
    tag: 'Народный курьерский. Легенда дворов.',
    mass: 72, power: 1350, maxSpeed: 46, grip: 1.0, batt: 60, susp: 14, dur: 70,
    color: '#e8442f', accent: '#ffd9d2', deck: 1.0, wheelR: 36, unlock: 0,
  },
  {
    id: 's3', name: 'Kugoo S3 Jilong', type: 'scooter', style: 'city', price: 9000,
    tag: 'Классика доставки. Жёсткий, злой.',
    mass: 80, power: 1750, maxSpeed: 55, grip: 1.02, batt: 70, susp: 15, dur: 80,
    color: '#2f6ee8', accent: '#dbe8ff', deck: 1.05, wheelR: 38, unlock: 12000,
  },
  {
    id: 'm4pro', name: 'Kugoo M4 Pro', type: 'scooter', style: 'offroad', price: 14000,
    tag: 'Городской внедорожник: пружины и зубастая резина.',
    mass: 100, power: 2200, maxSpeed: 62, grip: 1.1, batt: 100, susp: 22, dur: 100,
    color: '#20262e', accent: '#ff7a1a', deck: 1.1, wheelR: 44, unlock: 24000,
  },
  {
    id: 'kirin', name: 'Kugoo Kirin X2', type: 'scooter', style: 'offroad', price: 18000,
    tag: 'Полный привод, дикий разгон, диски-тормоза.',
    mass: 96, power: 2600, maxSpeed: 68, grip: 1.12, batt: 95, susp: 20, dur: 95,
    color: '#2b3138', accent: '#ff8c1a', deck: 1.1, wheelR: 46, unlock: 30000,
  },
  {
    id: 'gbooster', name: 'Kugoo G-Booster', type: 'scooter', style: 'offroad', price: 34000,
    tag: 'Двухмоторный монстр. 60 км/ч в горку.',
    mass: 128, power: 3600, maxSpeed: 80, grip: 1.18, batt: 130, susp: 26, dur: 115,
    color: '#23282e', accent: '#00e5a0', deck: 1.2, wheelR: 50, unlock: 70000,
  },
  {
    id: 'pitbike', name: 'Kugoo Pit Bike V5', type: 'pitbike', style: 'dirt', price: 52000,
    tag: 'Электропитбайк. Рвал колхозников на районе.',
    mass: 150, power: 4800, maxSpeed: 92, grip: 1.25, batt: 160, susp: 40, dur: 150,
    color: '#00d5a3', accent: '#111', deck: 1.0, wheelR: 66, unlock: 130000,
  },
];

// ---------------- ТЮНИНГ (влияет на физику) ----------------
export const UPGRADES = {
  motor: {
    name: 'Мотор', icon: '⚡', max: 4, costs: [1200, 3400, 8200, 19000],
    desc: ['Контроллер 20A', 'Контроллер 35A', 'Обмотка 48V', 'Два мотора'],
    apply: (s, lvl) => { s.power *= 1 + 0.16 * lvl; s.maxSpeed *= 1 + 0.07 * lvl; },
    stat: (lvl) => `тяга +${lvl * 16}%`,
  },
  battery: {
    name: 'Батарея', icon: '🔋', max: 4, costs: [900, 2600, 6400, 15000],
    desc: ['Li-ion 10Ah', 'Li-ion 15Ah', '18650 x40', 'Графеновая'],
    apply: (s, lvl) => { s.batt *= 1 + 0.3 * lvl; s.mass *= 1 + 0.03 * lvl; },
    stat: (lvl) => `буст +${lvl * 30}%`,
  },
  wheels: {
    name: 'Колёса', icon: '🛞', max: 4, costs: [1100, 3000, 7400, 17500],
    desc: ['Слик', 'Полуслик', 'Зубастая резина', 'Мото-покрышки'],
    apply: (s, lvl) => { s.grip *= 1 + 0.13 * lvl; s.wheelR += 2.5 * lvl; },
    stat: (lvl) => `сцепление +${lvl * 13}%`,
  },
  suspension: {
    name: 'Подвеска', icon: '🌀', max: 4, costs: [800, 2300, 5600, 13000],
    desc: ['Пружины жёстче', 'Масляные аморты', 'Воздушка', 'Полный газ-масло'],
    apply: (s, lvl) => { s.susp += 4 * lvl; s.dur += 8 * lvl; },
    stat: (lvl) => `ход +${4 * lvl}px`,
  },
  frame: {
    name: 'Рама', icon: '🛠', max: 4, costs: [1000, 2800, 6800, 16000],
    desc: ['Усиленный узел', 'Фрезеровка', 'Титан', 'Карбон-монокок'],
    apply: (s, lvl) => { s.dur += 20 * lvl; s.mass *= 1 - 0.02 * lvl; },
    stat: (lvl) => `прочность +${20 * lvl}`,
  },
};

// ---------------- ВНЕШНИЙ ТЮНИНГ (косметика) ----------------
export const COSMETICS = {
  paint: {
    name: 'Покраска', prices: [0, 800, 1500, 2600, 4000, 6500],
    options: [
      { id: 'stock', name: 'Заводская', color: null },
      { id: 'green', name: 'Колхоз-зелёный', color: '#5cbf2a' },
      { id: 'cyan', name: 'Кислота', color: '#00e5ff' },
      { id: 'pink', name: 'Пончик', color: '#ff4fa3' },
      { id: 'gold', name: 'Цыганское золото', color: '#ffc400' },
      { id: 'matte', name: 'Матовый графит', color: '#3a3f45' },
    ],
  },
  glow: {
    name: 'Подсветка', prices: [0, 1200, 2400, 4200],
    options: [
      { id: 'none', name: 'Нет', color: null },
      { id: 'blue', name: 'Синий неон', color: '#38b6ff' },
      { id: 'purple', name: 'Ультрафиолет', color: '#b14cff' },
      { id: 'red', name: 'Красный закат', color: '#ff3b3b' },
    ],
  },
  wheelskin: {
    name: 'Диски', prices: [0, 900, 2000],
    options: [
      { id: 'stock', name: 'Штатные' },
      { id: 'spokes', name: 'Спицы' },
      { id: 'turbo', name: 'Турбо-диски' },
    ],
  },
  rider: {
    name: 'Экипировка курьера', prices: [0, 1000, 2500, 5000],
    options: [
      { id: 'hoodie', name: 'Худи + кепка', box: '#4a7dd6' },
      { id: 'vest', name: 'Жилет доставки', box: '#ffcc00' },
      { id: 'yando', name: 'Красный короб', box: '#ff2e2e' },
      { id: 'gold', name: 'Золотой короб', box: '#ffcf3d' },
    ],
  },
  wing: {
    name: 'Обвес', prices: [0, 2000, 4500],
    options: [
      { id: 'none', name: 'Без обвеса' },
      { id: 'spoiler', name: 'Антикрыло' },
      { id: 'flag', name: 'Флаг района' },
    ],
  },
};

// ---------------- ТРЮКИ ----------------
export const TRICKS = {
  backflip: { name: 'БЭКФЛИП', value: 1200, icon: '🔄' },
  frontflip: { name: 'ФРОНТФЛИП', value: 1400, icon: '🔃' },
  wheelie: { name: 'ВИЛЛИ', value: 120, icon: '🛴' },   // за секунду
  stoppie: { name: 'СТОППИ', value: 140, icon: '⛔' },
  air: { name: 'ЭЙР', value: 90, icon: '🕊' },          // за 0.1 сек в воздухе
  nohands: { name: 'БЕЗ РУК', value: 260, icon: '🙌' },
  superman: { name: 'СУПЕРМЕН', value: 420, icon: '🦸' },
  scrub: { name: 'СКРАБ', value: 320, icon: '↗️' },
  bigair: { name: 'БИГ-ЭЙР', value: 500, icon: '🚀' },
  nearmiss: { name: 'ВПРОТИРКУ', value: 350, icon: '🚗' },
  crate: { name: 'ЯЩИК В ЩЕПКИ', value: 80, icon: '📦' },
  loop: { name: 'МЁРТВАЯ ПЕТЛЯ', value: 2000, icon: '⭕' },
  delivery: { name: 'ДОСТАВКА!', value: 600, icon: '📮' },
};
