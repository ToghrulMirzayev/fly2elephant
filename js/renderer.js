/**
 * renderer.js
 * Отвечает за отрисовку игрового поля: создание плиток, их движение,
 * анимацию слияния и эффект частиц. Ничего не знает о правилах игры —
 * только получает результат хода из GameEngine и показывает его.
 *
 * Важно: каждая плитка — это ДВА вложенных элемента:
 *   .tile-pos  (внешний)  — отвечает только за позицию (transform: translate)
 *                           и участвует в скольжении при ходе.
 *   .tile      (внутренний) — отвечает только за визуал (цвет, картинка,
 *                           подпись) и участвует в анимациях scale
 *                           (появление, "поп" при слиянии).
 * Раньше оба переезда (позиция и масштаб) висели на transform ОДНОГО
 * и того же элемента — CSS-анимация scale() полностью перезаписывала
 * translate(x,y), и плитка на миг "телепортировалась" в левый верхний
 * угол поля. Разделение на два элемента убирает конфликт полностью.
 */
class BoardRenderer {
  constructor(boardEl, cellGridEl, tilesLayerEl, size, pad, gap) {
    this.boardEl = boardEl;
    this.cellGridEl = cellGridEl;
    this.tilesLayerEl = tilesLayerEl;
    this.size = size;
    this.pad = pad;
    this.gap = gap;
    this.tileEls = {}; // id -> { pos: outer element, card: inner element }
    this._buildStaticGrid();
  }

  _buildStaticGrid() {
    this.cellGridEl.innerHTML = '';
    for (let i = 0; i < this.size * this.size; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      this.cellGridEl.appendChild(cell);
    }
  }

  cellSize() {
    const inner = this.boardEl.clientWidth - this.pad * 2;
    return (inner - this.gap * (this.size - 1)) / this.size;
  }

  cellPos(r, c) {
    const s = this.cellSize();
    return { x: c * (s + this.gap), y: r * (s + this.gap), s };
  }

  clear() {
    this.tilesLayerEl.innerHTML = '';
    this.tileEls = {};
  }

  createTile(tile, r, c, { animateSpawn = false } = {}) {
    const { x, y, s } = this.cellPos(r, c);

    const pos = document.createElement('div');
    pos.className = 'tile-pos';
    pos.style.width = s + 'px';
    pos.style.height = s + 'px';
    pos.style.transform = `translate(${x}px,${y}px)`;

    const card = document.createElement('div');
    card.className = 'tile ' + tierBand(tile.tier);

    const img = document.createElement('img');
    img.src = tierSpritePath(tile.tier);
    img.alt = tierInfo(tile.tier).name;
    img.draggable = false;

    const label = document.createElement('div');
    label.className = 'tname';
    label.textContent = tierInfo(tile.tier).name;

    card.appendChild(img);
    card.appendChild(label);
    pos.appendChild(card);

    if (animateSpawn) {
      card.classList.add('spawn');
      card.addEventListener('animationend', () => card.classList.remove('spawn'), { once: true });
    }

    this.tilesLayerEl.appendChild(pos);
    this.tileEls[tile.id] = { pos, card };
    return pos;
  }

  moveTileTo(id, r, c) {
    const entry = this.tileEls[id];
    if (!entry) return;
    const { x, y } = this.cellPos(r, c);
    entry.pos.style.transform = `translate(${x}px,${y}px)`;
  }

  vanishTile(id) {
    const entry = this.tileEls[id];
    if (!entry) return;
    // Масштаб/прозрачность анимируем на внутренней карточке, позиция
    // (внешний элемент) при этом не трогается и продолжает ехать в цель.
    entry.card.classList.add('vanish');
    setTimeout(() => {
      entry.pos.remove();
      delete this.tileEls[id];
    }, 130);
  }

  upgradeTile(id, newTier) {
    const entry = this.tileEls[id];
    if (!entry) return;
    const card = entry.card;
    card.className = 'tile ' + tierBand(newTier) + ' pop';
    card.querySelector('img').src = tierSpritePath(newTier);
    card.querySelector('img').alt = tierInfo(newTier).name;
    card.querySelector('.tname').textContent = tierInfo(newTier).name;
    card.addEventListener('animationend', () => card.classList.remove('pop'), { once: true });
  }

  spawnParticles(r, c, band) {
    const { x, y, s } = this.cellPos(r, c);
    const colors = {
      band1: ['#7FD9BE', '#4FB6A6'],
      band2: ['#FFB98A', '#FF8B5E'],
      band3: ['#F4954D', '#E56A3C'],
      band4: ['#C9803D', '#8A5A24'],
      band5: ['#F0A93E', '#FFE29A'],
    };
    const cols = colors[band] || colors.band1;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 5 + Math.random() * 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = cols[i % 2];
      p.style.left = x + s / 2 - size / 2 + 'px';
      p.style.top = y + s / 2 - size / 2 + 'px';
      const angle = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 30;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      this.tilesLayerEl.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  /** Пересчитывает позиции всех плиток на поле (например, при resize). */
  relayout(board) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const tile = board[r][c];
        if (tile && this.tileEls[tile.id]) {
          const { x, y, s } = this.cellPos(r, c);
          const entry = this.tileEls[tile.id];
          entry.pos.style.width = s + 'px';
          entry.pos.style.height = s + 'px';
          entry.pos.style.transform = `translate(${x}px,${y}px)`;
        }
      }
    }
  }
}
