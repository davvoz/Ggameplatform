import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../js/core/Rng.js';
import { Camera } from '../js/render/Camera.js';
import { Simulation } from '../js/sim/Simulation.js';
import { goodBot } from './support/bots.js';

/** What the camera does along whole runs, frame by frame, on a phone in landscape. */

const SEEDS = 12;
const WIDTH = 844;
const HEIGHT = 390;
const FRAME = 1 / 60;
const MAX_TICKS = 60 * 120;

function eachFrame(seed, visit) {
    const sim = new Simulation(seed * 7919);
    const bot = goodBot(new Rng(seed).fork('bot'));
    const camera = new Camera();
    camera.resize(WIDTH, HEIGHT);
    camera.jump(sim.course.terrain, sim.runner.x, sim.runner.y, sim.gap);

    while (!sim.finished && sim.tick < MAX_TICKS) {
        sim.step(bot(sim));
        sim.drainEvents();
        camera.follow(sim.course.terrain, sim.runner.x, sim.runner.y, sim.gap, FRAME);
        visit(camera);
    }
}

test('the scenery never scrolls backwards, whatever the camera does', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
        let last = -Infinity;
        eachFrame(seed, (camera) => {
            const scroll = camera.scrollFor(1);
            assert.ok(scroll >= last, `seed ${seed}: ${last} then ${scroll}`);
            last = scroll;
        });
    }
});

test('a zoom does not move the scenery', () => {
    const camera = new Camera();
    camera.resize(WIDTH, HEIGHT);
    const terrain = { heightAt: () => 0 };
    camera.jump(terrain, 1000, 0, 40);
    const before = camera.scrollFor(0.3);
    camera.jump(terrain, 1000, 200, 40);
    assert.equal(camera.scrollFor(0.3), before);
});
