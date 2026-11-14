import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORM } from '../js/config/Tuning.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
import { Shot } from '../js/sim/Projectiles.js';
import { Simulation } from '../js/sim/Simulation.js';
import { Storm } from '../js/sim/Storm.js';
import { flatMap } from './support/maps.js';

const FLOOR = 440;

function night() {
    const sim = new Simulation({ seed: 7, maps: [flatMap()] });
    sim.director.phase = 'break'; // no monsters of its own
    sim.director.timer = 1e9;
    return sim;
}

function run(sim, ticks) {
    const events = [];
    for (let i = 0; i < ticks && !sim.over; i++) {
        sim.step();
        events.push(...sim.drainEvents());
    }
    return events;
}

function place(sim, kind, x) {
    const enemy = createEnemy(kind, { id: 900 + sim.enemies.length, x, y: FLOOR, layer: 0 });
    enemy.setState('walk');
    enemy.speed = 0; // stays where it is put
    sim.enemies.push(enemy);
    return enemy;
}

function fill(storm) {
    while (!storm.ready) storm.addHit();
}

test('the storm fills with hits, once, and says when it is full', () => {
    const storm = new Storm();
    const filled = Array.from({ length: STORM.charge + 5 }, () => storm.addHit());
    assert.equal(filled.filter(Boolean).length, 1);
    assert.equal(filled.indexOf(true), STORM.charge - 1);
    assert.equal(storm.fill, 1);
});

test('the storm strikes the monsters in sight, nearest first, and empties', () => {
    const storm = new Storm();
    fill(storm);
    const enemies = [
        { id: 1, x: 900, alive: true },
        { id: 2, x: 400, alive: true },
        { id: 3, x: -40, alive: true }, // still outside the screen
        { id: 4, x: 600, alive: false },
    ];
    assert.equal(storm.call(enemies, 480), true);
    assert.deepEqual(storm.strikes.map((s) => s.targetId), [2, 1]);
    assert.equal(storm.charge, 0);
    assert.equal(storm.ready, false);
    assert.deepEqual(storm.update(STORM.firstStrike).map((s) => s.targetId), [2]);
    assert.deepEqual(storm.update(STORM.strikeGap).map((s) => s.targetId), [1]);
    assert.equal(storm.active, false);
});

test('a storm that is not full, or has nothing to strike, keeps its charge', () => {
    const storm = new Storm();
    storm.addHit();
    assert.equal(storm.call([{ id: 1, x: 300, alive: true }], 480), false);
    fill(storm);
    assert.equal(storm.call([], 480), false);
    assert.equal(storm.ready, true);
});

test('in a night: hits fill the storm, the call burns the shots and the lightnings kill', () => {
    const sim = night();
    const near = place(sim, 'archer', 300);
    const far = place(sim, 'warrior', 820);
    sim.shots.push(new Shot({ id: 50, kind: 'arrow', x: 200, y: 380, target: sim.mage.chest, ownerId: near.id }));
    for (let i = 0; i < STORM.charge - 1; i++) sim.storm.addHit();
    sim.score.combo = 3;

    const bat = createEnemy('bat', { id: 77, x: 700, y: 200 });
    bat.setState('fly');
    sim.enemies.push(bat);
    sim.tap(bat.center.x, bat.center.y);
    const filling = run(sim, 20);
    assert.ok(filling.some((e) => e.type === 'stormReady'), 'the last hit fills it');

    sim.callStorm();
    const events = run(sim, 60);
    assert.ok(events.some((e) => e.type === 'storm'));
    assert.equal(sim.shots.length, 0, 'the shots in flight are gone');
    const lightnings = events.filter((e) => e.type === 'lightning');
    assert.deepEqual(lightnings.map((e) => e.id), [near.id, far.id]);
    assert.equal(near.alive, false);
    assert.equal(far.alive, false);
    assert.equal(sim.storm.charge, 0, 'its own lightnings do not fill the next storm');
    assert.equal(sim.report().storms, 1);
});

test('the keyboard shield raises the shield without a tap', () => {
    const sim = night();
    sim.shield();
    const events = run(sim, 1);
    assert.ok(events.some((e) => e.type === 'shield'));
    assert.equal(sim.mage.shielded, true);
});
