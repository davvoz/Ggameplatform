import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Simulation } from '../js/sim/Simulation.js';
import { playRun } from './support/bot.js';

const SIM_DIR = fileURLToPath(new URL('../js/sim', import.meta.url));
const CORE_DIR = fileURLToPath(new URL('../js/core', import.meta.url));

/** A fingerprint of everything that matters in a run. */
function fingerprint(sim) {
    const w = sim.world;
    const parts = [sim.tick, sim.phase, sim.missionIndex, sim.score.total, sim.score.multiplier, sim.player.lives, sim.player.hearts,
        sim.player.body.x, sim.player.body.y, w.camera.x];
    for (const e of w.enemies) parts.push(e.type, e.x, e.y, e.hp, e.state);
    for (const p of w.enemyShots.items) if (p.active) parts.push(p.kind, p.x, p.y);
    return parts.join('|');
}

function files(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : [path];
    });
}

test('the same seed and the same buttons give the same run', async () => {
    const a = await playRun(Simulation, 1234, { maxTicks: 60 * 60 * 3 });
    const b = await playRun(Simulation, 1234, { maxTicks: 60 * 60 * 3 });
    assert.equal(fingerprint(a.sim), fingerprint(b.sim));
    assert.equal(a.sim.score.total, b.sim.score.total);
});

test('replaying the recorded buttons reproduces the score exactly', async () => {
    const { sim, inputs } = await playRun(Simulation, 99, { maxTicks: 60 * 60 * 3 });
    const replay = new Simulation(99);
    for (const bits of inputs) replay.step(bits);
    assert.equal(fingerprint(replay), fingerprint(sim));
    assert.equal(replay.result().score, sim.result().score);
});

test('replays stay identical at every tick, not just at the end', async () => {
    const { inputs } = await playRun(Simulation, 7, { maxTicks: 60 * 40 });
    const a = new Simulation(7);
    const b = new Simulation(7);
    for (const bits of inputs) {
        a.step(bits);
        b.step(bits);
        if (a.tick % 30 === 0) assert.equal(fingerprint(a), fingerprint(b), `diverged at tick ${a.tick}`);
    }
});

test('a different seed changes the details of the run', async () => {
    const a = await playRun(Simulation, 1, { maxTicks: 60 * 60 });
    const b = await playRun(Simulation, 2, { maxTicks: 60 * 60 });
    assert.notEqual(fingerprint(a.sim), fingerprint(b.sim));
});

test('the simulation never uses the clock, Math.random or engine trigonometry', () => {
    const banned = /Math\.(random|sin|cos|tan|atan|atan2|exp|log|pow|hypot)\b|Date\.now|performance\.now|new Date/;
    for (const path of [...files(SIM_DIR), ...files(CORE_DIR)]) {
        if (path.endsWith('GameLoop.js')) continue; // the loop owns real time, not the rules
        const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        assert.doesNotMatch(source, banned, path);
    }
});
