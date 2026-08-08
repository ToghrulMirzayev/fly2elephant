/**
 * ui.js
 * Управляет счётом, двумя рекордами (обычный/лёгкий режим), лентой
 * эволюции и модальными окнами (победа / поражение / смена режима).
 * Не содержит игровой логики.
 */

/** Шутливые фразы, показываемые в окне поражения — каждый раз случайная. */
const GAME_OVER_JOKES = [
  'Муха оказалась сильнее слона 🪰💪',
  'Слон почесал затылок и ушёл домой 🐘🤷',
  'Кажется, звери устали сливаться 😅',
  'Ничего, в следующий раз точно будет слон! 🐘✨',
  'Поле было против тебя, а не ты против поля 😏',
  'Даже кузнечик допрыгал бы дальше 🦗',
  'Твои звери разбежались по домам 🏃💨',
  'Это была разминка. Теперь по-серьёзному! 🔥',
  'Муравьи снова победили систему 🐜👑',
  'Слон передаёт привет из следующей попытки 🐘👋',
  'Ой... звери не захотели дружить сегодня 🙈',
  'Поле забито под завязку, как рюкзак перед отпуском 🎒😂',
  'Не расстраивайся — даже бегемоту иногда тесно 🦛',
  'Зебра посмотрела на это и покачала головой 🦓😅',
  'Ещё чуть-чуть — и было бы величие 🐘🌟',
];

function randomGameOverJoke() {
  return GAME_OVER_JOKES[Math.floor(Math.random() * GAME_OVER_JOKES.length)];
}

/**
 * Шутливые предупреждения при переключении лёгкого/обычного режима
 * прямо во время игры — поле в этот момент обновляется, так что нужно
 * явное подтверждение. Каждый раз случайная фраза, в тему зверей.
 */
const MODE_SWITCH_JOKES = [
  'Слон уже собрал вещи и ждёт новое поле 🐘🧳 Начнём заново?',
  'Муха машет крылом на прощание старому полю 🪰👋 Обновляем?',
  'Зебра говорит: полосатая жизнь — это всегда заново 🦓 Погнали?',
  'Волк воет: "Кто менял правила посреди игры?!" 🐺🌕 Продолжаем?',
  'Бегемот моргнул — и поле уже другое 🦛😳 Готов начать сначала?',
  'Кузнечик уже прыгнул в новый режим, ты как? 🦗 Погнали?',
  'Собака радостно виляет хвостом: новая игра — это весело! 🐶 Начнём?',
  'Носорог говорит: несёмся напролом в новый режим 🦏💨 Едем?',
];

function randomModeSwitchJoke() {
  return MODE_SWITCH_JOKES[Math.floor(Math.random() * MODE_SWITCH_JOKES.length)];
}

/**
 * Подменяет эмодзи-символы внутри элемента на картинки (Twemoji), чтобы
 * они выглядели одинаково на любом устройстве, а не зависели от того,
 * есть ли на нём цветной эмодзи-шрифт. Если библиотека не загрузилась
 * (например, нет интернета), просто оставляем обычный текстовый символ —
 * не критично, страница не ломается.
 */
function applyEmoji(el) {
  if (window.twemoji && el) {
    window.twemoji.parse(el, {
      base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/',
      folder: 'svg',
      ext: '.svg',
    });
  }
}

/**
 * Подгружает библиотеку Twemoji асинхронно, в фоне — игра не ждёт её и
 * стартует сразу же. Как только (и если) библиотека загрузится, заново
 * применяет её ко всем местам, где могут быть эмодзи. Если загрузить не
 * получилось (нет интернета) — просто остаются обычные текстовые эмодзи,
 * игра при этом не тормозит и не ломается.
 */
function loadTwemojiAsync(onReady) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js';
  script.crossOrigin = 'anonymous';
  script.async = true;
  script.onload = () => onReady && onReady();
  document.head.appendChild(script);
}

class UIController {
  constructor({
    scoreEl, bestEl, trailEl, overlayEl,
    modalImg, modalTitle, modalJoke, modalText, modalBtns,
  }) {
    this.scoreEl = scoreEl;
    this.bestEl = bestEl;
    this.trailEl = trailEl;
    this.overlayEl = overlayEl;
    this.modalImg = modalImg;
    this.modalTitle = modalTitle;
    this.modalJoke = modalJoke;
    this.modalText = modalText;
    this.modalBtns = modalBtns;
    this._buildTrail();
  }

  _buildTrail() {
    this.trailEl.innerHTML = '';
    TIERS.forEach((t) => {
      const chip = document.createElement('div');
      chip.className = 'trail-chip';
      chip.id = 'trailchip-' + t.id;
      chip.title = t.name;
      const img = document.createElement('img');
      img.src = tierSpritePath(t.id);
      img.alt = t.name;
      chip.appendChild(img);
      this.trailEl.appendChild(chip);
    });
  }

