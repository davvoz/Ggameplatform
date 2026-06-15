/**
 * AudioManager — procedural sound via WebAudio (no asset files).
 *   - engine: continuous oscillator, pitch/volume driven by speed + throttle
 *   - boost: filtered noise loop, gated on/off
 *   - one-shots: land (thud), trick (blip), crash (noise + low sweep)
 *
 * Must be unlocked by a user gesture (browser autoplay policy): call unlock().
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.noise = null;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(ctx.destination);

      // shared white-noise buffer
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      // engine
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 70;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 600;
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(flt); flt.connect(g); g.connect(this.master); osc.start();
      this.engine = osc; this.engineFilter = flt; this.engineGain = g;

      // boost (looped noise through bandpass)
      const bsrc = ctx.createBufferSource(); bsrc.buffer = this.noise; bsrc.loop = true;
      const bflt = ctx.createBiquadFilter(); bflt.type = 'bandpass'; bflt.frequency.value = 900; bflt.Q.value = 0.7;
      const bg = ctx.createGain(); bg.gain.value = 0;
      bsrc.connect(bflt); bflt.connect(bg); bg.connect(this.master); bsrc.start();
      this.boostGain = bg;

      this.ready = true;
    } catch (e) {
      console.warn('[StuntHill] audio init failed', e);
    }
  }

  setEngine(speed, throttle) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const sp = Math.min(speed, 30);
    this.engine.frequency.setTargetAtTime(60 + sp * 7, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(500 + sp * 60, t, 0.05);
    const vol = 0.022 + Math.min(1, throttle) * 0.05 + (sp / 30) * 0.02;
    this.engineGain.gain.setTargetAtTime(vol, t, 0.08);
  }

  setBoost(on) {
    if (!this.ready) return;
    this.boostGain.gain.setTargetAtTime(on ? 0.10 : 0, this.ctx.currentTime, 0.05);
  }

  land(intensity) { this._noiseBurst(0.18, 320, Math.min(0.5, 0.18 + intensity * 0.4)); }
  crash() { this._noiseBurst(0.4, 200, 0.5); this._blip(120, 0.35, 'sawtooth', 0.22, 50); }
  trick() { this._blip(640, 0.13, 'square', 0.12, 1180); }
  boing() { this._blip(180, 0.22, 'sine', 0.2, 560); }
  beep(freq, dur) { this._blip(freq, dur, 'triangle', 0.18, freq); }   // clean tone (race countdown)

  _noiseBurst(dur, cutoff, vol) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  }

  _blip(freq, dur, type, vol, freqTo) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type;
    const g = ctx.createGain();
    o.frequency.setValueAtTime(freq, t);
    if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
  }
}
