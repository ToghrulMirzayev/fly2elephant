/**
 * main.js
 * Точка входа: создаёт движок, рендерер, интерфейс и ввод,
 * и связывает их вместе. Здесь же — основной игровой цикл хода.
 */
(function () {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();

    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }

    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }
  }
  const SIZE = 4;
  const PAD = 10;
  const GAP = 10;
  const SLIDE_MS = 150;
  const MERGE_MS = 90;

  const boardEl = document.getElementById('board');
  const cellGridEl = document.getElementById('cellGrid');
  const tilesLayerEl = document.getElementById('tilesLayer');

  const engine = new GameEngine(SIZE, MAX_TIER);
  const renderer = new BoardRenderer(boardEl, cellGridEl, tilesLayerEl, SIZE, PAD, GAP);
  const audio = new AudioController();
  const ui = new UIController({
    scoreEl: document.getElementById('score'),
    bestEl: document.getElementById('best'),
    trailEl: document.getElementById('trail'),
    overlayEl: document.getElementById('overlay'),
    modalImg: document.getElementById('modalImg'),
    modalTitle: document.getElementById('modalTitle'),
    modalJoke: document.getElementById('modalJoke'),
    modalText: document.getElementById('modalText'),
    modalBtns: document.getElementById('modalBtns'),
  });

  let best = Storage.getBest();
  let animating = false;
  let wonCelebrated = false;

  function renderFullBoard(animateSpawn) {
    renderer.clear();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const tile = engine.board[r][c];
        if (tile) renderer.createTile(tile, r, c, { animateSpawn });
      }
    }
  }

  function refreshHud(bump) {
    if (engine.score > best) {
      best = engine.score;
      Storage.setBest(best);
    }
    ui.setScore(engine.score, best, { bump });
    ui.updateTrail(engine.maxTierReached);
  }

  function doMove(dir) {
    if (animating) return;
    const result = engine.move(dir);
    if (!result.moved) return;

    animating = true;

    if (result.merges.length === 0) {
      audio.playSlide();
    }

    // 1. Плитки скользят к новым позициям (включая "поглощаемые" — они едут
    //    в ту же клетку, что и плитка, с которой сливаются).
    Object.keys(result.oldPos).forEach((id) => {
      const target = result.targetPos[id];
      if (target) renderer.moveTileTo(id, target.r, target.c);
    });

    setTimeout(() => {
      // 2. Слияния: убираем "поглощённую" плитку, апгрейдим выжившую, частицы.
      result.merges.forEach((m) => {
        renderer.vanishTile(m.consumedId);
        renderer.upgradeTile(m.survivorId, m.newTier);
        const pos = result.targetPos[m.survivorId];
        renderer.spawnParticles(pos.r, pos.c, tierBand(m.newTier));
        audio.playMerge(m.newTier);
      });

      // 2б. "Осиротевшие" мелкие звери (для которых больше не будет пары)
      // сами подрастают до текущего порога спавна — тихо, без очков и
      // без звука слияния, лишь с лёгким визуальным эффектом.
      result.graduated.forEach((g) => {
        renderer.upgradeTile(g.id, g.newTier);
        renderer.spawnParticles(g.r, g.c, tierBand(g.newTier));
        audio.playSpawn();
      });

      refreshHud(result.merges.length > 0);

      if (engine.won && !wonCelebrated) {
        wonCelebrated = true;
        setTimeout(() => {
          audio.playWin();
          ui.showWin(engine.score, () => {}, restartGame);
        }, 420);
      }

      setTimeout(() => {
        // 3. Новая плитка появляется на свободной клетке — если только она
        //    сама не оказалась той самой мелочью, которую в этот же ход
        //    уберёт детский режим (тогда просто не создаём её на экране).
        const spawnedId = result.spawned && result.spawned.tile.id;
        const spawnedWasCleared = result.cleared.some((cl) => cl.id === spawnedId);
        if (result.spawned && !spawnedWasCleared) {
          renderer.createTile(result.spawned.tile, result.spawned.r, result.spawned.c, { animateSpawn: true });
        }
        animating = false;

        // 3б. Детский режим: если ходов больше не было, вместо поражения
        // с поля исчезают самые маленькие животные, освобождая место.
        if (result.cleared.length > 0) {
          setTimeout(() => {
            result.cleared.forEach((cl) => {
              if (cl.id === spawnedId) return;
              renderer.vanishTile(cl.id);
              renderer.spawnParticles(cl.r, cl.c, tierBand(cl.tier));
            });
            audio.playSlide();
          }, 180);
        }

        if (result.over) {
          setTimeout(() => {
            audio.playGameOver();
            const isNewBest = engine.score >= best;
            ui.showGameOver(engine.maxTierReached, engine.score, isNewBest, () => {}, restartGame);
          }, 260);
        }
      }, MERGE_MS);
    }, SLIDE_MS);
  }

  function restartGame() {
    engine.reset();
    wonCelebrated = false;
    renderFullBoard(false);
    refreshHud(false);
  }

  new InputController(boardEl, doMove);
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  const soundBtn = document.getElementById('soundBtn');
  function refreshSoundIcon() {
    soundBtn.textContent = audio.enabled ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', audio.enabled ? 'Выключить звук' : 'Включить звук');
    applyEmoji(soundBtn);
  }
  soundBtn.addEventListener('click', () => {
    audio.toggle();
    refreshSoundIcon();
  });
  refreshSoundIcon();

  // Детский режим: сохранённая настройка применяется сразу к движку,
  // переключатель меняет её на лету и запоминает выбор.
  const kidsCheckbox = document.getElementById('kidsCheckbox');
  const initialKidsMode = Storage.getKidsMode();
  kidsCheckbox.checked = initialKidsMode;
  engine.setKidsMode(initialKidsMode);
  kidsCheckbox.addEventListener('change', () => {
    engine.setKidsMode(kidsCheckbox.checked);
    Storage.setKidsMode(kidsCheckbox.checked);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderer.relayout(engine.board), 120);
  });

  // Первичная отрисовка
  refreshHud(false);
  renderFullBoard(true);
  applyEmoji(document.querySelector('header'));
  applyEmoji(document.getElementById('kidsToggle'));

  // Twemoji грузится в фоне и не блокирует старт игры; когда будет готова —
  // подменяет эмодзи там, где они уже на странице (заголовок, кнопка звука).
  loadTwemojiAsync(() => {
    applyEmoji(document.querySelector('header'));
    applyEmoji(soundBtn);
    applyEmoji(document.getElementById('kidsToggle'));
  });
})();