import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../js/config/Enemies.js';
import { COMBO, DT, INVADER, MAGE, SCORE, WAVES } from '../js/config/Tuning.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
import { Shot } from '../js/sim/Projectiles.js';
import { Simulation, invaderPower } from '../js/sim/Simulation.js';
import { flatMap } from './support/maps.js';

const FLOOR = 440;

function night(options = {}) {
    return new Simulation({ seed: 7, maps: [flatMap()], ...options });
}

function run(sim, ticks) {
    const events = [];
    for (let i = 0; i < ticks && !sim.over; i++) {
        sim.step();
        events.push(...sim.drainEvents());
    }
    return events;
}

/** Puts a monster on the field, ready to act. */
function place(sim, kind, x, y = FLOOR, extra = {}) {
    const enemy = createEnemy(kind, { id: 900 + sim.enemies.length, x, y, layer: 0, ...extra });
    enemy.setState(enemy.flying ? 'fly' : 'walk');
    sim.enemies.push(enemy);
    return enemy;
}

/** Keeps the director from sending its own monsters. */
function holdWaves(sim) {
    sim.director.phase = 'break';
    sim.director.timer = 1e9;
}

test('a tap on a monster sends a bolt that kills it and scores', () => {
    const sim = night();
    holdWaves(sim);
    const bat = place(sim, 'bat', 700, 200);
    sim.tap(bat.x, bat.y);
    const events = run(sim, 20);
    assert.ok(events.some((e) => e.type === 'cast'));
    const kill = events.find((e) => e.type === 'kill');
    assert.ok(kill, 'the bat dies');
    assert.equal(kill.points, 100);
    assert.equal(sim.score.score, 100);
    assert.equal(sim.score.kills, 1);
});

test('a tap on nothing is a miss and breaks the combo', () => {
    const sim = night();
    holdWaves(sim);
    sim.score.combo = 9;
    sim.tap(100, 100);
    const events = run(sim, 2);
    assert.ok(events.some((e) => e.type === 'miss'));
    assert.ok(events.some((e) => e.type === 'comboLost'));
    assert.equal(sim.score.combo, 0);
});

test('the multiplier rises every few hits and caps', () => {
    const sim = night();
    for (let i = 0; i < COMBO.hitsPerStep; i++) sim.score.hit();
    assert.equal(sim.score.multiplier, 2);
    for (let i = 0; i < 200; i++) sim.score.hit();
    assert.equal(sim.score.multiplier, COMBO.maxMultiplier);
    assert.equal(sim.score.award(100), 100 * COMBO.maxMultiplier);
});

test('the combo cools down without hits', () => {
    const sim = night();
    holdWaves(sim);
    sim.score.hit();
    const events = run(sim, Math.ceil(COMBO.window * 60) + 2);
    assert.ok(events.some((e) => e.type === 'comboLost'));
    assert.equal(sim.score.combo, 0);
});

test('a warrior telegraphs its swing and hurts the mage', () => {
    const sim = night();
    holdWaves(sim);
    place(sim, 'warrior', sim.mage.x + 200);
    const events = run(sim, 60 * 6);
    assert.ok(events.some((e) => e.type === 'hurt'));
    assert.equal(sim.mage.hp, MAGE.hp - events.filter((e) => e.type === 'hurt').length);
});

test('the shield blocks a swing and shoves the warrior back', () => {
    const sim = night();
    holdWaves(sim);
    const warrior = place(sim, 'warrior', sim.mage.x + 80);
    warrior.setState('windup');
    sim.tap(sim.mage.x, sim.mage.feetY - 50);
    const events = run(sim, 40);
    assert.ok(events.some((e) => e.type === 'shield'));
    assert.ok(events.some((e) => e.type === 'blocked'));
    assert.equal(sim.mage.hp, MAGE.hp);
    assert.ok(warrior.x > sim.mage.x + 80, 'pushed away');
});

