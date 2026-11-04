import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimConfig } from '../js/config/SimConfig.js';
import { Rng } from '../js/core/Rng.js';
import { Course } from '../js/sim/Course.js';
import { PaintTank } from '../js/sim/PaintTank.js';
import { SimEvent, Simulation } from '../js/sim/Simulation.js';
import { Storm } from '../js/sim/Storm.js';
import { Terrain } from '../js/sim/Terrain.js';
import { goodBot, play } from './support/bots.js';

test('the ground joins its knots and is flat on crests and valleys', () => {
    const terrain = new Terrain(0, 10);
    terrain.addKnot(40, 0);
    terrain.addKnot(70, 8);

    assert.equal(terrain.heightAt(0), 10);
    assert.equal(terrain.heightAt(40), 0);
    assert.equal(terrain.heightAt(70), 8);
    assert.ok(Math.abs(terrain.slopeAt(0)) < 1e-12);
    assert.ok(Math.abs(terrain.slopeAt(40)) < 1e-12);
    assert.ok(terrain.slopeAt(20) < 0);
    assert.ok(terrain.slopeAt(55) > 0);
});

test('the slope matches the height of the ground', () => {
    const terrain = new Terrain(0, 10);
    terrain.addKnot(40, 0);
    const h = 0.001;
    const numeric = (terrain.heightAt(13 + h) - terrain.heightAt(13 - h)) / (2 * h);
    assert.ok(Math.abs(numeric - terrain.slopeAt(13)) < 1e-6);
});

test('the course keeps hills within the steepest allowed slope', () => {
    const course = new Course(new Rng(42));
    course.extendTo(6000);
    for (let x = 0; x < 6000; x += 1.5) {
        assert.ok(Math.abs(course.terrain.slopeAt(x)) <= SimConfig.course.maxSlope + 1e-9, `slope at ${x}`);
    }
});

test('the first hills have no obstacles', () => {
    const course = new Course(new Rng(42));
    course.extendTo(4000);
    assert.ok(course.obstacles.length > 0);
    assert.ok(course.obstacles[0].x >= SimConfig.course.safeStart);
});

test('drops and obstacles stay sorted along the course', () => {
    const course = new Course(new Rng(7));
    course.extendTo(3000);
    for (const list of [course.drops, course.obstacles]) {
        for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].x <= list[i].x);
    }
});

test('seven bands make a rainbow and empty the tank', () => {
    const tank = new PaintTank(7);
    for (let i = 0; i < 6; i++) assert.equal(tank.addBand(), false);
    assert.equal(tank.bands, 6);
    assert.equal(tank.addBand(), true);
    assert.equal(tank.bands, 0);
});

test('losing a band never goes below an empty tank', () => {
    const tank = new PaintTank(7);
    assert.equal(tank.loseBand(), false);
    tank.addBand();
    assert.equal(tank.loseBand(), true);
    assert.equal(tank.bands, 0);
});

test('the storm gets faster with distance and a rainbow pushes it back', () => {
    const storm = new Storm(SimConfig);
    const initialSpeed = storm.speed;
    for (let i = 0; i < 6000; i++) storm.step(storm.x + 1);
    assert.ok(storm.speed > initialSpeed);

    const before = storm.x;
    storm.pushBack();
    assert.equal(storm.x, before - SimConfig.storm.rainbowPush);
});

test('the storm never falls further behind than its limit', () => {
    const storm = new Storm(SimConfig);
    const runnerX = 900;
    storm.step(runnerX);
    assert.equal(storm.x, runnerX - SimConfig.storm.maxGap);
});

test('pressing or not, the runner always moves forward', () => {
    for (const held of [true, false]) {
        const sim = new Simulation(3);
        for (let i = 0; i < 1800 && !sim.finished; i++) {
            const before = sim.runner.x;
            sim.step(held);
            assert.ok(sim.runner.x > before);
        }
    }
});

test('the runner never ends up under the ground', () => {
    const sim = new Simulation(11);
    const bot = goodBot(new Rng(4));
    while (!sim.finished && sim.tick < 60 * 120) {
        sim.step(bot(sim));
        const ground = sim.course.terrain.heightAt(sim.runner.x);
        assert.ok(sim.runner.y >= ground - 1e-9);
    }
});

test('every run ends, however well it is played', () => {
    const sim = play(new Simulation(21), goodBot(new Rng(2)), 60 * 1200);
    assert.equal(sim.finished, true);
});

test('being caught is announced once and stops the run', () => {
    const sim = new Simulation(5);
    const events = [];
    while (!sim.finished) {
        sim.step(false);
        events.push(...sim.drainEvents());
    }
    const { tick } = sim;
    sim.step(true);

    assert.equal(sim.tick, tick);
    assert.equal(events.filter((event) => event.type === SimEvent.CAUGHT).length, 1);
});

function peakOf(held, ticks) {
    const sim = new Simulation(9);
    let peak = 0;
    for (let i = 0; i < ticks; i++) {
        sim.step(held(i));
        peak = Math.max(peak, sim.runner.y - sim.course.terrain.heightAt(sim.runner.x));
    }
    return { sim, peak };
}

test('a press jumps at once', () => {
    const sim = new Simulation(9);
    sim.step(true);
    assert.equal(sim.runner.grounded, false);
    assert.equal(sim.jumps, 1);
});

test('keeping the button down does not jump again by itself', () => {
    const { sim } = peakOf(() => true, 200);
    assert.equal(sim.jumps, 1);
});

test('a longer press jumps higher', () => {
    const short = peakOf((i) => i < 2, 70).peak;
    const long = peakOf((i) => i < 24, 70).peak;
    assert.ok(long > short * 1.5, 'short ' + short + ' long ' + long);
});

test('a second press in the air jumps again, a third does nothing', () => {
    const presses = (i) => i < 2 || (i >= 12 && i < 14) || (i >= 18 && i < 20);
    const events = [];
    const sim = new Simulation(9);
    for (let i = 0; i < 30; i++) {
        sim.step(presses(i));
        events.push(...sim.drainEvents());
    }
    assert.equal(events.filter((event) => event.type === SimEvent.JUMP).length, 1);
    assert.equal(events.filter((event) => event.type === SimEvent.DOUBLE_JUMP).length, 1);
});

test('a press just before landing still jumps', () => {
    const sim = new Simulation(9);
    sim.step(true);
    sim.step(false);
    let safety = 0;
    while (sim.jumps === 1 && safety++ < 400) {
        const falling = sim.runner.vy < 0;
        const height = sim.runner.y - sim.course.terrain.heightAt(sim.runner.x);
        sim.step(falling && height < 1.2);
    }
    assert.equal(sim.jumps, 2);
});

test('the score is the metres covered', () => {
    const sim = new Simulation(9);
    for (let i = 0; i < 300; i++) sim.step(false);
    assert.equal(sim.metres, Math.floor(sim.runner.x));
});
