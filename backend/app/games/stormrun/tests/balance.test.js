import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../js/core/Rng.js';
import { Simulation } from '../js/sim/Simulation.js';
import { casualBot, goodBot, idleBot, play } from './support/bots.js';

/** The promises of the game design, measured on many courses. */

const SEEDS = 24;

function median(values) {
    return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

function runs(makeBot) {
    const results = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
        results.push(play(new Simulation(seed * 7919), makeBot(seed)));
    }
    return results;
}

const seconds = (sim) => sim.tick / 60;

const idle = runs(() => idleBot());
const casual = runs((seed) => casualBot(new Rng(seed).fork('bot')));
const good = runs((seed) => goodBot(new Rng(seed).fork('bot')));

test('doing nothing ends the run soon, but not at once', () => {
    const time = median(idle.map(seconds));
    assert.ok(time >= 12 && time <= 35, `${time} s`);
});

test('a first-time player survives long enough to have fun', () => {
    const time = median(casual.map(seconds));
    assert.ok(time >= 35, `${time} s`);
});

test('knowing the rule goes clearly further than not pressing', () => {
    assert.ok(median(casual.map((sim) => sim.metres)) > median(idle.map((sim) => sim.metres)) * 2);
    assert.ok(median(good.map((sim) => sim.metres)) > median(casual.map((sim) => sim.metres)) * 1.2);
});

test('good play paints rainbows', () => {
    assert.ok(median(good.map((sim) => sim.rainbows)) >= 3);
});

test('no run outlives the storm for long', () => {
    assert.ok(Math.max(...good.map(seconds)) < 600);
});