test('the shield needs to cool down', () => {
    const sim = night();
    holdWaves(sim);
    sim.tap(sim.mage.x, sim.mage.feetY - 50);
    run(sim, 2);
    sim.tap(sim.mage.x, sim.mage.feetY - 50);
    const events = run(sim, 2);
    assert.ok(events.some((e) => e.type === 'shieldBusy'));
});

test('an arrow can be tapped down for points', () => {
    const sim = night();
    holdWaves(sim);
    const archer = place(sim, 'archer', 150);
    sim.shots.push(new Shot({ id: 50, kind: 'arrow', x: 300, y: 380, target: sim.mage.chest, ownerId: archer.id }));
    sim.tap(300, 380);
    const events = run(sim, 2);
    const down = events.find((e) => e.type === 'shotDown');
    assert.ok(down);
    assert.equal(down.points, SCORE.shotDown);
    assert.equal(sim.shots.length, 0);
});

test('a shielded arrow flies back and hurts the archer', () => {
    const sim = night();
    holdWaves(sim);
    const archer = place(sim, 'archer', 200);
    archer.reload = 99;
    sim.mage.raiseShield();
    sim.shots.push(new Shot({ id: 51, kind: 'arrow', x: sim.mage.x - 60, y: sim.mage.chest.y, target: sim.mage.chest, ownerId: archer.id }));
    const events = run(sim, 90);
    assert.ok(events.some((e) => e.type === 'reflect'));
    assert.ok(archer.hp < archer.maxHp, 'the archer is hit by her own arrow');
});

test('five wounds end the night', () => {
    const sim = night();
    holdWaves(sim);
    const events = [];
    for (let i = 0; i < MAGE.hp; i++) {
        sim.mage.grace = 0;
        place(sim, 'bat', sim.mage.x + 30, sim.mage.chest.y);
        events.push(...run(sim, 3));
    }
    assert.ok(sim.over);
    assert.ok(events.some((e) => e.type === 'death'));
    assert.equal(sim.mage.hp, 0);
});

/** Plays until `waves` waves are cleared, removing every monster as it comes. */
function clearWaves(sim, waves) {
    const events = [];
    for (let t = 0; t < 60 * 60 * waves; t++) {
        if (sim.offer) sim.choose(sim.offer[0]);
        sim.step();
        for (const e of sim.enemies) e.hp = 0;
        events.push(...sim.drainEvents());
        if (events.filter((e) => e.type === 'waveClear').length >= waves) break;
    }
    return events;
}

test('waves clear, pay a bonus and the scene changes every few waves', () => {
    const sim = new Simulation({ seed: 3, maps: [flatMap('a'), flatMap('b')] });
    const firstMap = sim.map.id;
    const events = clearWaves(sim, WAVES.wavesPerMap);
    const cleared = events.filter((e) => e.type === 'waveClear');
    const scenes = events.filter((e) => e.type === 'scene');
    assert.equal(cleared.length, WAVES.wavesPerMap);
    assert.ok(cleared.every((c) => c.flawless));
    assert.equal(cleared[0].bonus, SCORE.waveClear + SCORE.flawlessWave);
    assert.equal(scenes.length, 1);
    assert.notEqual(sim.map.id, firstMap);
});

