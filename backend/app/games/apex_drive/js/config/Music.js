/**
 * The background music: instruments and songs, synthesised like the sound
 * effects (no files to load). audio/score.js reads the patterns: one token a
 * sixteenth note, a note (`A4`), `-` to hold it, `.` for silence; drums take
 * the letters of the kit.
 *
 * A song for a new world: an entry in SONGS and its id as the world's
 * `music` (config/Worlds.js); a track can have a song of its own the same way.
 * Each channel of a section plays the instrument of the same name.
 */

export const MUSIC = {
    /** Music under the sound effects, 0..1 of the master volume. */
    volume: 0.75,
    /** Share of the volume left while the game is paused. */
    duck: 0.35,
    duckFade: 0.25,
    /** Seconds a song fades in and out, and the silence before a new one. */
    fadeIn: 1.2,
    fadeOut: 0.9,
    gap: 0.35,
    /** Seconds of notes booked ahead of the clock: covers a slow frame. */
    lookahead: 0.3,
};

export const INSTRUMENTS = {
    /** The tune of the race: a thin pulse, a touch of vibrato on long notes. */
    lead: {
        wave: 'pulse25', v: 0.075, attack: 0.004, decay: 0.09, sustain: 0.65, release: 0.06, echo: true,
        vibrato: { delay: 0.2, rate: 5.5, depth: 0.007 },
    },
    /** The tune of the menus: soft and round. */
    bell: {
        wave: 'triangle', v: 0.16, attack: 0.004, decay: 0.25, sustain: 0.45, release: 0.18, echo: true,
        vibrato: { delay: 0.25, rate: 5, depth: 0.005 },
    },
    arp: { wave: 'pulse12', v: 0.032, attack: 0.002, decay: 0.05, sustain: 0.35, release: 0.03, echo: true },
    bass: { wave: 'square', v: 0.085, attack: 0.003, decay: 0.07, sustain: 0.8, release: 0.04, lowpass: 900 },
    drums: {
        kit: {
            k: [{ t: 'sine', from: 160, to: 45, d: 0.14, v: 0.5 }],
            s: [{ n: 0.13, f: 1700, to: 1200, q: 0.7, v: 0.3 }, { t: 'triangle', from: 230, to: 160, d: 0.07, v: 0.16 }],
            h: [{ n: 0.03, f: 8000, q: 1.2, v: 0.09 }],
            o: [{ n: 0.16, f: 7000, q: 1, v: 0.07 }],
        },
    },
};

// ---- helpers to write bars: one bar = 16 sixteenths

const BAR = 16;

/** The same note an octave up. */
function up(note) {
    return note.replace(/-?\d$/, (octave) => String(Number(octave) + 1));
}

function bars(...list) {
    return list.join(' | ');
}

function rest(count = 1) {
    return bars(...Array.from({ length: count }, () => new Array(BAR).fill('.').join(' ')));
}

/** Bass on eighths, jumping the octave. */
function octaveBass(root) {
    const high = up(root);
    return `${root} - ${high} . `.repeat(4).trim();
}

/** Bass off the beat, for the menus. */
function funkBass(root) {
    const high = up(root);
    return `${root} - - . ${root} - . ${high} . . ${root} - . ${high} - .`;
}

/** The chord's notes up and down, one every `every` sixteenths. */
function arp(chord, every = 1) {
    const order = [...chord.keys(), ...[...chord.keys()].slice(1, -1).reverse()];
    return Array.from({ length: BAR }, (_, step) => (step % every ? '-' : chord[order[(step / every) % order.length]])).join(' ');
}

/** One bar per chord, each made by `make` from the chord's entry. */
function perChord(chords, make) {
    return bars(...chords.map(make));
}

// ---- SUNSET RUN: the race on the coast, A minor, driving

