/**
 * Songs are written like a tracker's patterns (config/Music.js): one token
 * per sixteenth note, `|` between bars only for the eye.
 * - a note, `C4`, `F#5`, `Bb3`: it starts here;
 * - `-`: the note before goes on;
 * - `.`: silence;
 * - on a drum channel, letters of the kit, `k`, `s`, `kh`: hits at once.
 * `compileSong` turns a song into one list of sounds per step, checked
 * against the instruments, so a typo fails on load and not mid-race.
 */

const STEPS_PER_BEAT = 4;
const HOLD = '-';
const REST = '.';
const BAR_LINE = '|';
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTALS = { '': 0, '#': 1, b: -1 };

/** MIDI number of a note name: A4 = 69. */
export function midiOf(name) {
    const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!match) throw new Error(`Not a note: ${name}`);
    const [, letter, accidental, octave] = match;
    return 12 * (Number(octave) + 1) + SEMITONES[letter] + ACCIDENTALS[accidental];
}

export function frequencyOf(midi) {
    return 440 * 2 ** ((midi - 69) / 12);
}

/** @returns {{length: number, events: {step: number, token: string, steps: number}[]}} */
export function parsePattern(text) {
    const tokens = text.split(/\s+/).filter((token) => token && token !== BAR_LINE);
    const events = [];
    let open = null;
    tokens.forEach((token, step) => {
        if (token === HOLD) {
            if (open) open.steps++;
            return;
        }
        open = token === REST ? null : { step, token, steps: 1 };
        if (open) events.push(open);
    });
    return { length: tokens.length, events };
}

/**
 * @typedef {{channel: string, frequency: number, steps: number} | {channel: string, hit: string}} SongEvent
 * @typedef {{id: string, bpm: number, stepSeconds: number, steps: number, loopStep: number,
 *   events: SongEvent[][], echo: object | null}} CompiledSong
 * @returns {CompiledSong}
 */
export function compileSong(id, song, instruments) {
    const events = [];
    let loopStep = 0;
    song.order.forEach((name, index) => {
        if (index === song.loopFrom) loopStep = events.length;
        addSection(events, song.sections[name], instruments, `${id}.${name}`);
    });
    if (song.loopFrom >= song.order.length) throw new Error(`${id}: loopFrom past the end`);
    return {
        id,
        bpm: song.bpm,
        stepSeconds: 60 / song.bpm / STEPS_PER_BEAT,
        steps: events.length,
        loopStep,
        events,
        echo: song.echo ?? null,
    };
}

/** The step `count` steps after `step`, going round the song's loop. */
export function nextStep(song, step, count = 1) {
    const ahead = step + count;
    if (ahead < song.steps) return ahead;
    return song.loopStep + ((ahead - song.steps) % (song.steps - song.loopStep));
}

function addSection(events, section, instruments, where) {
    if (!section) throw new Error(`${where}: no such section`);
    const channels = Object.entries(section).map(([channel, text]) => ({ channel, instrument: instrumentOf(instruments, channel, where), ...parsePattern(text) }));
    const length = channels[0]?.length ?? 0;
    if (length === 0 || channels.some((c) => c.length !== length)) throw new Error(`${where}: channels of different lengths`);
    const offset = events.length;
    for (let i = 0; i < length; i++) events.push([]);
    for (const { channel, instrument, events: notes } of channels) {
        for (const note of notes) events[offset + note.step].push(...soundsOf(channel, instrument, note, where));
    }
}

function instrumentOf(instruments, channel, where) {
    const instrument = instruments[channel];
    if (!instrument) throw new Error(`${where}: no instrument ${channel}`);
    return instrument;
}

function soundsOf(channel, instrument, note, where) {
    if (!instrument.kit) return [{ channel, frequency: frequencyOf(midiOf(note.token)), steps: note.steps }];
    return [...note.token].map((hit) => {
        if (!instrument.kit[hit]) throw new Error(`${where}: no drum ${hit}`);
        return { channel, hit };
    });
}
