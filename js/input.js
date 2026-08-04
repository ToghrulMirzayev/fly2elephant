/**
 * input.js
 * Слушает клавиатуру (стрелки / WASD) и свайпы на тач-устройствах,
 * вызывая переданный колбэк onMove('left'|'right'|'up'|'down').
 */
class InputController {
  constructor(target, onMove) {
    this.target = target;
    this.onMove = onMove;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._bind();
  }

  _bind() {
    const keyMap = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down',
    };
    document.addEventListener('keydown', (e) => {
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        this.onMove(dir);
      }
    });

    this.target.addEventListener('touchstart', (e) => {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.target.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 24;
      if (Math.max(absX, absY) < threshold) return;
      if (absX > absY) {
        this.onMove(dx > 0 ? 'right' : 'left');
      } else {
        this.onMove(dy > 0 ? 'down' : 'up');
      }
    }, { passive: true });
  }
}
