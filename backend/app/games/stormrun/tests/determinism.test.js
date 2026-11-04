import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Rng } from '../js/core/Rng.js';
import { Simulation } from '../js/sim/Simulation.js';
import { casualBot, goodBot } from './support/bots.js';

const WEEK_SEED = 123456789;

function record(seed, bot, maxTicks) {
    const sim = new Simulation(seed);
    const presses = [];
    while (!sim.finished && sim.tick < maxTicks) {
        const held = bot(sim);
        presses.push(held);
        sim.step(held);
    }
    return { sim, presses };
}

test('the same seed and presses replay to the same run', () => {
    const { sim, presses } = record(WEEK_SEED, casualBot(new Rng(5)), 60 * 200);

    const replay = new Simulation(WEEK_SEED);
    for (const held of presses) replay.step(held);

    assert.deepEqual(replay.snapshot(), sim.snapshot());
});

test('the course depends only on the seed, not on how it is played', () => {
    const first = new Simulation(WEEK_SEED);
    const second = new Simulation(WEEK_SEED);
    for (let i = 0; i < 600; i++) {
        first.step(true);
        second.step(false);
    }
    const x = 120;
    assert.equal(first.course.terrain.heightAt(x), second.course.terrain.heightAt(x));
});

test('different seeds give different courses', () => {
    const a = new Simulation(1).course.terrain.heightAt(150);
    const b = new Simulation(2).course.terrain.heightAt(150);
    assert.notEqual(a, b);
});

test('adding draws to one random stream leaves the others untouched', () => {
    const plain = new Rng(9);
    const busy = new Rng(9);
    busy.fork('shape').next();
    assert.equal(plain.fork('drops').next(), busy.fork('drops').next());
});

test('a run does not hold on to the course it left behind', () => {
    const { sim } = record(WEEK_SEED, goodBot(new Rng(1)), 60 * 90);
    assert.ok(sim.course.drops.length < 120);
    assert.ok(sim.course.obstacles.length < 60);
});

function sourceFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    });
}

test('the simulation uses nothing that could differ between devices', () => {
    const forbidden = /Math\.(random|sin|cos|tan|atan2?|asin|acos|exp|log|pow|hypot|cbrt)\b|Date\.|performance\.|window\.|document\.|globalThis/;
    const root = new URL('../js/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    const files = [...sourceFiles(join(root, 'sim')), join(root, 'core', 'Rng.js')];

    assert.ok(files.length > 5);
    for (const file of files) {
        const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        assert.doesNotMatch(code, forbidden, file);
    }
});
