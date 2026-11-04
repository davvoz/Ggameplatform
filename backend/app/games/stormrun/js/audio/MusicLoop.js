import { strike } from './Instruments.js';

/** A small marimba tune, scheduled a little ahead of time so it never stutters. */

const STEP_SECONDS = 0.16;
const LOOK_AHEAD = 0.25;
const REST = 0;

// One bar per chord: C, Am, F, G. Sixteen steps a bar, frequencies in hertz.
const BASS = Object.freeze([
    [130.81, 196], [110, 164.81], [87.31, 130.81], [98, 146.83],
]);
const MELODY = Object.freeze([
    [523.25, REST, 659.25, REST, 783.99, REST, 659.25, REST, 880, REST, 783.99, REST, 659.25, REST, 587.33, REST],
    [440, REST, 523.25, REST, 659.25, REST, 523.25, REST, 587.33, REST, 523.25, REST, 440, REST, 493.88, REST],
    [349.23, REST, 440, REST, 523.25, REST, 440, REST, 587.33, REST, 523.25, REST, 440, REST, 392, REST],
    [392, REST, 493.88, REST, 587.33, REST, 493.88, REST, 659.25, REST, 587.33, REST, 493.88, REST, 587.33, REST],
]);

export class MusicLoop {
    #context;
    #output;
    #step = 0;
    #nextTime = null;

    /**
     * @param {AudioContext} context
     * @param {AudioNode} output
     */
    constructor(context, output) {
        this.#context = context;
        this.#output = output;
    }

    /** Call often: schedules the notes that are about to play. */
    update() {
        const now = this.#context.currentTime;
        if (this.#nextTime === null || this.#nextTime < now) this.#nextTime = now + 0.05;
        while (this.#nextTime < now + LOOK_AHEAD) {
            this.#play(this.#nextTime);
            this.#nextTime += STEP_SECONDS;
            this.#step = (this.#step + 1) % (MELODY.length * MELODY[0].length);
        }
    }

    #play(when) {
        const bar = Math.floor(this.#step / MELODY[0].length);
        const beat = this.#step % MELODY[0].length;
        const note = MELODY[bar][beat];
        if (note !== REST) strike(this.#context, this.#output, note, when, 0.1, 0.22);
        if (beat === 0) strike(this.#context, this.#output, BASS[bar][0], when, 0.2, 0.6);
        if (beat === 8) strike(this.#context, this.#output, BASS[bar][1], when, 0.16, 0.5);
    }
}
