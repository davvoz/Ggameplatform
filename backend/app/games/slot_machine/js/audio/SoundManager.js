/**
 * Lazy Web Audio synthesizer. 100% procedural — no files.
 * Manifest entries in sounds.json drive volume + throttling.
 *
 * Each generator builds a short audio graph that auto-disposes on stop.
 */
export class SoundManager {
    constructor(manifest) {
        this.master = manifest.master ?? 0.4;
        this.entries = manifest.sounds || {};
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this._lastPlay = new Map();
        this._loops = new Map();
    }

    _ensureCtx() {
        if (this.ctx) return;
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.master;
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        this._ensureCtx();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
    }

    suspend() {
        if (this.ctx?.state === 'running') this.ctx.suspend();
    }

    setMuted(m) {
        this.muted = m;
        if (this.masterGain) this.masterGain.gain.value = m ? 0 : this.master;
    }

    play(id) {
        const entry = this.entries[id];
        if (!entry || this.muted) return;
        if (this._isThrottled(id, entry.throttle)) return;
        this._ensureCtx();
        if (!this.ctx) return;
        const gen = GENERATORS[entry.procedural];
        if (!gen) return;
        const vol = entry.volume ?? 0.6;
        gen(this.ctx, this.masterGain, vol);
        this._lastPlay.set(id, this.ctx.currentTime * 1000);
    }

    startLoop(id) {
        if (this._loops.has(id)) return;
        const entry = this.entries[id];
        if (!entry || this.muted) return;
        this._ensureCtx();
        if (!this.ctx) return;
        const gen = LOOP_GENERATORS[entry.procedural];
        if (!gen) return;
        const handle = gen(this.ctx, this.masterGain, entry.volume ?? 0.4);
        this._loops.set(id, handle);
    }

    stopLoop(id) {
        const h = this._loops.get(id);
        if (!h) return;
        try { h.stop(); } catch { /* noop */ }
        this._loops.delete(id);
    }

    _isThrottled(id, throttleMs) {
        if (!throttleMs) return false;
        const last = this._lastPlay.get(id) ?? 0;
        return (this.ctx.currentTime * 1000 - last) < throttleMs;
    }
}

// ---------- One-shot generators ----------

function envGain(ctx, vol, attack, decay, sustain, release) {
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(vol * sustain, 0.0001), now + attack + decay);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay + release);
    return g;
}

function osc(ctx, type, freq) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    return o;
}

function playOneShot(ctx, master, osc, gain, durSec) {
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + durSec);
}

