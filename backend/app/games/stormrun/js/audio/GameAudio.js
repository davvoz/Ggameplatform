import { SimEvent } from '../sim/Simulation.js';
import { SCALE, boing, burst, createLoop, noiseBuffer, strike, thud } from './Instruments.js';
import { MusicLoop } from './MusicLoop.js';

/**
 * Turns simulation events into sound. The thunder grows as the storm gets
 * closer: you hear the danger before you see it.
 */

const DANGER_GAP = 40;
const FAST_SPEED = 40;
const RAIN_LEVEL = 0.34;
const RUMBLE_LEVEL = 0.8;
const WIND_LEVEL = 0.05;

export class GameAudio {
    #context = null;
    #master = null;
    #noise = null;
    #music = null;
    #rain = null;
    #rumble = null;
    #wind = null;
    #muted = false;
    #playing = false;

    #handlers = Object.freeze({
        [SimEvent.DROP]: (event) => this.#playDrop(event.value),
        [SimEvent.RAINBOW]: () => this.#playRainbow(),
        [SimEvent.JUMP]: () => boing(this.#context, this.#master, this.#now, 0.22, 240),
        [SimEvent.DOUBLE_JUMP]: () => boing(this.#context, this.#master, this.#now, 0.2, 360),
        [SimEvent.LAND]: (event) => thud(this.#context, this.#master, this.#now, 0.18 + event.value * 0.3),
        [SimEvent.PERFECT]: () => this.#playPerfect(),
        [SimEvent.HIT]: () => this.#playHit(),
        [SimEvent.SPLASH]: () => burst(this.#context, this.#master, this.#noise, this.#now, 0.4, 1400, 0.3),
        [SimEvent.CAUGHT]: () => this.#playCaught(),
    });

    /** Browsers open audio only after a gesture: call this from one. */
    unlock() {
        if (this.#context) {
            this.#context.resume();
            return;
        }
        const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!AudioContextClass) return;

        this.#context = new AudioContextClass();
        this.#master = this.#context.createGain();
        this.#master.gain.value = this.#muted ? 0 : 0.8;
        this.#master.connect(this.#context.destination);
        this.#noise = noiseBuffer(this.#context);
        this.#music = new MusicLoop(this.#context, this.#master);
        this.#rain = createLoop(this.#context, this.#master, this.#noise, 'highpass', 1800);
        this.#rumble = createLoop(this.#context, this.#master, this.#noise, 'lowpass', 110);
        this.#wind = createLoop(this.#context, this.#master, this.#noise, 'bandpass', 700);
    }

    /** @param {boolean} muted */
    setMuted(muted) {
        this.#muted = muted;
        if (this.#master) this.#master.gain.value = muted ? 0 : 0.8;
    }

    /** @param {boolean} playing whether a run is on */
    setPlaying(playing) {
        this.#playing = playing;
    }

    /** @param {boolean} suspended */
    setSuspended(suspended) {
        if (!this.#context) return;
        if (suspended) this.#context.suspend();
        else this.#context.resume();
    }

    /** @param {{type: string, value: number}[]} events */
    handle(events) {
        if (!this.#context) return;
        for (const event of events) this.#handlers[event.type]?.(event);
    }

    /** Keep the live sounds in step with the run. */
    update(sim) {
        if (!this.#context) return;
        if (this.#playing) this.#music.update();

        const danger = this.#playing ? Math.max(0, 1 - sim.gap / DANGER_GAP) : 0;
        const pace = this.#playing ? Math.min(1, sim.runner.speed / FAST_SPEED) : 0;
        this.#rain.value = danger * RAIN_LEVEL;
        this.#rumble.value = danger * danger * RUMBLE_LEVEL;
        this.#wind.value = pace * WIND_LEVEL;
    }

    get #now() {
        return this.#context.currentTime;
    }

    #playDrop(band) {
        strike(this.#context, this.#master, SCALE[band % SCALE.length], this.#now, 0.4);
    }

    #playRainbow() {
        SCALE.forEach((note, i) => {
            strike(this.#context, this.#master, note * 2, this.#now + i * 0.055, 0.32, 0.5);
        });
    }

    #playPerfect() {
        strike(this.#context, this.#master, SCALE[4], this.#now, 0.24);
        strike(this.#context, this.#master, SCALE[0] * 2, this.#now + 0.08, 0.28);
    }

    #playHit() {
        thud(this.#context, this.#master, this.#now, 0.5, 220, 70);
        burst(this.#context, this.#master, this.#noise, this.#now, 0.24, 500, 0.14);
    }

    #playCaught() {
        const notes = [SCALE[4], SCALE[2], SCALE[0], SCALE[0] / 2];
        notes.forEach((note, i) => strike(this.#context, this.#master, note, this.#now + i * 0.13, 0.32, 0.5));
    }
}
