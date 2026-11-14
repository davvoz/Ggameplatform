import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRITICAL, ENERGY } from '../js/config/Tuning.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
import { Pickup } from '../js/sim/Pickups.js';
import { Simulation } from '../js/sim/Simulation.js';
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
    sim.enemies.push(enemy);
    return enemy;
}

const tapOn = (sim, enemy) => sim.tap(enemy.center.x, enemy.center.y);

test('every bolt costs a charge; with none left a tap does nothing, not even a miss', () => {
    const sim = night();
    const warrior = place(sim, 'warrior', 200);
    warrior.speed = 0;
    for (let i = 0; i < 4; i++) sim.score.hit(); // a combo going on
    sim.mage.energy = 1;
    tapOn(sim, warrior);
    tapOn(sim, warrior);
    const events = run(sim, 1);
    assert.equal(events.filter((e) => e.type === 'cast').length, 1, 'one bolt for one charge');
    assert.ok(events.some((e) => e.type === 'noEnergy'));
    assert.equal(events.some((e) => e.type === 'miss'), false);
    assert.ok(sim.score.combo >= 4, 'the combo survives');
    assert.ok(sim.mage.denied > 0, 'the charges blink');
});

test('the charges come back by themselves, up to the most', () => {
    const sim = night();
    sim.mage.energy = 0;
    run(sim, 60);
    assert.ok(Math.abs(sim.mage.energy - ENERGY.regen) < 0.05, `about ${ENERGY.regen} after a second`);
    run(sim, 600);
    assert.equal(sim.mage.energy, ENERGY.max);
});

test('gifts and the shield are free', () => {
    const sim = night();
    sim.mage.energy = 0;
    sim.pickups.push(new Pickup({ id: 70, kind: 'heart', x: 300, y: FLOOR }));
    sim.tap(300, FLOOR - 22);
    sim.shield();
    const events = run(sim, 1);
    assert.ok(events.some((e) => e.type === 'pickup'));
    assert.ok(events.some((e) => e.type === 'shield'));
});

test('a bolt during the wind-up is critical: double damage, the blow stopped, a charge back', () => {
    const sim = night();
    const warrior = place(sim, 'warrior', sim.mage.x - 80); // in reach: it winds up
    warrior.hp = 5; // tough enough to live through the critical
    for (let i = 0; i < 120 && warrior.state !== 'windup'; i++) run(sim, 1);
    assert.equal(warrior.state, 'windup');
    sim.mage.energy = 2;
    const before = warrior.hp;
    tapOn(sim, warrior);
    const events = run(sim, 3);
    const critical = events.find((e) => e.type === 'critical');
    assert.ok(critical, 'critical');
    assert.equal(before - warrior.hp, Math.min(before, CRITICAL.damageMultiplier));
    assert.equal(warrior.state, 'stagger', 'its blow is stopped');
    assert.ok(sim.mage.energy > 1 + CRITICAL.refund - 0.2, 'the charge comes back');
    assert.equal(sim.mage.hp, sim.mage.maxHp, 'the mage is not hit');
});

test('a bolt on a monster that is just walking is a normal hit', () => {
    const sim = night();
    const warrior = place(sim, 'warrior', 150);
    const before = warrior.hp;
    tapOn(sim, warrior);
    const events = run(sim, 30);
    assert.equal(events.some((e) => e.type === 'critical'), false);
    assert.equal(before - warrior.hp, 1);
});
