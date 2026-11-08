/**
 * A tiny tracker: songs are note lists, played by square lead, triangle bass
 * and noise drums, scheduled slightly ahead on the audio clock so timing never
 * depends on the frame rate. All tunes are original.
 *
 * Notes are MIDI numbers, 0 is a rest, -1 holds the previous note.
 * Drums: k kick, s snare, h hat, . nothing.
 */

const _ = -1;

/** A 6/8 tarantella in A minor for the streets of the town. */
const TOWN = {
    step: 0.13,
    lead: [
        76, 76, 76, 77, 76, 74, 72, 72, 72, 74, 72, 71, 69, 72, 76, 81, _, 79, 77, _, 76, 74, _, _,
        74, 74, 74, 76, 74, 72, 71, 71, 71, 72, 71, 69, 68, 71, 76, 80, _, 76, 81, _, 76, 69, _, _,
        81, 81, 81, 83, 81, 79, 77, 77, 77, 79, 77, 76, 74, 77, 81, 84, _, 83, 81, _, 79, 77, _, _,
        76, _, 77, 76, _, 74, 72, _, 74, 72, _, 71, 69, 71, 72, 74, 76, 80, 81, _, _, 0, 0, 0,
    ],
    bass: [
        45, 0, 0, 52, 0, 0, 45, 0, 0, 52, 0, 0, 45, 0, 0, 52, 0, 0, 50, 0, 0, 45, 0, 0,
        50, 0, 0, 45, 0, 0, 45, 0, 0, 52, 0, 0, 40, 0, 0, 47, 0, 0, 45, 0, 0, 52, 0, 0,
        53, 0, 0, 48, 0, 0, 50, 0, 0, 45, 0, 0, 50, 0, 0, 45, 0, 0, 52, 0, 0, 47, 0, 0,
        45, 0, 0, 52, 0, 0, 48, 0, 0, 52, 0, 0, 45, 0, 0, 40, 0, 0, 45, 0, 0, 45, 0, 0,
    ],
    drums: 'k.hs.h',
};

/** A swinging minor tune for the harbour at night. */
const HARBOR = {
    step: 0.14,
    lead: [
        74, _, _, 77, _, _, 81, _, 79, _, 77, _, 76, _, _, _,
        77, _, _, 76, _, _, 74, _, 72, _, 74, _, 69, _, _, _,
        70, _, _, 74, _, _, 77, _, 76, _, 74, _, 73, _, _, _,
        74, _, _, _, 69, _, _, _, 74, _, 76, _, 77, _, 76, _,
    ],
    bass: [
        38, 0, 45, 0, 38, 0, 45, 0, 41, 0, 45, 0, 36, 0, 43, 0,
        41, 0, 48, 0, 41, 0, 48, 0, 38, 0, 45, 0, 33, 0, 40, 0,
        34, 0, 41, 0, 34, 0, 41, 0, 33, 0, 40, 0, 33, 0, 37, 0,
        38, 0, 45, 0, 38, 0, 45, 0, 38, 0, 45, 0, 33, 0, 37, 0,
    ],
    drums: 'k.h.s.hhk.h.s.h.',
};

/** A pompous march for the palace, a little too proud of itself. */
const PALACE = {
    step: 0.115,
    lead: [
        67, _, 72, _, 72, _, 76, _, 79, _, _, _, 76, _, 72, _,
        77, _, 81, _, 79, _, 77, _, 76, _, 74, _, 72, _, _, _,
        74, _, 77, _, 76, _, 74, _, 72, _, 71, _, 72, _, 74, _,
        79, _, 79, 79, 79, _, 77, _, 76, _, 74, _, 72, _, _, _,
    ],
    bass: [
        48, 0, 43, 0, 48, 0, 43, 0, 48, 0, 43, 0, 48, 0, 43, 0,
        41, 0, 48, 0, 43, 0, 50, 0, 48, 0, 43, 0, 48, 0, 43, 0,
        43, 0, 50, 0, 48, 0, 43, 0, 45, 0, 40, 0, 41, 0, 43, 0,
        43, 0, 43, 0, 43, 0, 43, 0, 48, 0, 43, 0, 48, 0, 0, 0,
    ],
    drums: 'k.s.k.s.k.s.ssss',
};

/** Fast and driving, for every boss. */
const BOSS = {
    step: 0.095,
    lead: [
        76, _, _, 74, _, _, 71, _, 76, _, _, 79, _, 78, _, _,
        76, _, _, 74, _, _, 71, _, 69, _, 71, _, 72, _, 71, _,
        72, _, _, 71, _, _, 69, _, 72, _, _, 76, _, 74, _, _,
        71, _, _, 72, _, _, 74, _, 75, _, _, _, 71, _, _, _,
    ],
    bass: [
        40, 40, 52, 40, 40, 52, 40, 52, 40, 40, 52, 40, 40, 52, 40, 52,
        40, 40, 52, 40, 40, 52, 40, 52, 38, 38, 50, 38, 38, 50, 38, 50,
        36, 36, 48, 36, 36, 48, 36, 48, 36, 36, 48, 36, 36, 48, 36, 48,
        35, 35, 47, 35, 35, 47, 35, 47, 35, 35, 47, 35, 39, 39, 47, 39,
    ],
    drums: 'k.hsk.hsk.hsk.ss',
};

