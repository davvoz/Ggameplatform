/**
 * The background music, written as data: a dark chiptune loop in D minor on
 * the old epic progression Dm - Bb - F - C, one chord a bar, 16 steps a bar
 * (sixteenth notes). Two moods share it so they can swap on any step:
 *
 * - `calm` (title, results): slow bass, a soft arpeggio, the tune now and then;
 * - `fight` (the night): galloping bass, a running arpeggio, drums, the tune.
 *
 * The `boss` mood is a piece of its own (`pieceOf`), started from its top
 * when a boss is announced: Dm - Eb - Dm - A (the harmonic minor's dread),
 * a bass driving every sixteenth, a kick on every beat, and its own tune at once.
 *
 * Pure: `notesAt` says what sounds on a step, the player only plays it.
 */
export const TEMPO = 118;
export const STEPS_PER_BAR = 16;
/** Four bars of chords, played twice: the tune comes in on the second time. */
export const LOOP_STEPS = STEPS_PER_BAR * 8;

/** Each bar's chord as MIDI notes: root (low, for the bass) and the three tones. */
const CHORDS = Object.freeze([
    { bass: 38, tones: [62, 65, 69] }, // D minor
    { bass: 34, tones: [58, 62, 65] }, // B flat
    { bass: 41, tones: [65, 69, 72] }, // F
    { bass: 36, tones: [60, 64, 67] }, // C
]);

/** The boss's four bars: D minor, E flat, D minor, A major. */
const BOSS_CHORDS = Object.freeze([
    { bass: 38, tones: [62, 65, 69] }, // D minor
    { bass: 39, tones: [63, 67, 70] }, // E flat
    { bass: 38, tones: [62, 65, 69] }, // D minor
    { bass: 33, tones: [61, 64, 69] }, // A major
]);

/** The tune over the four bars: [step, MIDI note, length in steps]. */
const TUNE = Object.freeze([
    [0, 69, 4], [4, 74, 2], [6, 77, 2], [8, 76, 4], [12, 74, 4],
    [16, 77, 4], [20, 74, 2], [22, 70, 2], [24, 72, 4], [28, 74, 4],
    [32, 72, 4], [36, 69, 2], [38, 72, 2], [40, 77, 6], [46, 76, 2],
    [48, 76, 4], [52, 74, 2], [54, 72, 2], [56, 76, 8],
]);
const TUNE_BY_STEP = new Map(TUNE.map(([step, note, length]) => [step, { note, length }]));

/** The boss's tune: a hammered call that climbs each time, then falls on the A. */
const BOSS_TUNE = Object.freeze([
    [0, 74, 2], [2, 74, 1], [3, 74, 1], [4, 77, 2], [6, 76, 2], [8, 74, 4], [12, 69, 4],
    [16, 75, 2], [18, 75, 1], [19, 75, 1], [20, 79, 2], [22, 77, 2], [24, 75, 4], [28, 70, 4],
    [32, 74, 2], [34, 74, 1], [35, 74, 1], [36, 77, 2], [38, 81, 2], [40, 79, 4], [44, 77, 4],
    [48, 76, 4], [52, 73, 4], [56, 69, 8],
]);
const BOSS_TUNE_BY_STEP = new Map(BOSS_TUNE.map(([step, note, length]) => [step, { note, length }]));
/** The boss's piece is four bars long. */
const BOSS_STEPS = STEPS_PER_BAR * BOSS_CHORDS.length;
const BOSS_KICKS = new Set([0, 4, 8, 12, 14]);
/** The bass jumps up an octave on these sixteenths of the bar. */
const BOSS_LEAPS = new Set([3, 7, 11, 15]);

const ARP = [0, 1, 2, 1];
const GALLOP = new Set([0, 2, 3, 6, 8, 10, 11, 14]);
const KICKS = new Set([0, 8, 11]);
const SNARES = new Set([4, 12]);

/** The chord under a step of the loop (of the boss's piece for `boss`). */
export function chordAt(step, mood = 'fight') {
    const chords = mood === 'boss' ? BOSS_CHORDS : CHORDS;
    const bar = Math.floor(step / STEPS_PER_BAR) % chords.length;
    return chords[bar];
}

/** Which piece a mood plays: changing piece starts the new one from its top. */
export function pieceOf(mood) {
    return mood === 'boss' ? 'boss' : 'night';
}

function bassNotes(beat, chord, fight) {
    if (fight) {
        if (!GALLOP.has(beat)) return [];
        const octave = beat === 6 || beat === 14 ? 12 : 0;
        return [{ voice: 'bass', note: chord.bass + octave, length: 1 }];
    }
    return beat % 8 === 0 ? [{ voice: 'bass', note: chord.bass, length: 8 }] : [];
}

function arpNotes(step, chord, fight) {
    if (!fight && step % 2 === 1) return [];
    const index = fight ? step % ARP.length : (step / 2) % ARP.length;
    const lift = fight && step % 8 >= 4 ? 12 : 0;
    return [{ voice: 'arp', note: chord.tones[ARP[index]] + lift, length: 1 }];
}

function drumNotes(beat, fight) {
    if (!fight) return [];
    const hits = [];
    if (KICKS.has(beat)) hits.push({ voice: 'kick' });
    if (SNARES.has(beat)) hits.push({ voice: 'snare' });
    if (beat % 2 === 0) hits.push({ voice: 'hat' });
    return hits;
}

function tuneNotes(step, fight) {
    const half = LOOP_STEPS / 2;
    if (step < half) return [];
    const line = TUNE_BY_STEP.get(step - half);
    if (!line) return [];
    return [{ voice: fight ? 'lead' : 'softLead', note: line.note, length: line.length }];
}

function bossNotes(step) {
    const at = ((step % BOSS_STEPS) + BOSS_STEPS) % BOSS_STEPS;
    const beat = at % STEPS_PER_BAR;
    const chord = chordAt(at, 'boss');
    const notes = [
        { voice: 'bass', note: chord.bass + (BOSS_LEAPS.has(beat) ? 12 : 0), length: 1 },
        ...arpNotes(at, chord, true),
        { voice: 'hat' },
    ];
    if (BOSS_KICKS.has(beat)) notes.push({ voice: 'kick' });
    if (SNARES.has(beat)) notes.push({ voice: 'snare' });
    const line = BOSS_TUNE_BY_STEP.get(at);
    if (line) notes.push({ voice: 'bossLead', note: line.note, length: line.length });
    return notes;
}

/**
 * What sounds on one step.
 * @param {number} step any step count (it wraps on the loop)
 * @param {'calm'|'fight'|'boss'} mood
 * @returns {{voice: string, note?: number, length?: number}[]} lengths in steps
 */
export function notesAt(step, mood) {
    if (mood === 'boss') return bossNotes(step);
    const at = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
    const beat = at % STEPS_PER_BAR;
    const chord = chordAt(at);
    const fight = mood === 'fight';
    return [
        ...bassNotes(beat, chord, fight),
        ...arpNotes(at, chord, fight),
        ...drumNotes(beat, fight),
        ...tuneNotes(at, fight),
    ];
}

/** Seconds per step at the tempo. */
export const STEP_TIME = 60 / TEMPO / 4;

export function frequency(note) {
    return 440 * 2 ** ((note - 69) / 12);
}
