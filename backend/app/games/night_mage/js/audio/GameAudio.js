import { Rng } from '../core/Rng.js';
import { Music } from './Music.js';

/**
 * Synthesised sound effects and music (no files to load). Reacts to the
 * simulation's events; the browser lets it start only after the first touch
 * (`unlock`), so music asked for earlier starts then.
 */
const VOLUME = 0.32;

/** One recipe per event: tones (`t`: wave, from-to Hz, seconds, volume) and noise bursts (`n`). */
const SOUNDS = {
    cast: [{ t: 'square', from: 1300, to: 380, d: 0.08, v: 0.12 }],
    boltHit: [{ n: 0.06, f: 2400, v: 0.18 }],
    kill: [{ n: 0.16, f: 900, v: 0.35 }, { t: 'triangle', from: 300, to: 90, d: 0.16, v: 0.25 }],
    burst: [{ n: 0.12, f: 600, v: 0.3 }],
    miss: [{ t: 'sine', from: 180, to: 120, d: 0.06, v: 0.1 }],
    shotDown: [{ t: 'square', from: 1800, to: 900, d: 0.07, v: 0.12 }, { n: 0.05, f: 3000, v: 0.12 }],
    fire: [{ t: 'sawtooth', from: 220, to: 420, d: 0.12, v: 0.06 }],
    shield: [{ t: 'sine', from: 520, to: 1040, d: 0.22, v: 0.22 }, { t: 'sine', from: 780, to: 1560, d: 0.22, v: 0.12 }],
    shieldBusy: [{ t: 'square', from: 140, to: 140, d: 0.05, v: 0.06 }],
    blocked: [{ t: 'triangle', from: 1200, to: 600, d: 0.12, v: 0.25 }],
    reflect: [{ t: 'square', from: 600, to: 1500, d: 0.1, v: 0.12 }],
    hurt: [{ t: 'sawtooth', from: 160, to: 50, d: 0.3, v: 0.35 }, { n: 0.12, f: 400, v: 0.3 }],
    death: [{ t: 'sawtooth', from: 300, to: 30, d: 1, v: 0.4 }, { n: 0.6, f: 300, v: 0.35 }],
    pickup: [{ t: 'square', from: 660, to: 660, d: 0.06, v: 0.12 }, { t: 'square', from: 990, to: 990, d: 0.08, v: 0.12, at: 0.06 }, { t: 'square', from: 1320, to: 1320, d: 0.12, v: 0.12, at: 0.12 }],
    nova: [{ n: 0.5, f: 500, v: 0.4 }, { t: 'sine', from: 900, to: 60, d: 0.5, v: 0.3 }],
    combo: [{ t: 'triangle', from: 880, to: 1760, d: 0.15, v: 0.15 }],
    critical: [{ t: 'square', from: 1600, to: 2400, d: 0.08, v: 0.14 }, { n: 0.12, f: 3000, v: 0.22 }, { t: 'triangle', from: 600, to: 150, d: 0.18, v: 0.2, at: 0.03 }],
    boon: [523, 784, 1047, 1568].map((f, i) => ({ t: 'triangle', from: f, to: f, d: 0.12, v: 0.13, at: i * 0.06 })),
    offer: [{ t: 'sine', from: 330, to: 660, d: 0.3, v: 0.12 }],
    vampire: [{ t: 'sine', from: 400, to: 800, d: 0.2, v: 0.15 }],
    thorns: [{ n: 0.1, f: 1500, v: 0.2 }],
    noEnergy: [{ t: 'square', from: 110, to: 90, d: 0.07, v: 0.07 }],
    stormReady: [784, 988, 1175].map((f, i) => ({ t: 'triangle', from: f, to: f, d: 0.1, v: 0.12, at: i * 0.07 })),
    storm: [{ n: 0.6, f: 300, v: 0.35 }, { t: 'sawtooth', from: 90, to: 40, d: 0.6, v: 0.2 }],
    lightning: [{ n: 0.18, f: 5000, v: 0.3 }, { t: 'square', from: 2400, to: 200, d: 0.12, v: 0.1 }],
    wave: [{ t: 'triangle', from: 392, to: 392, d: 0.12, v: 0.18 }, { t: 'triangle', from: 523, to: 523, d: 0.2, v: 0.18, at: 0.12 }],
    waveClear: [523, 659, 784, 1047].map((f, i) => ({ t: 'square', from: f, to: f, d: 0.12, v: 0.1, at: i * 0.1 })),
    spawn: [{ t: 'sine', from: 90, to: 260, d: 0.25, v: 0.07 }],
    /** A boss is coming: three low horns falling, then a rumble. */
    invaderComing: [
        ...[110, 98, 82].map((f, i) => ({ t: 'sawtooth', from: f, to: f * 0.97, d: 0.42, v: 0.16, at: i * 0.4 })),
        { n: 0.5, f: 220, v: 0.2, at: 0.8 },
    ],
    countdown: [{ t: 'square', from: 660, to: 660, d: 0.1, v: 0.12 }],
    go: [{ t: 'square', from: 1320, to: 1320, d: 0.25, v: 0.14 }],
};

