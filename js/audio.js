/**
 * audio.js
 * Звуковые эффекты игры. ВСЕ звуки генерируются на лету через встроенный
 * в браузер Web Audio API (осцилляторы, шум-буферы, фильтры и огибающие
 * громкости) — это не сэмплы и не чьи-то записи, а синтезированная волна,
 * как в ретро-играх. Поэтому здесь нечему конфликтовать с авторским
 * правом: ни одного внешнего аудиофайла в проекте нет.
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

  // ---- низкоуровневые "кирпичики" звука ------------------------------

  /** Один тон-осциллятор с огибающей громкости и опциональным глиссандо высоты. */
  _blip(ctx, { freq, glideTo = null, duration = 0.18, type = 'sine', peak = 0.22, delay = 0, attack = 0.008 }) {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, now + duration * 0.7);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  /** Короткий отфильтрованный шумовой всплеск — используется как "щелчок" атаки. */
  _click(ctx, { duration = 0.02, freq = 2200, Q = 0.6, peak = 0.14, delay = 0 } = {}) {
    const now = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = Q;

    const gain = ctx.createGain();
    gain.gain.value = peak;

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  // ---- игровые звуки ---------------------------------------------------

  /**
   * "Блюмп" при слиянии — сочный, объёмный поп вместо простого писка.
   * Три слоя одновременно: нисходящее глиссандо (тело звука), низкий
   * "вес" (саб-тон для ощущения массы) и короткий щелчок атаки для
   * тактильности. Чем крупнее уровень — тем ниже и весомее звук, а на
   * больших слияниях (от уровня 12) добавляется гармонический "блеск".
   */
  playMerge(tier) {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;
    const t = Math.min(tier, 20);

    // Тело "блюмпа": пикирующее вниз глиссандо — характерный булькающий поп.
    const bodyBase = 260 - t * 4; // с ростом уровня звук чуть ниже и весомее
    this._blip(ctx, {
      freq: bodyBase * 2.4,
      glideTo: Math.max(90, bodyBase * 0.8),
      duration: 0.22 + t * 0.006,
      type: 'sine',
      peak: 0.3,
      attack: 0.004,
    });

    // Низкий саб-слой — добавляет ощущение массы/объёма.
    this._blip(ctx, {
      freq: 95 + t * 1.5,
      glideTo: 55,
      duration: 0.16,
      type: 'sine',
      peak: 0.22,
      delay: 0.006,
      attack: 0.006,
    });

    // Короткий щелчок атаки — делает звук более "тактильным", не размытым.
    this._click(ctx, { duration: 0.018, freq: 2600, peak: 0.1 });

    // Гармонический "блеск" на крупных слияниях.
    if (t >= 12) {
      this._blip(ctx, { freq: bodyBase * 3.2, duration: 0.16, type: 'sine', peak: 0.1, delay: 0.035 });
      this._blip(ctx, { freq: bodyBase * 4.8, duration: 0.14, type: 'sine', peak: 0.07, delay: 0.06 });
    }
  }

  /** Тихий короткий тик при появлении новой плитки. */
  playSpawn() {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;
    this._blip(ctx, { freq: 520, duration: 0.06, type: 'sine', peak: 0.06 });
  }

  /**
   * Протяжный "шорох" при обычном перемещении плиток без слияния —
   * не короткий тик, а более длинный свист/шелест с плавающим фильтром,
   * будто по полю действительно что-то шуршит. Синтезируется как
   * отфильтрованный белый шум с "гуляющей" частотой фильтра во времени.
   */
  playSlide() {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;

    const duration = 0.5;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Лёгкое "трепетание" громкости поверх огибающей — имитирует, как
    // шелест листвы состоит из множества мелких потрескиваний, а не
    // одного ровного свиста. Частота/фаза каждый раз чуть разная,
    // чтобы шелест не звучал одинаково при каждом ходе.
    const flutterFreq = 16 + Math.random() * 10;
    const flutterPhase = Math.random() * Math.PI * 2;

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const attack = Math.min(1, t / 0.2);          // мягкий, неспешный вход
      const release = Math.min(1, (1 - t) / 0.6);   // плавное, некоротое затухание
      const envelope = Math.min(attack, release);
      const flutter = 0.6 + 0.4 * Math.sin(2 * Math.PI * flutterFreq * t * duration + flutterPhase);
      data[i] = (Math.random() * 2 - 1) * envelope * flutter;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Высокие частоты + мягкий верхний срез — воздушный, "лёгкий" тембр
    // вместо резонирующей резкой полосы (без Q-резонанса, который
    // звучал как грубый свист).
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1000;
    highpass.Q.value = 0.25;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;
    lowpass.Q.value = 0.25;

    const gain = ctx.createGain();
    gain.gain.value = 0.055; // заметно тише прежнего варианта

    noise.connect(highpass).connect(lowpass).connect(gain).connect(ctx.destination);
    noise.start(ctx.currentTime);
  }

  /** Победная восходящая трель. */
  playWin() {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      this._blip(ctx, { freq: f, duration: 0.22, type: 'triangle', peak: 0.18, delay: i * 0.09 });
    });
  }

  /** Мягкий нисходящий тон при завершении игры. */
  playGameOver() {
    const ctx = this._ensureCtx();
    if (!ctx || !this.enabled) return;
    this._blip(ctx, { freq: 380, glideTo: 180, duration: 0.4, type: 'sine', peak: 0.16 });
  }
}