// Synthesized sound: every effect and the music loop are built from raw
// oscillators and noise, so the game needs no audio files and no network.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Must be called from a user gesture at least once; browsers block audio
  // before that. Safe to call repeatedly — it no-ops after the first init.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.1, vol = 0.3, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.3, freq = 1200, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this._tone({ type: 'square', freq: 880, freqEnd: 220, dur: 0.07, vol: 0.12 });
  }
  enemyShoot() {
    this._tone({ type: 'sawtooth', freq: 320, freqEnd: 140, dur: 0.12, vol: 0.08 });
  }
  hit() {
    this._noise({ dur: 0.06, vol: 0.15, freq: 2400 });
  }
  explosion(big = false) {
    this._noise({ dur: big ? 0.6 : 0.25, vol: big ? 0.5 : 0.28, freq: big ? 900 : 1600 });
    this._tone({ type: 'sine', freq: big ? 160 : 220, freqEnd: 40, dur: big ? 0.5 : 0.22, vol: 0.35 });
  }
  playerHit() {
    this._tone({ type: 'sawtooth', freq: 200, freqEnd: 50, dur: 0.3, vol: 0.35 });
    this._noise({ dur: 0.3, vol: 0.3, freq: 800 });
  }
  pickup() {
    this._tone({ type: 'sine', freq: 660, dur: 0.08, vol: 0.2 });
    this._tone({ type: 'sine', freq: 990, dur: 0.12, vol: 0.2, when: 0.07 });
  }
  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.16, vol: 0.22, when: i * 0.08 }));
  }
  waveClear() {
    [392, 523, 659].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.14, vol: 0.18, when: i * 0.09 }));
  }
  bossAlarm() {
    this._tone({ type: 'sawtooth', freq: 110, freqEnd: 220, dur: 0.4, vol: 0.25 });
    this._tone({ type: 'sawtooth', freq: 110, freqEnd: 220, dur: 0.4, vol: 0.25, when: 0.45 });
  }
  gameOver() {
    [392, 311, 233, 175].forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.3, vol: 0.25, when: i * 0.22 }));
  }
  dash() {
    this._noise({ dur: 0.12, vol: 0.12, freq: 3200 });
  }

  // A slow minor-key bass pulse with a sparse arp. 8 steps per bar at 112bpm.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [55, 0, 55, 65.41, 0, 49, 0, 58.27];
    const arp = [220, 261.63, 329.63, 392, 329.63, 261.63, 220, 196];
    const stepDur = 60 / 112 / 2;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const i = this.musicStep % 8;
      const b = bass[i];
      if (b) this._musicNote(b, stepDur * 1.8, 'triangle', 0.5);
      if (this.musicStep % 2 === 0) {
        this._musicNote(arp[i], stepDur * 0.9, 'sine', 0.18);
      }
      this.musicStep++;
    }, stepDur * 1000);
  }

  _musicNote(freq, dur, type, vol) {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}