/** The last fight: the boss theme's darker cousin. */
const FINAL = {
    step: 0.09,
    lead: [
        74, _, 77, _, 81, _, 80, _, 81, _, 77, _, 74, _, _, _,
        70, _, 74, _, 77, _, 76, _, 77, _, 74, _, 70, _, _, _,
        72, _, 76, _, 79, _, 78, _, 79, _, 76, _, 72, _, 73, _,
        74, _, _, _, 81, _, _, _, 86, _, _, _, 85, _, _, _,
    ],
    bass: [
        38, 38, 50, 38, 38, 50, 38, 50, 38, 38, 50, 38, 38, 50, 38, 50,
        34, 34, 46, 34, 34, 46, 34, 46, 34, 34, 46, 34, 34, 46, 34, 46,
        36, 36, 48, 36, 36, 48, 36, 48, 36, 36, 48, 36, 37, 37, 49, 37,
        38, 38, 50, 38, 38, 50, 38, 50, 37, 37, 49, 37, 37, 49, 37, 49,
    ],
    drums: 'k.hsk.hskkhsk.ss',
};

/** The ice cream van's jingle, far too cheerful. */
const JINGLE = {
    step: 0.13,
    lead: [84, 88, 91, 88, 84, _, 86, 89, 93, 89, 86, _, 88, 91, 96, 91, 88, 86, 84, _, _, 0, 0, 0],
    bass: [48, 0, 0, 55, 0, 0, 50, 0, 0, 57, 0, 0, 48, 0, 0, 55, 0, 0, 48, 0, 0, 0, 0, 0],
    drums: '..h..h',
    leadType: 'triangle',
};

/** Title: the town tune, slower and grander. */
const TITLE = { ...TOWN, step: 0.16, drums: 'k..s..' };

const SONGS = { town: TOWN, harbor: HARBOR, palace: PALACE, boss: BOSS, final: FINAL, jingle: JINGLE, title: TITLE };

const LOOKAHEAD = 0.15;

export class Music {
    #a;
    #song = null;
    #name = '';
    #step = 0;
    #next = 0;
    #timer = 0;

    /** @param {import('./AudioEngine.js').AudioEngine} engine */
    constructor(engine) {
        this.#a = engine;
    }

    get playing() {
        return this.#name;
    }

    play(name) {
        if (name === this.#name || !SONGS[name]) return;
        this.#name = name;
        this.#song = SONGS[name];
        this.#step = 0;
        this.#next = this.#a.now + 0.08;
        if (!this.#timer) this.#timer = setInterval(() => this.#schedule(), 40);
    }

    stop() {
        this.#name = '';
        this.#song = null;
    }

    #schedule() {
        const a = this.#a;
        if (!a.ready || !this.#song) return;
        const song = this.#song;
        if (this.#next < a.now) this.#next = a.now + 0.02;
        while (this.#next < a.now + LOOKAHEAD) {
            this.#playStep(song, this.#step, this.#next);
            this.#next += song.step;
            this.#step = (this.#step + 1) % song.lead.length;
        }
    }

    #playStep(song, i, t) {
        const lead = song.lead[i];
        if (lead > 0) this.#note(song.leadType ?? 'square', lead, t, this.#hold(song.lead, i) * song.step * 0.92, 0.075);
        const bass = song.bass[i % song.bass.length];
        if (bass > 0) this.#note('triangle', bass, t, song.step * 1.6, 0.26);
        const d = song.drums[i % song.drums.length];
        if (d === 'k') this.#kick(t);
        else if (d === 's') this.#snare(t);
        else if (d === 'h') this.#hat(t);
    }

    #hold(list, i) {
        let n = 1;
        while (list[(i + n) % list.length] === _ && n < 8) n++;
        return n;
    }

    #note(type, midi, t, dur, vol) {
        const ctx = this.#a.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.setTargetAtTime(vol * 0.55, t + 0.03, 0.08);
        g.gain.setTargetAtTime(0, t + dur, 0.03);
        o.connect(g).connect(this.#a.music);
        o.start(t);
        o.stop(t + dur + 0.2);
    }

    #kick(t) {
        const ctx = this.#a.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(g).connect(this.#a.music);
        o.start(t);
        o.stop(t + 0.16);
    }

    #snare(t) {
        this.#hit(t, 'bandpass', 1800, 0.12, 0.3);
    }

    #hat(t) {
        this.#hit(t, 'highpass', 7000, 0.035, 0.12);
    }

    #hit(t, type, freq, dur, vol) {
        const ctx = this.#a.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.#a.noise;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f).connect(g).connect(this.#a.music);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur + 0.02);
    }
}
