import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicPlayer } from '../js/audio/MusicPlayer.js';
import { compileSong, frequencyOf, midiOf, nextStep, parsePattern } from '../js/audio/score.js';
import { INSTRUMENTS, MENU_SONG, MUSIC, SONGS } from '../js/config/Music.js';
import { WORLDS } from '../js/config/Worlds.js';
import { musicOf } from '../js/sim/setup.js';

test('note names are read as MIDI numbers and pitches', () => {
    assert.equal(midiOf('A4'), 69);
    assert.equal(midiOf('C4'), 60);
    assert.equal(midiOf('G#4'), 68);
    assert.equal(midiOf('Bb3'), 58);
    assert.equal(frequencyOf(69), 440);
    assert.ok(Math.abs(frequencyOf(81) - 880) < 1e-9);
    assert.throws(() => midiOf('H4'));
    assert.throws(() => midiOf('C'));
});

test('a pattern holds notes on dashes and stops them on dots', () => {
    const { length, events } = parsePattern('C4 - - . | E4 . - kh');
    assert.equal(length, 8);
    assert.deepEqual(events, [
        { step: 0, token: 'C4', steps: 3 },
        { step: 4, token: 'E4', steps: 1 },
        { step: 7, token: 'kh', steps: 1 },
    ]);
});

test('every song compiles in whole bars, and loops back to its loop', () => {
    for (const [id, song] of Object.entries(SONGS)) {
        const compiled = compileSong(id, song, INSTRUMENTS);
        assert.equal(compiled.steps % 16, 0, id);
        assert.equal(compiled.loopStep % 16, 0, id);
        assert.ok(compiled.events.some((sounds) => sounds.length), id);
        assert.equal(nextStep(compiled, compiled.steps - 1), compiled.loopStep, id);
        assert.equal(nextStep(compiled, compiled.steps - 1, 3), compiled.loopStep + 2, id);
        for (const sounds of compiled.events) {
            for (const sound of sounds) assert.ok(sound.hit || (sound.frequency > 30 && sound.frequency < 4200), `${id}: ${JSON.stringify(sound)}`);
        }
    }
});

test('a song with a typo fails on load', () => {
    const song = (sections) => ({ bpm: 120, order: ['a'], loopFrom: 0, sections });
    assert.throws(() => compileSong('x', song({ a: { lead: 'C4 - Q9 .' } }), INSTRUMENTS), /Not a note/);
    assert.throws(() => compileSong('x', song({ a: { drums: 'k . z .' } }), INSTRUMENTS), /no drum/);
    assert.throws(() => compileSong('x', song({ a: { lead: 'C4 - - .', bass: 'C2 -' } }), INSTRUMENTS), /different lengths/);
    assert.throws(() => compileSong('x', song({ a: { tuba: 'C4' } }), INSTRUMENTS), /no instrument/);
    assert.throws(() => compileSong('x', { ...song({ a: { lead: 'C4' } }), order: ['b'] }, INSTRUMENTS), /no such section/);
});

test('the menus, every world and every track have a song that exists', () => {
    assert.ok(MENU_SONG in SONGS);
    for (const world of WORLDS) {
        assert.ok(world.music in SONGS, world.id);
        for (const track of world.tracks) assert.ok(musicOf(track) in SONGS, track);
    }
});

test('every drum is made of playable parts', () => {
    for (const [hit, recipe] of Object.entries(INSTRUMENTS.drums.kit)) {
        for (const part of recipe) assert.ok(part.v > 0 && part.v <= 0.6 && (part.n ? part.f > 20 : part.from > 20 && part.d > 0), hit);
    }
});

/** A sound card that only writes down what it is asked to play. */
function fakeSynth() {
    return {
        running: false,
        now: 0,
        /** Times of everything booked, in the order it was. */
        booked: [],
        buses: [],
        createBus(options) {
            const bus = {
                options,
                input: {},
                fades: [],
                closed: false,
                fadeTo(volume, seconds) {
                    this.fades.push([volume, seconds]);
                },
                close() {
                    this.closed = true;
                },
            };
            this.buses.push(bus);
            return bus;
        },
        note(time) {
            this.booked.push(time);
        },
        schedule(recipe, time) {
            this.booked.push(time);
        },
    };
}

const playerOn = (synth) => new MusicPlayer(synth, { songs: SONGS, instruments: INSTRUMENTS, config: MUSIC });

test('the music waits for sound to be allowed, then books its notes just ahead of the clock', () => {
    const synth = fakeSynth();
    const player = playerOn(synth);
    player.play('sunsetRun');
    player.update();
    assert.equal(player.current, null);
    assert.equal(synth.booked.length, 0);

    synth.running = true;
    player.update();
    assert.equal(player.current, 'sunsetRun');
    synth.now = MUSIC.gap;
    player.update();
    const first = [...synth.booked];
    assert.ok(first.length > 0);
    assert.ok(Math.min(...first) >= MUSIC.gap - 1e-9);
    assert.ok(Math.max(...first) < MUSIC.gap + MUSIC.lookahead);

    // a frame later only the steps that came into reach are added
    synth.now = MUSIC.gap + 0.1;
    player.update();
    const later = synth.booked.slice(first.length);
    assert.ok(later.length > 0);
    assert.ok(Math.min(...later) > Math.max(...first));
    assert.ok(Math.max(...later) < synth.now + MUSIC.lookahead);
});

test('a new song fades the old one out; the same song goes on; null is silence', () => {
    const synth = fakeSynth();
    synth.running = true;
    const player = playerOn(synth);
    player.play(MENU_SONG);
    player.update();
    const [master, menu] = synth.buses;
    assert.deepEqual(menu.fades, [[1, MUSIC.fadeIn]]);

    player.play(MENU_SONG);
    player.update();
    assert.equal(synth.buses.length, 2);

    player.play('sunsetRun');
    player.update();
    assert.deepEqual(menu.fades.at(-1), [0, MUSIC.fadeOut]);
    assert.ok(menu.closed);
    assert.equal(player.current, 'sunsetRun');

    player.duck(true);
    assert.deepEqual(master.fades.at(-1), [MUSIC.volume * MUSIC.duck, MUSIC.duckFade]);

    player.play(null);
    player.update();
    assert.equal(player.current, null);
    const count = synth.booked.length;
    synth.now = 5;
    player.update();
    assert.equal(synth.booked.length, count);
    assert.throws(() => player.play('noSuchSong'));
});

test('after a stall the music skips what is past instead of piling it up', () => {
    const synth = fakeSynth();
    synth.running = true;
    const player = playerOn(synth);
    player.play('sunsetRun');
    player.update();
    const count = synth.booked.length;
    synth.now = 10;
    player.update();
    const late = synth.booked.slice(count);
    assert.ok(late.length > 0 && Math.min(...late) >= 10);
    assert.ok(Math.max(...late) < 10 + MUSIC.lookahead);
});
