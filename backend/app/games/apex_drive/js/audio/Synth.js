import { Rng } from '../core/Rng.js';

/**
 * The sound card: one AudioContext, a master volume (and mute), a shared
 * buffer of white noise, the player of the recipes of config/Sounds.js and
 * the notes of the music (config/Music.js), on buses that fade.
 * Browsers start sound only after a touch or a key: `unlock` is called on
 * every one, and sounds asked for before simply do not play.
 */
const VOLUME = 0.35;
const NOISE_SECONDS = 2;
const NOISE_SEED = 4099;
/** Harmonics a pulse wave is built from. */
const PULSE_HARMONICS = 32;

/**
 * A mixer channel into the master (or another bus): a volume that fades, and,
 * if asked for, an echo the sounds can be sent to as well (`send`).
 */
class Bus {
    #ctx;
    #nodes = [];

    constructor(ctx, into, volume, echo) {
        this.#ctx = ctx;
        this.input = ctx.createGain();
        this.input.gain.value = volume;
        this.input.connect(into);
        this.#nodes.push(this.input);
        this.send = echo ? this.#echo(echo) : null;
    }

    fadeTo(volume, seconds) {
        const gain = this.input.gain;
        const now = this.#ctx.currentTime;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(volume, now + seconds);
    }

    /** Unplugs the bus once its sounds have faded. */
    close(afterSeconds) {
        setTimeout(() => {
            for (const node of this.#nodes) node.disconnect();
        }, afterSeconds * 1000);
    }

    #echo({ time, feedback, wet, tone }) {
        const ctx = this.#ctx;
        const delay = ctx.createDelay(2);
        delay.delayTime.value = time;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = tone;
        const loop = ctx.createGain();
        loop.gain.value = feedback;
        const out = ctx.createGain();
        out.gain.value = wet;
        delay.connect(filter).connect(loop).connect(delay);
        filter.connect(out).connect(this.input);
        this.#nodes.push(delay, filter, loop, out);
        return delay;
    }
}

export class Synth {
    ctx = null;
    master = null;
    effects = null;
    noise = null;
    #muted = false;
    #effectsLevel = 1;
    /** Noise needs no secrets: a seeded generator makes it, and picks where bursts start in it. */
    #rng = new Rng(NOISE_SEED);
    /** Pulse waves by duty (%), made once. */
    #pulses = new Map();

    get running() {
        return this.ctx?.state === 'running';
    }

    get muted() {
        return this.#muted;
    }

    unlock() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return;
        }
        const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Context) return;
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.#muted ? 0 : VOLUME;
        this.master.connect(this.ctx.destination);
        // sound effects and the engine go through their own volume; the music has its bus
        this.effects = this.ctx.createGain();
        this.effects.gain.value = this.#effectsLevel;
        this.effects.connect(this.master);
        this.noise = this.#makeNoise();
    }

    setMuted(muted) {
        this.#muted = muted;
        if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : VOLUME, this.ctx.currentTime, 0.02);
    }

    /** @param {number} level 0..1, the volume of the effects (and engine) */
    setEffectsLevel(level) {
        this.#effectsLevel = level;
        if (this.effects) this.effects.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
    }

    setSuspended(suspended) {
        if (!this.ctx) return;
        const action = suspended ? this.ctx.suspend() : this.ctx.resume();
        action.catch(() => {});
    }

    get now() {
        return this.ctx.currentTime;
    }

    /** @param {object[]} recipe tones and noise bursts (config/Sounds.js) */
    play(recipe) {
        if (recipe && this.running) this.schedule(recipe, this.ctx.currentTime, this.effects);
    }

    /** A recipe at a time of the audio clock, into a node (a bus's `input`). */
    schedule(recipe, time, into) {
        for (const part of recipe) {
            const start = time + (part.at ?? 0);
            if (part.n) this.#burst(start, part, into);
            else this.#tone(start, part, into);
        }
    }

    /** @param {{volume: number, into?: Bus, echo?: object}} options */
    createBus({ volume, into, echo }) {
        return new Bus(this.ctx, into?.input ?? this.master, volume, echo);
    }

    /**
     * A note of an instrument of config/Music.js: it rises, settles, holds
     * for `seconds` and fades, into the bus (and its echo if the instrument has one).
     */
    note(time, frequency, seconds, instrument, bus) {
        const { v, attack, decay, sustain, release } = instrument;
        const osc = this.ctx.createOscillator();
        this.#shape(osc, instrument.wave);
        osc.frequency.setValueAtTime(frequency, time);
        const end = time + Math.max(seconds, attack + 0.01);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(v, time + attack);
        gain.gain.setTargetAtTime(v * sustain, time + attack, decay);
        gain.gain.setTargetAtTime(0, end, release / 3);
        this.#through(osc, instrument.lowpass).connect(gain).connect(bus.input);
        if (instrument.echo && bus.send) gain.connect(bus.send);
        osc.start(time);
        osc.stop(end + release + 0.05);
        if (instrument.vibrato && seconds > instrument.vibrato.delay) this.#vibrato(osc, frequency, time, end, instrument.vibrato);
    }

    /** A looping noise source, for the engine's continuous layers. */
    noiseSource() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        return source;
    }

    #tone(start, { t, from, to, d, v }, into) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = t;
        osc.frequency.setValueAtTime(from, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + d);
        gain.gain.setValueAtTime(v, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + d);
        osc.connect(gain).connect(into);
        osc.start(start);
        osc.stop(start + d + 0.02);
    }

    #burst(start, { n, f, to = f, q = 0.8, v }, into) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = q;
        filter.frequency.setValueAtTime(f, start);
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + n);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(v, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n);
        source.connect(filter).connect(gain).connect(into);
        source.start(start, this.#rng.range(0, NOISE_SECONDS - n - 0.05));
        source.stop(start + n + 0.02);
    }

    /** 'pulse25' is a pulse wave 25% high; anything else is an oscillator type. */
    #shape(osc, wave) {
        const pulse = /^pulse(\d+)$/.exec(wave);
        if (!pulse) {
            osc.type = wave;
            return;
        }
        const duty = Number(pulse[1]);
        if (!this.#pulses.has(duty)) this.#pulses.set(duty, this.#pulseWave(duty / 100));
        osc.setPeriodicWave(this.#pulses.get(duty));
    }

    #pulseWave(duty) {
        const real = new Float32Array(PULSE_HARMONICS + 1);
        const imag = new Float32Array(PULSE_HARMONICS + 1);
        for (let n = 1; n <= PULSE_HARMONICS; n++) real[n] = (2 * Math.sin(Math.PI * n * duty)) / (Math.PI * n);
        return this.ctx.createPeriodicWave(real, imag);
    }

    #through(osc, lowpass) {
        if (!lowpass) return osc;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass;
        return osc.connect(filter);
    }

    /** The pitch starts to waver a moment into a long note. */
    #vibrato(osc, frequency, time, end, { delay, rate, depth }) {
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = rate;
        const amount = this.ctx.createGain();
        amount.gain.setValueAtTime(0, time);
        amount.gain.setValueAtTime(0, time + delay);
        amount.gain.linearRampToValueAtTime(frequency * depth, time + delay + 0.15);
        lfo.connect(amount).connect(osc.frequency);
        lfo.start(time);
        lfo.stop(end + 0.3);
    }

    #makeNoise() {
        const length = this.ctx.sampleRate * NOISE_SECONDS;
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = this.#rng.range(-1, 1);
        return buffer;
    }
}
