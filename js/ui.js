/**
 * ui.js
 * Управляет счётом, рекордом, лентой эволюции и модальными окнами
 * (победа / игра окончена). Не содержит игровой логики.
 */
class UIController {
  constructor({ scoreEl, bestEl, trailEl, overlayEl, modalImg, modalTitle, modalText, modalBtns }) {
    this.scoreEl = scoreEl;
    this.bestEl = bestEl;
    this.trailEl = trailEl;
    this.overlayEl = overlayEl;
    this.modalImg = modalImg;
    this.modalTitle = modalTitle;
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

  updateTrail(maxTierReached) {
    TIERS.forEach((t) => {
      const chip = document.getElementById('trailchip-' + t.id);
      chip.classList.toggle('reached', t.id <= maxTierReached);
      chip.classList.toggle('current', t.id === maxTierReached);
    });
    const cur = document.getElementById('trailchip-' + maxTierReached);
    if (cur) cur.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

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
    this.modalTitle.textContent = 'Ура! Огромный слон!';
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
    this.modalTitle.textContent = 'Игра окончена';
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
}
