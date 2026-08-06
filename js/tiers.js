/**
 * tiers.js
 * Справочник всех уровней животных: от мухи до огромного слона.
 * Каждый уровень описывает id (1..20), отображаемое имя и файл спрайта.
 */
const TIERS = [
  { id: 1, name: 'Муха', file: '01_fly.png' },
  { id: 2, name: 'Муравей', file: '02_ant.png' },
  { id: 3, name: 'Кузнечик', file: '03_grasshopper.png' },
  { id: 4, name: 'Мышка', file: '04_mouse.png' },
  { id: 5, name: 'Бурундук', file: '05_chipmunk.png' },
  { id: 6, name: 'Кролик', file: '06_rabbit.png' },
  { id: 7, name: 'Лиса', file: '07_fox.png' },
  { id: 8, name: 'Волк', file: '08_wolf.png' },
  { id: 9, name: 'Собака', file: '09_dog.png' },
  { id: 10, name: 'Коза', file: '10_goat.png' },
  { id: 11, name: 'Олень', file: '11_deer.png' },
  { id: 12, name: 'Кабан', file: '12_boar.png' },
  { id: 13, name: 'Зебра', file: '13_zebra.png' },
  { id: 14, name: 'Лошадь', file: '14_horse.png' },
  { id: 15, name: 'Бык', file: '15_bull.png' },
  { id: 16, name: 'Бизон', file: '16_bison.png' },
  { id: 17, name: 'Носорог', file: '17_rhino.png' },
  { id: 18, name: 'Бегемот', file: '18_hippo.png' },
  { id: 19, name: 'Молодой слон', file: '19_elephant_young.png' },
  { id: 20, name: 'Огромный слон', file: '20_elephant_king.png' },
];

const MAX_TIER = TIERS.length;
const SPRITE_BASE_PATH = 'assets/sprites/';

function tierInfo(tier) {
  return TIERS[tier - 1];
}

function tierSpritePath(tier) {
  return SPRITE_BASE_PATH + tierInfo(tier).file;
}

/** Цветовая "лига" уровня — используется для оформления плитки. */
function tierBand(tier) {
  if (tier <= 5) return 'band1';
  if (tier <= 10) return 'band2';
  if (tier <= 15) return 'band3';
  if (tier <= 19) return 'band4';
  return 'band5';
}
