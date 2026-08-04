/**
 * main.js
 * Точка входа: создаёт движок, рендерер, интерфейс и ввод,
 * и связывает их вместе. Здесь же — основной игровой цикл хода.
 */
(function () {
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

      refreshHud(result.merges.length > 0);

      if (engine.won && !wonCelebrated) {
        wonCelebrated = true;
        setTimeout(() => {
          audio.playWin();
          ui.showWin(engine.score, () => {}, restartGame);
        }, 420);
      }

      setTimeout(() => {
        // 3. Новая плитка появляется на свободной клетке.
        if (result.spawned) {
          renderer.createTile(result.spawned.tile, result.spawned.r, result.spawned.c, { animateSpawn: true });
        }
        animating = false;

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
  }
  soundBtn.addEventListener('click', () => {
    audio.toggle();
    refreshSoundIcon();
  });
  refreshSoundIcon();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderer.relayout(engine.board), 120);
  });

  // Первичная отрисовка
  refreshHud(false);
  renderFullBoard(true);
})();
