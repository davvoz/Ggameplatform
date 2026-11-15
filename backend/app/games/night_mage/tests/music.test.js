import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOP_STEPS, STEPS_PER_BAR, chordAt, notesAt, pieceOf } from '../js/audio/Score.js';

const loop = (mood) => Array.from({ length: LOOP_STEPS }, (_, step) => notesAt(step, mood));
const voices = (mood) => new Set(loop(mood).flat().map((n) => n.voice));
const pitchClass = (note) => ((note % 12) + 12) % 12;

test('the fight has drums and a running arpeggio, the calm has neither', () => {
    assert.deepEqual([...voices('fight')].sort(), ['arp', 'bass', 'hat', 'kick', 'lead', 'snare']);
    assert.deepEqual([...voices('calm')].sort(), ['arp', 'bass', 'softLead']);
    assert.ok(notesAt(0, 'fight').some((n) => n.voice === 'kick'), 'the bar starts on the kick');
});

test('bass and arpeggio stay on the chord of their bar', () => {
    for (const mood of ['calm', 'fight']) {
        loop(mood).forEach((notes, step) => {
            const chord = chordAt(step).tones.map(pitchClass);
            for (const n of notes.filter((x) => x.voice === 'bass' || x.voice === 'arp')) {
                assert.ok(chord.includes(pitchClass(n.note)), `${mood} step ${step}: ${n.voice} ${n.note}`);
            }
        });
    }
});

test('the boss has its own piece: a bass on every step, a kick on every beat, its tune at once', () => {
    const bars = 4;
    const steps = Array.from({ length: STEPS_PER_BAR * bars }, (_, step) => notesAt(step, 'boss'));
    assert.ok(steps.every((notes) => notes.some((n) => n.voice === 'bass')));
    for (let beat = 0; beat < STEPS_PER_BAR * bars; beat += 4) assert.ok(steps[beat].some((n) => n.voice === 'kick'), `kick on ${beat}`);
    assert.ok(steps[0].some((n) => n.voice === 'bossLead'), 'the tune starts with the piece');
    steps.forEach((notes, step) => {
        const chord = chordAt(step, 'boss').tones.map(pitchClass);
        for (const n of notes.filter((x) => x.voice === 'bass' || x.voice === 'arp')) {
            assert.ok(chord.includes(pitchClass(n.note)), `boss step ${step}: ${n.voice} ${n.note}`);
        }
    });
    assert.deepEqual(notesAt(STEPS_PER_BAR * bars + 3, 'boss'), notesAt(3, 'boss'));
    assert.notEqual(pieceOf('boss'), pieceOf('fight'));
    assert.equal(pieceOf('calm'), pieceOf('fight'));
});

test('the tune comes in on the second time round, and the loop wraps', () => {
    const half = LOOP_STEPS / 2;
    assert.ok(loop('fight').slice(0, half).flat().every((n) => n.voice !== 'lead'));
    assert.ok(notesAt(half, 'fight').some((n) => n.voice === 'lead'));
    assert.deepEqual(notesAt(LOOP_STEPS + 5, 'fight'), notesAt(5, 'fight'));
    assert.equal(LOOP_STEPS % STEPS_PER_BAR, 0);
});
