/**
 * theme.js
 * Определяет, какая тема сейчас активна (обычная / Halloween / Christmas),
 * читая это из внешнего config.json — не хардкод в коде. Так владелец
 * игры может включать/выключать сезонные темы просто правкой одного
 * файла на хостинге, без пересборки и без того, чтобы у пользователей
 * могла "залипнуть" тема из-за не обновившегося кэша JS.
 *
 * Приоритет при конфликте (несколько тем одновременно true) задаётся
 * массивом priority в config.json. Если ничего не включено или
 * config.json не загрузился (офлайн, file:// без сервера и т.п.) —
 * используется обычная тема по умолчанию, игра не ломается.
 */
const SPRITE_FOLDERS = {
  original: 'assets/sprites/',
  halloween: 'assets/sprites-halloween/',
  christmas: 'assets/sprites-christmas/',
};

const DEFAULT_THEME_CONFIG = {
  themes: { original: true, halloween: false, christmas: false },
  priority: ['original', 'christmas', 'halloween'],
};

let ACTIVE_THEME = 'original';

function resolveTheme(config) {
  const priority = Array.isArray(config.priority) ? config.priority : DEFAULT_THEME_CONFIG.priority;
  const themes = config.themes || {};
  for (const name of priority) {
    if (themes[name] && SPRITE_FOLDERS[name]) return name;
  }
  return 'original';
}

function applyThemeBodyClass(theme) {
  document.body.classList.remove('theme-original', 'theme-halloween', 'theme-christmas');
  document.body.classList.add('theme-' + theme);
}

function currentThemeSpriteFolder() {
  return SPRITE_FOLDERS[ACTIVE_THEME] || SPRITE_FOLDERS.original;
}

/**
 * Загружает config.json и определяет активную тему. Возвращает промис,
 * который нужно дождаться перед стартом игры (главным образом — перед
 * тем, как рендерер начнёт запрашивать пути к спрайтам).
 */
async function loadTheme() {
  let config = DEFAULT_THEME_CONFIG;
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (res.ok) {
      const loaded = await res.json();
      if (loaded && loaded.themes) config = loaded;
    }
  } catch (e) {
    // Нет сети / файл недоступен (например, открыли index.html двойным
    // кликом без сервера) — остаёмся на теме по умолчанию.
  }
  ACTIVE_THEME = resolveTheme(config);
  applyThemeBodyClass(ACTIVE_THEME);
  return ACTIVE_THEME;
}
