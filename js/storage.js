/**
 * storage.js
 * Небольшая обёртка над localStorage для хранения рекорда между сессиями.
 * Если localStorage недоступен (приватный режим и т.п.), игра просто
 * продолжает работать без сохранения рекорда.
 */
const Storage = {
  KEY_BEST: 'iz-muhi-v-slona:best',
  KEY_SOUND: 'iz-muhi-v-slona:sound',
  KEY_KIDS_MODE: 'iz-muhi-v-slona:kids-mode',

  getBest() {
    try {
      const raw = localStorage.getItem(this.KEY_BEST);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  },

  setBest(value) {
    try {
      localStorage.setItem(this.KEY_BEST, String(value));
    } catch (e) {
      /* игнорируем — например, приватный режим браузера */
    }
  },

  getSoundEnabled() {
    try {
      const raw = localStorage.getItem(this.KEY_SOUND);
      return raw === null ? true : raw === '1'; // звук включён по умолчанию
    } catch (e) {
      return true;
    }
  },

  setSoundEnabled(value) {
    try {
      localStorage.setItem(this.KEY_SOUND, value ? '1' : '0');
    } catch (e) {
      /* игнорируем */
    }
  },

  getKidsMode() {
    try {
      const raw = localStorage.getItem(this.KEY_KIDS_MODE);
      return raw === '1'; // по умолчанию выключен — обычные правила
    } catch (e) {
      return false;
    }
  },

  setKidsMode(value) {
    try {
      localStorage.setItem(this.KEY_KIDS_MODE, value ? '1' : '0');
    } catch (e) {
      /* игнорируем */
    }
  },
};