  /** Перерисовывает картинки в ленте — нужно при смене темы/набора спрайтов. */
  refreshTrailImages() {
    TIERS.forEach((t) => {
      const chip = document.getElementById('trailchip-' + t.id);
      if (chip) chip.querySelector('img').src = tierSpritePath(t.id);
    });
  }

  updateTrail(maxTierReached) {
    TIERS.forEach((t) => {
      const chip = document.getElementById('trailchip-' + t.id);
      chip.classList.toggle('reached', t.id <= maxTierReached);
      chip.classList.toggle('current', t.id === maxTierReached);
    });
    const cur = document.getElementById('trailchip-' + maxTierReached);
    if (cur) cur.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  /**
   * @param {number} score текущий счёт
   * @param {number} best единый рекорд (не считает очки, набранные в
   *   лёгком режиме — см. main.js)
   */
  setScore(score, best, { bump = true } = {}) {
    this.scoreEl.textContent = score.toLocaleString('ru-RU');
    if (bump) {
      this.scoreEl.classList.add('bump');
      setTimeout(() => this.scoreEl.classList.remove('bump'), 180);
    }
    this.bestEl.textContent = best.toLocaleString('ru-RU');
  }

  hideOverlay() {
    this.overlayEl.classList.remove('show');
  }

  showWin(score, onContinue, onRestart) {
    this.modalImg.src = tierSpritePath(MAX_TIER);
    this.modalImg.style.display = '';
    this.modalTitle.textContent = 'Ура! Огромный слон!';
    this.modalJoke.textContent = '';
    this.modalText.textContent =
      'Ты прошёл весь путь от мухи до слона. Счёт: ' + score.toLocaleString('ru-RU');
    this.modalBtns.innerHTML = '';

    const btnContinue = document.createElement('button');
    btnContinue.className = 'btn-secondary';
    btnContinue.textContent = 'Играть дальше';
    btnContinue.onclick = () => { this.hideOverlay(); onContinue && onContinue(); };

    const btnRestart = document.createElement('button');
    btnRestart.className = 'btn-restart';
    btnRestart.textContent = 'Заново';
    btnRestart.onclick = () => { this.hideOverlay(); onRestart && onRestart(); };

    this.modalBtns.appendChild(btnContinue);
    this.modalBtns.appendChild(btnRestart);
    this.overlayEl.classList.add('show');
  }

  showGameOver(topTier, score, isNewBest, onClose, onRestart) {
    this.modalImg.src = tierSpritePath(topTier);
    this.modalImg.style.display = '';
    this.modalTitle.textContent = 'Игра окончена';
    this.modalJoke.textContent = randomGameOverJoke();
    applyEmoji(this.modalJoke);
    this.modalText.textContent =
      'Счёт: ' + score.toLocaleString('ru-RU') + (isNewBest ? ' — новый рекорд!' : '');
    this.modalBtns.innerHTML = '';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn-secondary';
    btnClose.textContent = 'Закрыть';
    btnClose.onclick = () => { this.hideOverlay(); onClose && onClose(); };

    const btnRestart = document.createElement('button');
    btnRestart.className = 'btn-restart';
    btnRestart.textContent = 'Заново';
    btnRestart.onclick = () => { this.hideOverlay(); onRestart && onRestart(); };

    this.modalBtns.appendChild(btnClose);
    this.modalBtns.appendChild(btnRestart);
    this.overlayEl.classList.add('show');
  }

  /**
   * Подтверждение смены режима (лёгкий/обычный) прямо во время игры —
   * поле при этом обновится, так что явно предупреждаем со случайной
   * шутливой формулировкой. onConfirm вызывается, только если игрок
   * нажал "Да, начать заново".
   */
  showModeSwitchConfirm(onConfirm, onCancel) {
    this.modalImg.style.display = 'none';
    this.modalTitle.textContent = 'Сменить режим?';
    this.modalJoke.textContent = randomModeSwitchJoke();
    applyEmoji(this.modalJoke);
    this.modalText.textContent = 'Текущее поле начнётся заново.';
    this.modalBtns.innerHTML = '';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-secondary';
    btnCancel.textContent = 'Отмена';
    btnCancel.onclick = () => { this.hideOverlay(); onCancel && onCancel(); };

    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'btn-restart';
    btnConfirm.textContent = 'Да, начать заново';
    btnConfirm.onclick = () => { this.hideOverlay(); onConfirm && onConfirm(); };

    this.modalBtns.appendChild(btnCancel);
    this.modalBtns.appendChild(btnConfirm);
    this.overlayEl.classList.add('show');
  }
}