export class GameAudio {
    #ctx = null;
    #master = null;
    #noise = null;
    #muted = false;
    #music = null;
    #mood = null;

    unlock() {
        if (this.#ctx) {
            if (this.#ctx.state === 'suspended') this.#ctx.resume().catch(() => {});
            return;
        }
        const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Context) return;
        this.#ctx = new Context();
        this.#master = this.#ctx.createGain();
        this.#master.gain.value = this.#muted ? 0 : VOLUME;
        this.#master.connect(this.#ctx.destination);
        this.#noise = this.#makeNoise();
        this.#music = new Music(this.#ctx, this.#master, this.#noise);
        this.#music.setMood(this.#mood);
    }

    /** @param {'calm'|'fight'|'boss'|null} mood the music to play, `null` for none */
    setMusic(mood) {
        this.#mood = mood;
        this.#music?.setMood(mood);
    }

    setMuted(muted) {
        this.#muted = muted;
        if (this.#master) this.#master.gain.value = muted ? 0 : VOLUME;
    }

    setSuspended(suspended) {
        if (!this.#ctx) return;
        const action = suspended ? this.#ctx.suspend() : this.#ctx.resume();
        action.catch(() => {});
    }

    /** Plays the sounds of a tick's events (at most one of each kind). */
    playEvents(events) {
        const seen = new Set();
        for (const { type } of events) {
            if (seen.has(type)) continue;
            seen.add(type);
            this.play(type);
        }
    }

    play(name) {
        const recipe = SOUNDS[name];
        if (!recipe || !this.#ctx || this.#ctx.state !== 'running') return;
        const now = this.#ctx.currentTime;
        for (const part of recipe) {
            if (part.n) this.#burst(now + (part.at ?? 0), part);
            else this.#tone(now + (part.at ?? 0), part);
        }
    }

    #tone(start, { t, from, to, d, v }) {
        const osc = this.#ctx.createOscillator();
        const gain = this.#ctx.createGain();
        osc.type = t;
        osc.frequency.setValueAtTime(from, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + d);
        gain.gain.setValueAtTime(v, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + d);
        osc.connect(gain).connect(this.#master);
        osc.start(start);
        osc.stop(start + d + 0.02);
    }

    #burst(start, { n, f, v }) {
        const source = this.#ctx.createBufferSource();
        source.buffer = this.#noise;
        const filter = this.#ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = f;
        const gain = this.#ctx.createGain();
        gain.gain.setValueAtTime(v, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n);
        source.connect(filter).connect(gain).connect(this.#master);
        source.start(start);
        source.stop(start + n + 0.02);
    }

    #makeNoise() {
        const length = this.#ctx.sampleRate;
        const buffer = this.#ctx.createBuffer(1, length, this.#ctx.sampleRate);
        const data = buffer.getChannelData(0);
        const hiss = new Rng(0x5eed);
        for (let i = 0; i < length; i++) data[i] = hiss.range(-1, 1);
        return buffer;
    }
}
