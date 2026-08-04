/**
 * engine.js
 * Чистая логика игры "Из мухи в слона" (мердж-механика в духе 2048).
 * Никакой работы с DOM здесь нет — движок можно тестировать отдельно.
 */
class GameEngine {
  /**
   * @param {number} size — размер поля (size x size)
   * @param {number} maxTier — максимальный уровень (индекс последнего животного)
   */
  constructor(size = 4, maxTier = MAX_TIER) {
    this.size = size;
    this.maxTier = maxTier;
    this.reset();
  }

  reset() {
    this.board = this._emptyBoard();
    this.nextId = 1;
    this.score = 0;
    this.maxTierReached = 1;
    this.won = false;
    this.over = false;

    // Первые две плитки — гарантированно одинаковые (уровень 1),
    // чтобы игрок сразу видел, куда двигаться для первого слияния.
    this._spawnTileAt(this._randomEmptyCell(), 1);
    this._spawnTileAt(this._randomEmptyCell(), 1);
  }

  _emptyBoard() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(null));
  }

  _emptyCells() {
    const cells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (!this.board[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  _randomEmptyCell() {
    const empties = this._emptyCells();
    if (empties.length === 0) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  _spawnTileAt(cell, forcedTier) {
    if (!cell) return null;
    const [r, c] = cell;
    const tier = forcedTier || (Math.random() < 0.85 ? 1 : 2);
    const tile = { id: this.nextId++, tier };
    this.board[r][c] = tile;
    return { tile, r, c };
  }

  /** Добавляет случайную новую плитку на свободную клетку. Возвращает {tile,r,c} или null. */
  spawnRandomTile() {
    const cell = this._randomEmptyCell();
    if (!cell) return null;
    return this._spawnTileAt(cell);
  }

  _lineCoords(dir) {
    const lines = [];
    for (let i = 0; i < this.size; i++) {
      const coords = [];
      for (let j = 0; j < this.size; j++) {
        let r, c;
        if (dir === 'left') { r = i; c = j; }
        else if (dir === 'right') { r = i; c = this.size - 1 - j; }
        else if (dir === 'up') { r = j; c = i; }
        else { r = this.size - 1 - j; c = i; } // down
        coords.push([r, c]);
      }
      lines.push(coords);
    }
    return lines;
  }

  /**
   * Сжимает и сливает одну линию клеток (порядок: индекс 0 — край, куда движемся).
   * Каждая плитка может слиться только один раз за ход (классическое правило 2048).
   */
  _processLine(cells) {
    const tiles = cells.filter(Boolean);
    const outLine = [];
    const merges = [];
    let i = 0;
    while (i < tiles.length) {
      const cur = tiles[i];
      const nxt = tiles[i + 1];
      if (nxt && nxt.tier === cur.tier && cur.tier < this.maxTier) {
        const newTier = cur.tier + 1;
        merges.push({ survivorId: cur.id, consumedId: nxt.id, newTier });
        outLine.push({ id: cur.id, tier: newTier });
        i += 2;
      } else {
        outLine.push({ id: cur.id, tier: cur.tier });
        i += 1;
      }
    }
    while (outLine.length < cells.length) outLine.push(null);
    return { outLine, merges };
  }

  /**
   * Выполняет ход в направлении dir ('left'|'right'|'up'|'down').
   * Возвращает подробный результат для отрисовки:
   * { moved, merges:[{survivorId,consumedId,newTier}], targetPos:{id:{r,c}},
   *   oldPos:{id:{r,c}}, scoreGained, spawned:{tile,r,c}|null, over, won }
   */
  move(dir) {
    const lines = this._lineCoords(dir);
    const newBoard = this._emptyBoard();
    const targetPos = {};
    const allMerges = [];
    const oldPos = {};

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c]) oldPos[this.board[r][c].id] = { r, c };
      }
    }

    for (const coords of lines) {
      const cells = coords.map(([r, c]) => this.board[r][c]);
      const { outLine, merges } = this._processLine(cells);
      allMerges.push(...merges);
      outLine.forEach((tileOrNull, k) => {
        const [r, c] = coords[k];
        if (tileOrNull) {
          newBoard[r][c] = tileOrNull;
          targetPos[tileOrNull.id] = { r, c };
        }
      });
    }
    allMerges.forEach((m) => { targetPos[m.consumedId] = targetPos[m.survivorId]; });

    let moved = allMerges.length > 0;
    if (!moved) {
      for (const id of Object.keys(oldPos)) {
        const o = oldPos[id];
        const t = targetPos[id];
        if (!t || o.r !== t.r || o.c !== t.c) { moved = true; break; }
      }
    }

    if (!moved) {
      return { moved: false };
    }

    this.board = newBoard;

    let scoreGained = 0;
    allMerges.forEach((m) => {
      scoreGained += Math.pow(2, m.newTier);
      if (m.newTier > this.maxTierReached) this.maxTierReached = m.newTier;
      if (m.newTier === this.maxTier) this.won = true;
    });
    this.score += scoreGained;

    const spawned = this.spawnRandomTile();
    this.over = !this._hasMoves();

    return {
      moved: true,
      merges: allMerges,
      targetPos,
      oldPos,
      scoreGained,
      spawned,
      over: this.over,
      won: this.won,
      score: this.score,
      maxTierReached: this.maxTierReached,
    };
  }

  _hasMoves() {
    if (this._emptyCells().length > 0) return true;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const t = this.board[r][c];
        if (!t) continue;
        if (c < this.size - 1) {
          const right = this.board[r][c + 1];
          if (right && right.tier === t.tier && t.tier < this.maxTier) return true;
        }
        if (r < this.size - 1) {
          const down = this.board[r + 1][c];
          if (down && down.tier === t.tier && t.tier < this.maxTier) return true;
        }
      }
    }
    return false;
  }
}