test('an invader closes an even wave as its boss, tougher, and its fate is reported', () => {
    const invader = { id: 'inv-1', kind: 'warrior', level: 3, name: 'Luca' };
    const sim = night({ invaders: [invader] });
    const seen = [];
    let spawned = null;
    let aliveAtSpawn = -1;
    for (let t = 0; t < 60 * 120 && !spawned; t++) {
        if (sim.offer) sim.choose(sim.offer[0]);
        sim.step();
        // clear the waves quickly so the invader's comes
        for (const e of sim.enemies) if (!e.invader) e.hp = 0;
        const events = sim.drainEvents();
        seen.push(...events.map((e) => ({ ...e, tick: sim.ticks })));
        spawned = events.find((e) => e.type === 'spawn' && e.invader);
        if (spawned) aliveAtSpawn = sim.enemies.filter((e) => !e.invader).length;
    }
    assert.ok(spawned, 'the invader arrives');
    assert.equal(sim.director.wave % WAVES.invaderEvery, 0);
    assert.equal(sim.director.remaining, 0, 'it comes last');
    assert.equal(aliveAtSpawn, 0, 'it steps in alone');
    const herald = seen.find((e) => e.type === 'invaderComing');
    assert.equal(herald?.invader, invader, 'it is announced first');
    const spawnTick = seen.find((e) => e.type === 'spawn' && e.invader).tick;
    assert.ok(Math.abs((spawnTick - herald.tick) * DT - INVADER.heraldTime) < 2 * DT, 'after the warning');
    const enemy = sim.enemies.find((e) => e.invader);
    assert.equal(enemy.maxHp, Math.round(ENEMIES.warrior.hp * invaderPower(3, sim.director.shape.power).hp));
    assert.ok(enemy.maxHp >= 6, 'a boss takes several bolts');
    enemy.hp = 1;
    sim.tap(enemy.center.x, enemy.center.y);
    const events = run(sim, 30);
    const kill = events.find((e) => e.type === 'kill' && e.invader);
    assert.ok(kill);
    assert.equal(kill.points, 300 * SCORE.invaderMultiplier * sim.score.multiplier);
    assert.deepEqual(sim.report().invaders, [{ id: 'inv-1', damage: 0, slain: true, killedMage: false }]);
});

test('an invader grows with the wave it closes and stands its ground', () => {
    assert.ok(invaderPower(1).hp > 1);
    assert.equal(invaderPower(2, { hp: 2, speed: 1.3 }).hp, 2 * invaderPower(2).hp);
    assert.equal(invaderPower(2, { hp: 2, speed: 1.3 }).speed, 1.3);
    const plain = createEnemy('warrior', { id: 1, x: 300, y: FLOOR, layer: 0 });
    const boss = createEnemy('warrior', { id: 2, x: 300, y: FLOOR, layer: 0, power: invaderPower(1), invader: { id: 'b', level: 1 } });
    assert.ok(boss.body.height > plain.body.height, 'hit as big as it looks');
    assert.ok(boss.knockback < plain.knockback);
    boss.setState('walk');
    boss.hurt(1, 600);
    assert.equal(boss.state, 'walk', 'a plain bolt does not stop it');
    boss.hurt(1, 600, true);
    assert.equal(boss.state, 'stagger', 'a critical hit does');
    assert.equal(boss.x, 300 - boss.knockback);
});

test('a pickup is taken with a tap', () => {
    const sim = night();
    holdWaves(sim);
    sim.mage.hp = 2;
    const bat = place(sim, 'bat', 600, 300);
    bat.invader = { id: 'x', kind: 'bat', level: 1 }; // invaders always drop a gift
    sim.tap(bat.x, bat.y);
    run(sim, 120);
    assert.equal(sim.pickups.length, 1);
    const gift = sim.pickups[0];
    sim.tap(gift.x, gift.y - 20);
    const events = run(sim, 2);
    assert.ok(events.some((e) => e.type === 'pickup'));
    assert.equal(sim.pickups.length, 0);
});

test('shots leave from the bow and from the hands, on either side', () => {
    for (const [kind, x] of [['archer', 180], ['archer', 780], ['brawler', 200], ['brawler', 760]]) {
        const sim = night();
        holdWaves(sim);
        const shooter = place(sim, kind, x);
        let fired = null;
        for (let i = 0; i < 600 && !fired; i++) fired = run(sim, 1).find((e) => e.type === 'fire');
        assert.ok(fired, `${kind} at ${x} shoots`);
        const { forward, up } = shooter.stats.muzzle;
        assert.equal(fired.y, FLOOR - up, `${kind} at ${x}: height`);
        assert.equal(Math.sign(fired.x - shooter.x), shooter.facing, `${kind} at ${x}: in front`);
        assert.equal(Math.abs(fired.x - shooter.x), forward);
    }
});
