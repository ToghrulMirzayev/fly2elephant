/**
 * audio.js
 * Звуковые эффекты игры. ВСЕ звуки генерируются на лету через встроенный
 * в браузер Web Audio API (осцилляторы + огибающие громкости) — это не
 * сэмплы и не чьи-то записи, а обычная синтезированная волна, как в
 * ретро-играх. Поэтому здесь нечему конфликтовать с авторским правом:
 * ни одного внешнего аудиофайла в проекте нет.
 *
 * Если Web Audio API недоступен (старый браузер, ограничения окружения),
 * класс тихо отключает себя и игра просто работает без звука.
 */
class AudioController {
  constructor() {
    this.ctx = null;
    this.supported = !!(window.AudioContext || window.webkitAudioContext);
    this.enabled = Storage.getSoundEnabled();
  }

  _ensureCtx() {
    if (!this.supported) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      try {
        this.ctx = new Ctx();
      } catch (e) {
        this.supported = false;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(value) {
    this.enabled = value;
    Storage.setSoundEnabled(value);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /** Один синтезированный тон с плавной огибающей громкости (щипковый "поп"). */
  _tone({ freq, duration = 0.18, type = 'triangle', startGain = 0.22, delay = 0, glideTo = null }) {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, now + duration * 0.6);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(startGain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Звук слияния. Высота тона растёт вместе с уровнем — чем крупнее
   * получившееся животное, тем "весомее" и выше звучит слияние.
   */
  playMerge(tier) {
    const t = Math.min(tier, 20);
    const base = 240 + t * 16;
    this._tone({ freq: base, glideTo: base * 1.4, duration: 0.16, type: 'triangle', startGain: 0.2 });
    // На высоких уровнях добавляется лёгкий гармонический "блеск" вторым тоном
    if (t >= 12) {
      this._tone({ freq: base * 2, duration: 0.12, type: 'sine', startGain: 0.09, delay: 0.02 });
    }
  }

  /** Тихий короткий тик при появлении новой плитки. */
  playSpawn() {
    this._tone({ freq: 520, duration: 0.06, type: 'sine', startGain: 0.06 });
  }

  /**
   * Мягкий "шорох" при обычном перемещении плиток без слияния.
   * В отличие от тонов выше, это отфильтрованный белый шум —
   * так же полностью синтезируется на лету, просто другим методом
   * (шум вместо осциллятора), никакого сэмпла здесь тоже нет.
   */
  playSlide() {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;

    const duration = 0.13;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, 2.2); // быстрая атака, плавное затухание
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.1;

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  }

  /** Короткая победная восходящая трель. */
  playWin() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      this._tone({ freq: f, duration: 0.22, type: 'triangle', startGain: 0.18, delay: i * 0.09 });
    });
  }

  /** Мягкий нисходящий тон при завершении игры. */
  playGameOver() {
    this._tone({ freq: 380, glideTo: 180, duration: 0.4, type: 'sine', startGain: 0.16 });
  }
}
