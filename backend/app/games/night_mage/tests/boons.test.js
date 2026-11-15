import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOONS, BOON_CHOICES, BOON_EVERY } from '../js/config/Boons.js';
import { STRINGS } from '../js/config/Strings.js';
import { CRITICAL, ENERGY, MAGE, STORM, WAVES } from '../js/config/Tuning.js';
import { Rng } from '../js/core/Rng.js';
import { ART } from '../js/render/BoonArt.js';
import { Boons, applyBoon } from '../js/sim/Boons.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
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

/** Takes a power the way the player does: offered, then chosen. */
function take(sim, id) {
    sim.offer = [id];
    sim.choose(id);
    run(sim, 1);
}

test('three different powers are offered, the same for the same seed, never one already maxed', () => {
    const boons = new Boons();
    const first = boons.offer(new Rng(5));
    assert.equal(first.length, BOON_CHOICES);
    assert.equal(new Set(first).size, BOON_CHOICES);
    assert.deepEqual(boons.offer(new Rng(5)), first);
    boons.levels.vampire = BOONS.vampire.max;
    for (let seed = 0; seed < 40; seed++) assert.ok(!boons.offer(new Rng(seed)).includes('vampire'));
});

test('every power has its words and its picture', () => {
    for (const id of Object.keys(BOONS)) {
        assert.ok(STRINGS.boons[id]?.name && STRINGS.boons[id].lines.length === 2, id);
    }
    for (const [name, art] of Object.entries(ART)) {
        assert.equal(art.grid.length, 16, name);
        assert.ok(art.grid.every((row) => row.length === 16), name);
    }
});

test('after one wave in two (the boss waves) the night stands still until a power is chosen', () => {
    const sim = new Simulation({ seed: 7, maps: [flatMap()] });
    let offered = null;
    const clearedBefore = [];
    for (let t = 0; t < 60 * 240 && !offered; t++) {
        sim.step();
        for (const e of sim.enemies) e.hp = 0;
        const events = sim.drainEvents();
        clearedBefore.push(...events.filter((e) => e.type === 'waveClear').map((e) => e.wave));
        offered = events.find((e) => e.type === 'offer');
    }
    assert.ok(offered, 'offered');
    assert.deepEqual(clearedBefore, [1, BOON_EVERY], 'not after the first wave, after the second');
    assert.equal(sim.wave, WAVES.invaderEvery, 'the wave of the first boss');
    const ticks = sim.ticks;
    sim.tap(100, 100);
    run(sim, 30);
    assert.equal(sim.ticks, ticks, 'time stands still');
    assert.equal(sim.score.misses, 0, 'taps meanwhile are dropped');
    sim.choose('not-offered');
    run(sim, 1);
    assert.ok(sim.offer, 'only an offered power can be chosen');
    const id = offered.choices[1];
    sim.choose(id);
    const events = run(sim, 2);
    assert.ok(events.some((e) => e.type === 'boon' && e.id === id));
    assert.equal(sim.offer, null);
    assert.equal(sim.boons.level(id), 1);
    assert.ok(sim.ticks > ticks, 'and the night goes on');
});

test('powers that change the mage and the storm at once', () => {
    const sim = night();
    sim.mage.hp = 3;
    take(sim, 'hearts');
    assert.equal(sim.mage.maxHp, MAGE.hp + BOONS.hearts.hearts);
    assert.equal(sim.mage.hp, 3 + BOONS.hearts.hearts);
    take(sim, 'longShield');
    assert.equal(sim.mage.shieldDuration, MAGE.shieldTime + BOONS.longShield.seconds);
    take(sim, 'quickShield');
    assert.equal(sim.mage.shieldRecharge, MAGE.shieldCooldown * BOONS.quickShield.factor);
    take(sim, 'stormCaller');
    assert.equal(sim.storm.needed, Math.round(STORM.charge * BOONS.stormCaller.factor));
    take(sim, 'crystal');
    assert.equal(sim.mage.energyMax, ENERGY.max + 1);
    take(sim, 'quickCrystals');
    assert.equal(sim.mage.energyRegen, ENERGY.regen * BOONS.quickCrystals.factor);
});

test('the long shield really lasts longer', () => {
    const sim = night();
    take(sim, 'longShield');
    sim.shield();
    run(sim, Math.round(MAGE.shieldTime * 60) + 5);
    assert.equal(sim.mage.shielded, true);
});

test('twin bolt: every third cast also hits another monster', () => {
    const sim = night();
    take(sim, 'twin');
    const a = place(sim, 'warrior', 200);
    const b = place(sim, 'warrior', 260);
    place(sim, 'warrior', 760);
    a.hp = 9;
    b.hp = 9;
    const casts = [];
    for (let i = 0; i < 3; i++) {
        sim.tap(a.center.x, a.center.y);
        casts.push(run(sim, 1).filter((e) => e.type === 'cast').length);
    }
    assert.deepEqual(casts, [1, 1, 2]);
    run(sim, 30);
    assert.equal(b.hp, 8, 'the second bolt went to the nearest other one');
});

test('thorn shield: a blocked blow hurts the attacker', () => {
    const sim = night();
    take(sim, 'thorns');
    const warrior = place(sim, 'warrior', sim.mage.x - 80);
    warrior.hp = 5;
    sim.shield();
    const events = run(sim, 120);
    assert.ok(events.some((e) => e.type === 'blocked'));
    assert.ok(events.some((e) => e.type === 'thorns'));
    assert.equal(warrior.hp, 5 - BOONS.thorns.damage);
});

test('vampire: every few kills give back a heart', () => {
    const sim = night();
    take(sim, 'vampire');
    sim.mage.hp = 2;
    sim.mage.energyRegen = 100; // bolts for every monster
    let healed = false;
    for (let i = 0; i < BOONS.vampire.kills; i++) {
        const bat = createEnemy('bat', { id: 500 + i, x: 300, y: 200 });
        bat.setState('fly');
        sim.enemies.push(bat);
        sim.pickups.length = 0; // taps on the bat, not on a gift fallen there
        sim.mage.grace = 99;
        sim.tap(bat.center.x, bat.center.y);
        healed ||= run(sim, 20).some((e) => e.type === 'vampire');
    }
    assert.ok(healed);
    assert.equal(sim.mage.hp, 3);
});

test('sharp eye: criticals hit three times as hard and give a crystal more', () => {
    const sim = night();
    take(sim, 'sharpEye');
    const warrior = place(sim, 'warrior', sim.mage.x - 80);
    warrior.hp = 10;
    for (let i = 0; i < 120 && warrior.state !== 'windup'; i++) run(sim, 1);
    sim.mage.energy = 1;
    sim.tap(warrior.center.x, warrior.center.y);
    run(sim, 3);
    assert.equal(warrior.hp, 10 - BOONS.sharpEye.multiplier);
    assert.ok(sim.mage.energy >= CRITICAL.refund + BOONS.sharpEye.refund - 0.1);
});

test('the boons a night took are in its report', () => {
    const sim = night();
    take(sim, 'lucky');
    applyBoon('lucky', sim); // nothing to change at once
    assert.deepEqual(sim.report().boons, { lucky: 1 });
});
