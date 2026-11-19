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

// ---- VOID RUN: the hostile planet, E phrygian, fast and heavy

const VOID = {
    Em: { arp: ['E4', 'G4', 'B4'], root: 'E2' },
    F: { arp: ['F4', 'A4', 'C5'], root: 'F2' },
    G: { arp: ['G4', 'B4', 'D5'], root: 'G2' },
    D: { arp: ['D4', 'F#4', 'A4'], root: 'D3' },
    C: { arp: ['C4', 'E4', 'G4'], root: 'C3' },
    B: { arp: ['B3', 'D#4', 'F#4'], root: 'B2' },
    Bb: { arp: ['Bb3', 'D4', 'F4'], root: 'Bb2' },
};
const VOID_VERSE = ['Em', 'F', 'Em', 'F', 'Em', 'F', 'G', 'F'].map((name) => VOID[name]);
const VOID_CHORUS = ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((name) => VOID[name]);
const VOID_BRIDGE = ['Bb', 'C', 'D', 'B'].map((name) => VOID[name]);
const STOMP = {
    beat: 'k . h k s . h . k k h . s . h k',
    drive: 'k . k . s . h k k . k . s . o .',
    fill: 'k . s . k s s . s s s s s s s s',
    sparse: 'k . . . s . . . k . . . s . h h',
};