const GENERATORS = {
    click(ctx, master, vol) {
        const o = osc(ctx, 'square', 1500);
        const g = envGain(ctx, vol, 0.001, 0.02, 0, 0.04);
        playOneShot(ctx, master, o, g, 0.08);
    },
    hover(ctx, master, vol) {
        const o = osc(ctx, 'sine', 600);
        const g = envGain(ctx, vol, 0.002, 0.04, 0, 0.06);
        playOneShot(ctx, master, o, g, 0.1);
    },
    whoosh(ctx, master, vol) {
        const o = osc(ctx, 'sawtooth', 200);
        o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
        const g = envGain(ctx, vol * 0.6, 0.01, 0.12, 0.2, 0.15);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1200;
        o.connect(f).connect(g).connect(master);
        o.start();
        o.stop(ctx.currentTime + 0.35);
    },
    thud(ctx, master, vol) {
        const o = osc(ctx, 'sine', 120);
        o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
        const g = envGain(ctx, vol, 0.001, 0.06, 0, 0.12);
        playOneShot(ctx, master, o, g, 0.2);
        const click = osc(ctx, 'triangle', 1200);
        const cg = envGain(ctx, vol * 0.4, 0.001, 0.01, 0, 0.02);
        playOneShot(ctx, master, click, cg, 0.04);
    },
    coin(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [880, 1320, 1760], 'triangle', 0.05);
    },
    blip(ctx, master, vol) {
        const o = osc(ctx, 'square', 1000);
        o.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.06);
        const g = envGain(ctx, vol, 0.005, 0.05, 0, 0.05);
        playOneShot(ctx, master, o, g, 0.12);
    },
    fanfare1(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [523, 659, 784, 1047], 'triangle', 0.08);
    },
    fanfare2(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [523, 659, 784, 1047, 1319], 'sawtooth', 0.09);
    },
    fanfare3(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [392, 523, 659, 784, 1047, 1319, 1568], 'square', 0.09);
    },
    fanfare4(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [392, 466, 523, 622, 698, 831, 932, 1108, 1244, 1397], 'sawtooth', 0.09);
    },
    siren(ctx, master, vol) {
        const o = osc(ctx, 'sawtooth', 400);
        const now = ctx.currentTime;
        for (let i = 0; i < 6; i++) {
            o.frequency.setValueAtTime(400, now + i * 0.3);
            o.frequency.exponentialRampToValueAtTime(1200, now + i * 0.3 + 0.15);
            o.frequency.exponentialRampToValueAtTime(400, now + i * 0.3 + 0.3);
        }
        const g = envGain(ctx, vol, 0.05, 0.3, 0.8, 1.5);
        o.connect(g).connect(master);
        o.start();
        o.stop(now + 2);
    },
    twinkle(ctx, master, vol) {
        playArpeggio(ctx, master, vol, [1760, 2093, 2637], 'sine', 0.06);
    },
    clack(ctx, master, vol) {
        const o = osc(ctx, 'square', 300);
        o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        const g = envGain(ctx, vol, 0.001, 0.04, 0, 0.06);
        playOneShot(ctx, master, o, g, 0.12);
    },
    swoosh(ctx, master, vol) {
        const o = osc(ctx, 'sawtooth', 100);
        o.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
        const g = envGain(ctx, vol * 0.5, 0.02, 0.1, 0.3, 0.18);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 4;
        o.connect(f).connect(g).connect(master);
        o.start();
        o.stop(ctx.currentTime + 0.4);
    },
    rumble(ctx, master, vol) {
        // one-shot version (mostly used via loop variant)
        const o = osc(ctx, 'sawtooth', 80);
        const g = envGain(ctx, vol * 0.3, 0.01, 0.2, 0.4, 0.2);
        playOneShot(ctx, master, o, g, 0.5);
    },
    glitch(ctx, master, vol) {
        const o = osc(ctx, 'square', 800);
        const now = ctx.currentTime;
        for (let i = 0; i < 6; i++) {
            o.frequency.setValueAtTime(400 + Math.random() * 2000, now + i * 0.03);
        }
        const g = envGain(ctx, vol, 0.002, 0.05, 0, 0.1);
        playOneShot(ctx, master, o, g, 0.2);
    },
    wah(ctx, master, vol) {
        const o = osc(ctx, 'sawtooth', 440);
        o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.45);
        const g = envGain(ctx, vol, 0.02, 0.1, 0.4, 0.35);
        playOneShot(ctx, master, o, g, 0.55);
    }
};

function playArpeggio(ctx, master, vol, freqs, type, stepDur) {
    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
        const o = osc(ctx, type, f);
        const g = ctx.createGain();
        const start = now + i * stepDur;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, start + stepDur * 1.4);
        o.connect(g).connect(master);
        o.start(start);
        o.stop(start + stepDur * 1.4);
    });
}

// ---------- Loop generators ----------

const LOOP_GENERATORS = {
    rumble(ctx, master, vol) {
        const o = osc(ctx, 'sawtooth', 90);
        const lfo = osc(ctx, 'sine', 7);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 20;
        lfo.connect(lfoGain).connect(o.frequency);
        const g = ctx.createGain();
        g.gain.value = 0;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 600;
        o.connect(f).connect(g).connect(master);
        const now = ctx.currentTime;
        g.gain.linearRampToValueAtTime(vol * 0.35, now + 0.08);
        o.start();
        lfo.start();
        return {
            stop() {
                const t = ctx.currentTime;
                g.gain.cancelScheduledValues(t);
                g.gain.setValueAtTime(g.gain.value, t);
                g.gain.linearRampToValueAtTime(0.0001, t + 0.08);
                o.stop(t + 0.1);
                lfo.stop(t + 0.1);
            }
        };
    }
};