const RUN = {
    Am: { arp: ['A4', 'C5', 'E5'], root: 'A2' },
    F: { arp: ['F4', 'A4', 'C5'], root: 'F2' },
    C: { arp: ['C5', 'E5', 'G5'], root: 'C3' },
    G: { arp: ['G4', 'B4', 'D5'], root: 'G2' },
    E: { arp: ['E4', 'G#4', 'B4'], root: 'E2' },
    Dm: { arp: ['D4', 'F4', 'A4'], root: 'D3' },
    Em: { arp: ['E4', 'G4', 'B4'], root: 'E2' },
};
const VERSE = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'].map((name) => RUN[name]);
const CHORUS = ['F', 'G', 'Am', 'Am', 'F', 'G', 'C', 'E'].map((name) => RUN[name]);
const BRIDGE = ['Dm', 'Em', 'F', 'G'].map((name) => RUN[name]);
const BEAT = {
    plain: 'k . h . s . h . k . h k s . h .',
    drive: 'k . h k s . h . k k h . s . o .',
    fill: 'k . h . s . h . s . s s s s s s',
    open: 'k . o . s . h k k . o . s . h .',
    sparse: 'k . h . . . h . k . h . s . h h',
};

const sunsetRun = {
    bpm: 152,
    echo: { steps: 3, feedback: 0.28, wet: 0.22, tone: 2600 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge'],
    loopFrom: 1,
    sections: {
        intro: {
            bass: bars(octaveBass('A2'), octaveBass('A2')),
            drums: bars('k . . . k . . . k . . . k . k .', 's . s . s . s . s s s s s s s s'),
        },
        verse: {
            lead: bars(
                'E5 - - - A5 - - - G5 - E5 - D5 - E5 -',
                'C5 - - - - - A4 - C5 - D5 - - - . .',
                'E5 - - - G5 - - - E5 - D5 - C5 - D5 -',
                'B4 - - - - - - - D5 - - - G4 - . .',
                'E5 - - - A5 - - - B5 - A5 - G5 - A5 -',
                'C6 - - - - - A5 - G5 - F5 - - - . .',
                'E5 - G5 - E5 - C5 - D5 - E5 - G5 - - -',
                'B5 - - - - - - - A5 - G5 - D5 - . .',
            ),
            arp: perChord(VERSE, (chord) => arp(chord.arp)),
            bass: perChord(VERSE, (chord) => octaveBass(chord.root)),
            drums: bars(BEAT.plain, BEAT.plain, BEAT.plain, BEAT.drive, BEAT.plain, BEAT.plain, BEAT.plain, BEAT.fill),
        },
        chorus: {
            lead: bars(
                'A5 - - - C6 - - - A5 - - - F5 - G5 -',
                'G5 - - - - - - - D5 - G5 - B5 - D6 -',
                'C6 - - - - - - - B5 - A5 - - - E5 -',
                'A5 - - - - - - - - - - - . . . .',
                'A5 - - - C6 - - - A5 - - - F5 - G5 -',
                'G5 - - - - - - - D5 - G5 - B5 - D6 -',
                'E6 - - - D6 - C6 - - - G5 - E5 - G5 -',
                'G#5 - - - - - - - B5 - - - E6 - - -',
            ),
            arp: perChord(CHORUS, (chord) => arp(chord.arp.map(up))),
            bass: perChord(CHORUS, (chord) => octaveBass(chord.root)),
            drums: bars(BEAT.open, BEAT.drive, BEAT.open, BEAT.drive, BEAT.open, BEAT.drive, BEAT.open, BEAT.fill),
        },
        bridge: {
            arp: perChord(BRIDGE, (chord) => arp(chord.arp, 2)),
            bass: perChord(BRIDGE, (chord) => octaveBass(chord.root)),
            drums: bars(BEAT.sparse, BEAT.sparse, BEAT.sparse, BEAT.fill),
        },
    },
};

// ---- PIT LANE: title, garage and results, C major, laid back

const PIT = {
    C: { arp: ['C4', 'E4', 'G4', 'B4'], root: 'C2' },
    Am: { arp: ['A3', 'C4', 'E4', 'G4'], root: 'A1' },
    Dm: { arp: ['D4', 'F4', 'A4', 'C5'], root: 'D2' },
    G: { arp: ['G3', 'B3', 'D4', 'F4'], root: 'G1' },
};
const ROUND = ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G'].map((name) => PIT[name]);
const GROOVE = 'k . h . s . h k . k h . s . h .';
const GROOVE_END = 'k . h . s . h k . k h . s s s s';

const pitLane = {
    bpm: 112,
    echo: { steps: 3, feedback: 0.3, wet: 0.25, tone: 2200 },
    order: ['tune', 'groove'],
    loopFrom: 0,
    sections: {
        tune: {
            bell: bars(
                'E5 - - - G5 - - - C6 - - - B5 - G5 -',
                'A5 - - - - - - - . . E5 - G5 - A5 -',
                'F5 - - - A5 - - - D6 - - - C6 - A5 -',
                'B5 - - - - - - - . . . . . . . .',
                'E5 - - - G5 - - - C6 - - - D6 - E6 -',
                'C6 - - - - - - - A5 - - - . . . .',
                'F5 - A5 - D6 - C6 - - - A5 - F5 - G5 -',
                'G5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(ROUND, (chord) => arp(chord.arp, 2)),
            bass: perChord(ROUND, (chord) => funkBass(chord.root)),
            drums: bars(GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE_END),
        },
        groove: {
            bell: rest(8),
            arp: perChord(ROUND, (chord) => arp(chord.arp.map(up), 2)),
            bass: perChord(ROUND, (chord) => funkBass(chord.root)),
            drums: bars(GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE_END),
        },
    },
};

// ---- NIGHT DRIVE: the city at night, E minor, synthwave pulse

/** Bass pumping eighths on one note, the way the synth records of the night did it. */
function pumpBass(root) {
    return `${root} . `.repeat(8).trim();
}

const NIGHT = {
    Em: { arp: ['E4', 'G4', 'B4'], root: 'E2' },
    C: { arp: ['E4', 'G4', 'C5'], root: 'C3' },
    G: { arp: ['D4', 'G4', 'B4'], root: 'G2' },
    D: { arp: ['D4', 'F#4', 'A4'], root: 'D3' },
    Am: { arp: ['E4', 'A4', 'C5'], root: 'A2' },
    B: { arp: ['D#4', 'F#4', 'B4'], root: 'B2' },
};
const NIGHT_VERSE = ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D'].map((name) => NIGHT[name]);
const NIGHT_CHORUS = ['Am', 'C', 'D', 'B', 'Am', 'C', 'D', 'B'].map((name) => NIGHT[name]);
const PULSE = {
    beat: 'k . h . s . h . k . h . s . h .',
    push: 'k . h . s . h k k . h . s . o .',
    fill: 'k . h . s . h . s . s . s s s s',
};

const nightDrive = {
    bpm: 140,
    echo: { steps: 3, feedback: 0.35, wet: 0.28, tone: 2400 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus'],
    loopFrom: 1,
    sections: {
        intro: {
            arp: bars(arp(NIGHT.Em.arp, 2), arp(NIGHT.C.arp, 2), arp(NIGHT.G.arp, 2), arp(NIGHT.D.arp, 2)),
            bass: bars(pumpBass('E2'), pumpBass('C3'), pumpBass('G2'), pumpBass('D3')),
            drums: bars('k . . . k . . . k . . . k . . .', 'k . . . k . . . k . . . k . . .', 'k . h . k . h . k . h . k . h .', PULSE.fill),
        },
        verse: {
            lead: bars(
                'B4 - - - E5 - - - G5 - F#5 - E5 - D5 -',
                'E5 - - - - - - - G5 - - - E5 - . .',
                'D5 - - - G5 - - - B5 - A5 - G5 - D5 -',
                'F#5 - - - - - - - . . A5 - F#5 - D5 -',
                'B4 - - - E5 - - - G5 - A5 - B5 - - -',
                'C6 - - - B5 - - - G5 - - - E5 - . .',
                'D5 - G5 - B5 - D6 - - - B5 - A5 - G5 -',
                'F#5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(NIGHT_VERSE, (chord) => arp(chord.arp)),
            bass: perChord(NIGHT_VERSE, (chord) => pumpBass(chord.root)),
            drums: bars(PULSE.beat, PULSE.beat, PULSE.beat, PULSE.push, PULSE.beat, PULSE.beat, PULSE.beat, PULSE.fill),
        },
        chorus: {
            lead: bars(
                'A5 - - - - - C6 - - - B5 - A5 - E5 -',
                'G5 - - - - - - - E5 - G5 - C6 - - -',
                'D6 - - - - - C6 - - - B5 - A5 - F#5 -',
                'D#6 - - - - - - - B5 - - - F#5 - - -',
                'A5 - - - - - C6 - - - B5 - A5 - E5 -',
                'G5 - - - - - - - E5 - G5 - C6 - - -',
                'D6 - - - C6 - - - D6 - E6 - F#6 - - -',
                'D#6 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(NIGHT_CHORUS, (chord) => arp(chord.arp.map(up))),
            bass: perChord(NIGHT_CHORUS, (chord) => pumpBass(chord.root)),
            drums: bars(PULSE.push, PULSE.push, PULSE.push, PULSE.fill, PULSE.push, PULSE.push, PULSE.push, PULSE.fill),
        },
    },
};

// ---- POLAR LIGHTS: the frozen north under the aurora, D minor, wide and icy

const POLAR = {
    Dm: { arp: ['D4', 'F4', 'A4'], root: 'D3' },
    Bb: { arp: ['D4', 'F4', 'Bb4'], root: 'Bb2' },
    F: { arp: ['C4', 'F4', 'A4'], root: 'F2' },
    C: { arp: ['C4', 'E4', 'G4'], root: 'C3' },
    Gm: { arp: ['D4', 'G4', 'Bb4'], root: 'G2' },
    A: { arp: ['C#4', 'E4', 'A4'], root: 'A2' },
};
const POLAR_VERSE = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'].map((name) => POLAR[name]);
const POLAR_CHORUS = ['Gm', 'Bb', 'C', 'A', 'Gm', 'Bb', 'C', 'A'].map((name) => POLAR[name]);
const POLAR_BRIDGE = ['Bb', 'C', 'Dm', 'A'].map((name) => POLAR[name]);
/** The arpeggios ring an octave up, like ice. */
const sparkle = (chord, every = 1) => arp(chord.arp.map(up), every);

const polarLights = {
    bpm: 146,
    echo: { steps: 3, feedback: 0.4, wet: 0.32, tone: 3000 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge'],
    loopFrom: 1,
    sections: {
        intro: {
            arp: bars(sparkle(POLAR.Dm, 2), sparkle(POLAR.Bb, 2), sparkle(POLAR.F, 2), sparkle(POLAR.C, 2)),
            bass: bars(octaveBass('D3'), octaveBass('Bb2'), octaveBass('F2'), octaveBass('C3')),
            drums: bars(BEAT.sparse, BEAT.sparse, BEAT.plain, BEAT.fill),
        },
        verse: {
            lead: bars(
                'A4 - - - D5 - - - F5 - E5 - D5 - A4 -',
                'Bb4 - - - - - D5 - F5 - - - D5 - . .',
                'C5 - - - F5 - - - A5 - G5 - F5 - C5 -',
                'E5 - - - - - - - G5 - - - C5 - . .',
                'A4 - - - D5 - - - F5 - G5 - A5 - - -',
                'Bb5 - - - A5 - - - F5 - - - D5 - . .',
                'C5 - F5 - A5 - C6 - - - A5 - G5 - F5 -',
                'E5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(POLAR_VERSE, (chord) => sparkle(chord, 2)),
            bass: perChord(POLAR_VERSE, (chord) => octaveBass(chord.root)),
            drums: bars(BEAT.plain, BEAT.plain, BEAT.plain, BEAT.drive, BEAT.plain, BEAT.plain, BEAT.plain, BEAT.fill),
        },
        chorus: {
            lead: bars(
                'D5 - - - G5 - - - Bb5 - - - A5 - G5 -',
                'F5 - - - - - D5 - - - F5 - Bb5 - - -',
                'C6 - - - - - Bb5 - - - A5 - G5 - E5 -',
                'C#6 - - - - - - - A5 - - - E5 - - -',
                'D5 - - - G5 - - - Bb5 - - - A5 - G5 -',
                'F5 - - - - - D5 - - - F5 - Bb5 - - -',
                'C6 - - - D6 - - - E6 - - - G6 - - -',
                'A5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(POLAR_CHORUS, (chord) => sparkle(chord)),
            bass: perChord(POLAR_CHORUS, (chord) => pumpBass(chord.root)),
            drums: bars(BEAT.drive, BEAT.drive, BEAT.drive, BEAT.fill, BEAT.drive, BEAT.drive, BEAT.open, BEAT.fill),
        },
        bridge: {
            arp: perChord(POLAR_BRIDGE, (chord) => arp(chord.arp, 2)),
            bass: perChord(POLAR_BRIDGE, (chord) => octaveBass(chord.root)),
            drums: bars(BEAT.sparse, BEAT.sparse, BEAT.sparse, BEAT.fill),
        },
    },
};

export const SONGS = {
    pitLane,
    sunsetRun,
    nightDrive,
    polarLights,
};

/** The song of the menus (title, worlds, tracks, garage, results). */
export const MENU_SONG = 'pitLane';
