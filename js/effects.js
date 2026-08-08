/**
 * effects.js
 * Атмосферные эффекты, привязанные к активной теме:
 *  - Christmas: лёгкий падающий снег на весь экран
 *  - Halloween: падающие тыквы на весь экран (тот же принцип, что и
 *    снег, просто другой "персонаж")
 *
 * Ничего не завязано на игровую логику — это чисто декоративный слой
 * поверх фона (pointer-events: none, не мешает нажатиям на поле).
 * Уважает prefers-reduced-motion и не активен в обычной теме.
 */

function startSnowEffect(container) {
  const prefersReducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';

    const size = 4 + Math.random() * 6;
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 10;
    const delay = -Math.random() * duration; // старт в случайной фазе, а не все разом сверху
    const drift = (Math.random() * 60 - 30).toFixed(0) + 'px';
    const opacity = 0.35 + Math.random() * 0.5;

    flake.style.width = size + 'px';
    flake.style.height = size + 'px';
    flake.style.left = left + 'vw';
    flake.style.opacity = opacity;
    flake.style.animationDuration = duration + 's';
    flake.style.animationDelay = delay + 's';
    flake.style.setProperty('--drift', drift);

    container.appendChild(flake);
  }
}

function startPumpkinEffect(container) {
  const prefersReducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const COUNT = 16;
  for (let i = 0; i < COUNT; i++) {
    const pumpkin = document.createElement('div');
    pumpkin.className = 'pumpkin';
    pumpkin.textContent = '🎃';

    const size = 18 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 11;
    const delay = -Math.random() * duration; // старт в случайной фазе
    const drift = (Math.random() * 80 - 40).toFixed(0) + 'px';
    const spin = (Math.random() * 50 - 25).toFixed(0) + 'deg';
    const opacity = 0.55 + Math.random() * 0.4;

    pumpkin.style.fontSize = size + 'px';
    pumpkin.style.left = left + 'vw';
    pumpkin.style.opacity = opacity;
    pumpkin.style.animationDuration = duration + 's';
    pumpkin.style.animationDelay = delay + 's';
    pumpkin.style.setProperty('--drift', drift);
    pumpkin.style.setProperty('--spin', spin);

    container.appendChild(pumpkin);
  }

  // На случай если Twemoji ещё не подтянулся при первом рендере —
  // достаточно подождать, applyEmoji() ещё раз вызовется из main.js
  // после его фоновой загрузки.
  if (window.applyEmoji) applyEmoji(container);
}

/**
 * Запускает эффекты, соответствующие уже определённой теме (см. theme.js).
 * Вызывать один раз при старте игры, после того как ACTIVE_THEME известна.
 */
function startThemeEffects() {
  if (ACTIVE_THEME === 'christmas') {
    const snowLayer = document.getElementById('snowLayer');
    if (snowLayer) startSnowEffect(snowLayer);
  } else if (ACTIVE_THEME === 'halloween') {
    const pumpkinLayer = document.getElementById('pumpkinLayer');
    if (pumpkinLayer) startPumpkinEffect(pumpkinLayer);
  }
}