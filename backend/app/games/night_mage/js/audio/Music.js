import { STEP_TIME, frequency, notesAt } from './Score.js';

/** How far ahead notes are booked, and how often the booking runs (seconds). */
const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const MUSIC_VOLUME = 0.4;

/** How each voice sounds: wave, volume, and how much of its length it holds. */
const VOICES = Object.freeze({
    bass: { wave: 'triangle', volume: 0.32, hold: 0.9, filter: 900 },
    arp: { wave: 'square', volume: 0.05, hold: 0.7, filter: 2200 },
    lead: { wave: 'square', volume: 0.07, hold: 0.85, filter: 3200, vibrato: true },
    softLead: { wave: 'triangle', volume: 0.12, hold: 0.9, filter: 2400, vibrato: true },
});

/**
 * Plays the score (`Score.js`) on the Web Audio clock: a timer books the
 * notes a little ahead, so they keep time even when frames stutter. The mood
 * can change on any step; `null` stops it.
 */
export class Music {
    #ctx;
    #bus;
    #noise;
    #mood = null;
    #step = 0;
    #nextTime = 0;
    #timer = null;

    /** @param {AudioContext} ctx @param {AudioNode} destination @param {AudioBuffer} noise */
    constructor(ctx, destination, noise) {
        this.#ctx = ctx;
        this.#noise = noise;
        this.#bus = ctx.createGain();
        this.#bus.gain.value = MUSIC_VOLUME;
        this.#bus.connect(destination);
    }

    /** @param {'calm'|'fight'|null} mood */
    setMood(mood) {
        if (mood === this.#mood) return;
        const starting = this.#mood === null;
        this.#mood = mood;
        if (mood === null) {
            clearInterval(this.#timer);
            this.#timer = null;
            return;
        }
        if (starting) {
            this.#step = 0;
            this.#nextTime = this.#ctx.currentTime + 0.05;
            this.#timer = setInterval(() => this.#book(), TICK_MS);
        }
    }

    #book() {
        const until = this.#ctx.currentTime + LOOKAHEAD;
        // after a long stall, start again from now instead of rushing to catch up
        if (this.#nextTime < this.#ctx.currentTime - 0.2) this.#nextTime = this.#ctx.currentTime + 0.02;
        while (this.#nextTime < until) {
            for (const note of notesAt(this.#step, this.#mood)) this.#play(note, this.#nextTime);
            this.#step += 1;
            this.#nextTime += STEP_TIME;
        }
    }

    #play({ voice, note, length }, at) {
        if (voice === 'kick') this.#kick(at);
        else if (voice === 'snare') this.#hiss(at, { duration: 0.12, volume: 0.16, type: 'bandpass', frequency: 1800 });
        else if (voice === 'hat') this.#hiss(at, { duration: 0.035, volume: 0.05, type: 'highpass', frequency: 7000 });
        else this.#tone(VOICES[voice], frequency(note), at, length * STEP_TIME);
    }

    #tone({ wave, volume, hold, filter, vibrato }, hz, at, duration) {
        const ctx = this.#ctx;
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(hz, at);
        if (vibrato && duration > 0.3) this.#vibrato(osc, at, duration);
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = filter;
        const gain = ctx.createGain();
        const end = at + duration * hold;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
        gain.gain.setValueAtTime(volume, Math.max(at + 0.01, end - 0.03));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(lowpass).connect(gain).connect(this.#bus);
        osc.start(at);
        osc.stop(end + 0.02);
    }

    /** A slight wobble that comes in after the attack, for the long notes of the tune. */
    #vibrato(osc, at, duration) {
        const lfo = this.#ctx.createOscillator();
        const depth = this.#ctx.createGain();
        lfo.frequency.value = 5.5;
        depth.gain.setValueAtTime(0, at);
        depth.gain.linearRampToValueAtTime(osc.frequency.value * 0.012, at + 0.25);
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(at);
        lfo.stop(at + duration);
    }

    #kick(at) {
        const ctx = this.#ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, at);
        osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
        gain.gain.setValueAtTime(0.42, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
        osc.connect(gain).connect(this.#bus);
        osc.start(at);
        osc.stop(at + 0.18);
    }

    #hiss(at, { duration, volume, type, frequency: hz }) {
        const ctx = this.#ctx;
        const source = ctx.createBufferSource();
        source.buffer = this.#noise;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = hz;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        source.connect(filter).connect(gain).connect(this.#bus);
        source.start(at, (at * 7.31) % 0.5); // a different stretch of the noise each hit
        source.stop(at + duration + 0.02);
    }
}
