/**
 * The sounds that never stop while racing: the engine (two oscillators
 * through a filter that opens with the revs, a note rising through each
 * gear and dropping at the shift, higher on nitro), the tyres hissing in a
 * slide and squealing (a warbling note) in a hard turn, the grass rumbling, the wind, the nearest rival's engine heard on
 * its side, and the weather (the hiss of rain). Built once at the first
 * race; between races it is silent.
 */
const EASE = 0.04;
const RUMBLE_SHAKE = 22;

export class EngineSound {
    #synth;
    #engine;
    #nodes = null;

    /** @param {import('./Synth.js').Synth} synth @param {typeof import('../config/Sounds.js').ENGINE} engine */
    constructor(synth, engine) {
        this.#synth = synth;
        this.#engine = engine;
    }

    /**
     * @param {import('./engineState.js').EngineState} state
     * @param {number} clock seconds, for the grass's shaking
     */
    update(state, clock) {
        if (!this.#synth.running) return;
        this.#nodes ??= this.#build();
        const e = this.#engine;
        const n = this.#nodes;
        const at = this.#synth.ctx.currentTime;
        const set = (param, value) => param.setTargetAtTime(value, at, EASE);

        const note = (e.pitch[0] + (e.pitch[1] - e.pitch[0]) * state.revs) * (state.boosting ? e.nitroPitch : 1);
        set(n.low.frequency, note);
        set(n.high.frequency, note * 2);
        set(n.filter.frequency, e.brightness[0] + (e.brightness[1] - e.brightness[0]) * state.revs);
        set(n.engine.gain, volumeOf(state, e.volume));
        set(n.skid.gain, state.skid * e.skid.v);
        set(n.squeal.gain, state.squeal * e.squeal.v);
        set(n.squealTone.frequency, e.squeal.f + e.squeal.rise * state.squeal);
        set(n.rumble.gain, state.rumble * e.rumble.v * (0.6 + 0.4 * Math.sin(clock * RUMBLE_SHAKE)));
        set(n.wind.gain, state.wind * e.wind.v * (state.boosting ? 2 : 1));
        const rival = state.rival;
        set(n.rival.gain, rival ? rival.near * rival.near * e.rivalVolume : 0);
        if (rival) {
            set(n.rivalTone.frequency, (e.pitch[0] + (e.pitch[1] - e.pitch[0]) * rival.revs) * 1.5);
            set(n.pan.pan, rival.pan);
        }
        const ambience = state.ambience;
        set(n.ambience.gain, ambience ? ambience.v : 0);
        if (ambience) {
            set(n.ambienceFilter.frequency, ambience.f);
            set(n.ambienceFilter.Q, ambience.q);
        }
    }

    /** Fades everything out (a pause, the end of a race, a menu). */
    silence() {
        if (!this.#nodes) return;
        const at = this.#synth.ctx.currentTime;
        const { engine, skid, squeal, rumble, wind, rival, ambience } = this.#nodes;
        for (const gain of [engine, skid, squeal, rumble, wind, rival, ambience]) {
            gain.gain.setTargetAtTime(0, at, 0.08);
        }
    }

    #build() {
        const { ctx, effects } = this.#synth;
        const gain = () => {
            const node = ctx.createGain();
            node.gain.value = 0;
            node.connect(effects);
            return node;
        };
        const engine = gain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 4;
        filter.connect(engine);
        const low = this.#oscillator('sawtooth', filter);
        const high = this.#oscillator('square', filter, 0.35);

        const skid = gain();
        this.#noise('bandpass', this.#engine.skid.f, skid, this.#engine.skid.q);
        const squeal = gain();
        const squealTone = this.#squeal(squeal);
        const rumble = gain();
        this.#noise('lowpass', this.#engine.rumble.f, rumble);
        const wind = gain();
        this.#noise('highpass', this.#engine.wind.f, wind);

        const rival = gain();
        const pan = ctx.createStereoPanner();
        pan.connect(rival);
        const rivalTone = this.#oscillator('triangle', pan);

        const ambience = gain();
        const ambienceFilter = this.#noise('bandpass', 1000, ambience);
        return { engine, filter, low, high, skid, squeal, squealTone, rumble, wind, rival, pan, rivalTone, ambience, ambienceFilter };
    }

    /** A sawtooth through a bandpass, its pitch wobbled fast by a second oscillator: the squeal. */
    #squeal(into) {
        const { ctx } = this.#synth;
        const { f, bright, wobble } = this.#engine.squeal;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = bright;
        filter.Q.value = 1.5;
        filter.connect(into);
        const tone = this.#oscillator('sawtooth', filter);
        tone.frequency.value = f;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = wobble.rate;
        const depth = ctx.createGain();
        depth.gain.value = wobble.depth;
        lfo.connect(depth).connect(tone.frequency);
        lfo.start();
        return tone;
    }

    #oscillator(type, into, level = 1) {
        const { ctx } = this.#synth;
        const osc = ctx.createOscillator();
        osc.type = type;
        const gain = ctx.createGain();
        gain.gain.value = level;
        osc.connect(gain).connect(into);
        osc.start();
        return osc;
    }

    #noise(type, frequency, into, q = 0.7) {
        const { ctx } = this.#synth;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        const source = this.#synth.noiseSource();
        source.connect(filter).connect(into);
        source.start();
        return filter;
    }
}

function volumeOf(state, volume) {
    if (state.throttle || state.boosting) return volume.throttle;
    return state.revs > 0.05 ? volume.coast : volume.idle;
}