const voidRun = {
    bpm: 164,
    echo: { steps: 3, feedback: 0.3, wet: 0.24, tone: 2000 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge'],
    loopFrom: 1,
    sections: {
        intro: {
            arp: bars(arp(VOID.Em.arp, 2), arp(VOID.F.arp, 2), arp(VOID.Em.arp, 2), arp(VOID.F.arp, 2)),
            bass: bars(pumpBass('E2'), pumpBass('F2'), pumpBass('E2'), pumpBass('F2')),
            drums: bars(STOMP.sparse, STOMP.sparse, STOMP.beat, STOMP.fill),
        },
        verse: {
            lead: bars(
                'E5 - - - F5 - E5 - B4 - - - E5 - G5 -',
                'F5 - - - - - E5 - C5 - - - A4 - . .',
                'E5 - - - F5 - E5 - B4 - - - G5 - B5 -',
                'A5 - - - G5 - F5 - - - E5 - C5 - . .',
                'E5 - E5 - F5 - G5 - - - B5 - A5 - G5 -',
                'F5 - - - E5 - - - C5 - D5 - E5 - . .',
                'G5 - - - F#5 - - - D5 - E5 - F#5 - A5 -',
                'F5 - - - - - - - E5 - - - . . . .',
            ),
            arp: perChord(VOID_VERSE, (chord) => arp(chord.arp)),
            bass: perChord(VOID_VERSE, (chord) => octaveBass(chord.root)),
            drums: bars(STOMP.beat, STOMP.beat, STOMP.beat, STOMP.drive, STOMP.beat, STOMP.beat, STOMP.beat, STOMP.fill),
        },
        chorus: {
            lead: bars(
                'E6 - - - D6 - C6 - - - G5 - C6 - E6 -',
                'F#6 - - - - - E6 - D6 - - - A5 - . .',
                'G6 - - - F#6 - E6 - - - B5 - E6 - G6 -',
                'E6 - - - - - - - - - - - . . . .',
                'E6 - - - D6 - C6 - - - G5 - C6 - E6 -',
                'F#6 - - - - - E6 - D6 - - - A5 - D6 -',
                'D#6 - - - - - F#6 - - - B5 - D#6 - F#6 -',
                'B5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(VOID_CHORUS, (chord) => arp(chord.arp.map(up))),
            bass: perChord(VOID_CHORUS, (chord) => pumpBass(chord.root)),
            drums: bars(STOMP.drive, STOMP.drive, STOMP.drive, STOMP.fill, STOMP.drive, STOMP.drive, STOMP.drive, STOMP.fill),
        },
        bridge: {
            arp: perChord(VOID_BRIDGE, (chord) => arp(chord.arp, 2)),
            bass: perChord(VOID_BRIDGE, (chord) => octaveBass(chord.root)),
            drums: bars(STOMP.sparse, STOMP.sparse, STOMP.beat, STOMP.fill),
        },
    },
};

// ---- DEEP CURRENT: the drowned city, D dorian, slow and wide, a bell over rolling arpeggios

const DEEP = {
    Dm: { arp: ['D4', 'F4', 'A4'], root: 'D2' },
    Am: { arp: ['C4', 'E4', 'A4'], root: 'A1' },
    C: { arp: ['C4', 'E4', 'G4'], root: 'C2' },
    G: { arp: ['B3', 'D4', 'G4'], root: 'G1' },
    Bb: { arp: ['Bb3', 'D4', 'F4'], root: 'Bb1' },
    F: { arp: ['C4', 'F4', 'A4'], root: 'F1' },
    A: { arp: ['C#4', 'E4', 'A4'], root: 'A1' },
};
const DEEP_VERSE = ['Dm', 'Am', 'C', 'G', 'Dm', 'Am', 'Bb', 'C'].map((name) => DEEP[name]);
const DEEP_CHORUS = ['F', 'C', 'Dm', 'Am', 'F', 'C', 'G', 'A'].map((name) => DEEP[name]);
const TIDE = {
    roll: 'k . . h . . s . k . h . s . h .',
    swell: 'k . h . s . h k . . h . s . h h',
    fill: 'k . s . s . s s s s s s s s s s',
    sparse: 'k . . . . . h . k . . . s . . .',
};

const deepCurrent = {
    bpm: 126,
    echo: { steps: 4, feedback: 0.45, wet: 0.36, tone: 1800 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus'],
    loopFrom: 1,
    sections: {
        intro: {
            arp: bars(arp(DEEP.Dm.arp, 2), arp(DEEP.Am.arp, 2), arp(DEEP.C.arp, 2), arp(DEEP.G.arp, 2)),
            bass: bars(octaveBass('D2'), octaveBass('A1'), octaveBass('C2'), octaveBass('G1')),
            drums: bars(TIDE.sparse, TIDE.sparse, TIDE.roll, TIDE.fill),
        },
        verse: {
            bell: bars(
                'D5 - - - - - F5 - A5 - - - G5 - F5 -',
                'E5 - - - - - - - C5 - D5 - E5 - . .',
                'G5 - - - - - E5 - C5 - - - D5 - E5 -',
                'D5 - - - - - - - B4 - - - . . . .',
                'D5 - - - - - F5 - A5 - - - C6 - A5 -',
                'G5 - - - - - E5 - C5 - - - A4 - . .',
                'Bb4 - - - D5 - F5 - Bb5 - - - A5 - G5 -',
                'E5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(DEEP_VERSE, (chord) => arp(chord.arp)),
            bass: perChord(DEEP_VERSE, (chord) => octaveBass(chord.root)),
            drums: bars(TIDE.roll, TIDE.roll, TIDE.roll, TIDE.swell, TIDE.roll, TIDE.roll, TIDE.roll, TIDE.fill),
        },
        chorus: {
            bell: bars(
                'A5 - - - - - G5 - F5 - - - C6 - - -',
                'G5 - - - - - E5 - C5 - - - G5 - . .',
                'F5 - - - - - E5 - D5 - - - A5 - - -',
                'E5 - - - - - - - C5 - - - . . . .',
                'A5 - - - - - G5 - F5 - - - C6 - D6 -',
                'E6 - - - - - D6 - C6 - - - G5 - . .',
                'D6 - - - C6 - - - B5 - - - G5 - - -',
                'C#6 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(DEEP_CHORUS, (chord) => arp(chord.arp.map(up))),
            bass: perChord(DEEP_CHORUS, (chord) => octaveBass(chord.root)),
            drums: bars(TIDE.swell, TIDE.swell, TIDE.swell, TIDE.fill, TIDE.swell, TIDE.swell, TIDE.swell, TIDE.fill),
        },
    },
};

// ---- GRID RUNNER: the grid vortex, F# minor, synthwave: a bass pulsing on sixteenths, wide arpeggios, a soaring lead

const GRID = {
    'F#m': { arp: ['F#4', 'A4', 'C#5'], root: 'F#1' },
    D: { arp: ['D4', 'F#4', 'A4'], root: 'D2' },
    A: { arp: ['E4', 'A4', 'C#5'], root: 'A1' },
    E: { arp: ['E4', 'G#4', 'B4'], root: 'E2' },
    Bm: { arp: ['D4', 'F#4', 'B4'], root: 'B1' },
    'C#': { arp: ['E#4', 'G#4', 'C#5'], root: 'C#2' },
};
const GRID_VERSE = ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'C#'].map((name) => GRID[name]);
const GRID_CHORUS = ['D', 'E', 'F#m', 'F#m', 'D', 'E', 'Bm', 'C#'].map((name) => GRID[name]);
const NEON_BEAT = {
    beat: 'k . h . s . h . k . h . s . h h',
    gated: 'k . h k s . h . k . h k s . o .',
    fill: 'k . h . s . s . s s . s s s s s',
    sparse: 'k . . . . . h . k . . . . . h .',
};

/** Bass on every sixteenth, the root and its octave: the engine of synthwave. */
function pulseBass(root) {
    const high = up(root);
    return `${root} ${root} ${high} ${root} `.repeat(4).trim();
}

const gridRunner = {
    bpm: 116,
    echo: { steps: 3, feedback: 0.4, wet: 0.3, tone: 2200 },
    order: ['intro', 'verse', 'chorus', 'verse', 'chorus'],
    loopFrom: 1,
    sections: {
        intro: {
            arp: bars(arp(GRID['F#m'].arp, 2), arp(GRID.D.arp, 2), arp(GRID.A.arp, 2), arp(GRID.E.arp, 2)),
            bass: bars(pulseBass('F#1'), pulseBass('D2'), pulseBass('A1'), pulseBass('E2')),
            drums: bars(NEON_BEAT.sparse, NEON_BEAT.sparse, NEON_BEAT.beat, NEON_BEAT.fill),
        },
        verse: {
            lead: bars(
                'C#5 - - - - - A4 - F#4 - - - A4 - C#5 -',
                'D5 - - - - - - - A4 - - - F#4 - . .',
                'E5 - - - - - C#5 - A4 - - - C#5 - E5 -',
                'B4 - - - - - - - G#4 - - - . . . .',
                'C#5 - - - - - A4 - F#4 - - - A4 - F#5 -',
                'F#5 - - - E5 - D5 - - - A4 - D5 - . .',
                'E5 - - - - - C#5 - A4 - B4 - C#5 - E5 -',
                'E#5 - - - - - - - - - - - . . . .',
            ),
            arp: perChord(GRID_VERSE, (chord) => arp(chord.arp)),
            bass: perChord(GRID_VERSE, (chord) => pulseBass(chord.root)),
            drums: bars(NEON_BEAT.beat, NEON_BEAT.beat, NEON_BEAT.beat, NEON_BEAT.gated, NEON_BEAT.beat, NEON_BEAT.beat, NEON_BEAT.beat, NEON_BEAT.fill),
        },
        chorus: {
            lead: bars(
                'F#5 - - - A5 - - - D6 - - - C#6 - A5 -',
                'B5 - - - - - G#5 - E5 - - - G#5 - B5 -',
                'C#6 - - - - - A5 - F#5 - - - A5 - C#6 -',
                'F#6 - - - - - - - - - - - . . . .',
                'F#5 - - - A5 - - - D6 - - - C#6 - A5 -',
                'B5 - - - - - G#5 - E5 - - - B5 - E6 -',
                'D6 - - - - - C#6 - B5 - - - F#5 - B5 -',
                'C#6 - - - - - - - E#5 - - - G#5 - . .',
            ),
            arp: perChord(GRID_CHORUS, (chord) => arp(chord.arp.map(up))),
            bass: perChord(GRID_CHORUS, (chord) => pulseBass(chord.root)),
            drums: bars(NEON_BEAT.gated, NEON_BEAT.gated, NEON_BEAT.gated, NEON_BEAT.fill, NEON_BEAT.gated, NEON_BEAT.gated, NEON_BEAT.gated, NEON_BEAT.fill),
        },
    },
};

export const SONGS = {
    pitLane,
    sunsetRun,
    nightDrive,
    polarLights,
    voidRun,
    deepCurrent,
    gridRunner,
};

/** The song of the menus (title, worlds, tracks, garage, results). */
export const MENU_SONG = 'pitLane';
