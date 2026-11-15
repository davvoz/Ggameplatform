import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS, DT, INVADER, MAGE } from '../js/config/Tuning.js';
import { BossKit } from '../js/sim/enemies/BossKit.js';
import { invaderPower } from '../js/sim/Simulation.js';
import { FLOOR, holdWaves, night, place, run } from './support/night.js';

/** A night past the start of its first wave (the bats a boss calls come in like the wave's own), field empty. */
function quietNight() {
    const sim = night();
    while (sim.wave === 0) sim.step();
    holdWaves(sim);
    sim.enemies = [];
    sim.drainEvents();
    return sim;
}

function placeBoss(sim, kind, x, y = FLOOR, level = 1) {
    const invader = { id: 'boss', kind, level, name: 'BOSS', lap: 0 };
    return place(sim, kind, x, y, { power: invaderPower(level), invader });
}

/** Steps until `done()` (at most `ticks`), keeping the events. */
function runUntil(sim, ticks, done) {
    const events = [];
    for (let i = 0; i < ticks && !done(); i++) {
        sim.step();
        events.push(...sim.drainEvents());
    }
    return events;
}

const count = (events, type) => events.filter((e) => e.type === type).length;

test('the level shows in the volleys and the bats, and the fury and the calls come once each', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map((level) => new BossKit(level).volley), [2, 3, 3, 4, 4]);
    assert.deepEqual([1, 2, 3, 4, 5].map((level) => new BossKit(level).brood), [2, 2, 3, 3, 4]);
    const kit = new BossKit(3);
    kit.wounded(0.9);
    assert.deepEqual(kit.take(), { roar: false, bats: 0 });
    kit.wounded(0.7);
    assert.deepEqual(kit.take(), { roar: false, bats: 3 });
    kit.wounded(0.3);
    assert.deepEqual(kit.take(), { roar: true, bats: 3 }, 'one hit can cross the fury and a call');
    kit.wounded(0.1);
    assert.deepEqual(kit.take(), { roar: false, bats: 0 });
    assert.ok(kit.furious);
});

test('a boss calls bats as its health drops, then grows furious: quicker step and blows', () => {
    const sim = quietNight();
    const boss = placeBoss(sim, 'warrior', 300, FLOOR, 3);
    const { speed, timing } = boss;
    boss.hurt(Math.ceil(boss.maxHp * 0.3), 0);
    let events = run(sim, 1);
    assert.equal(events.find((e) => e.type === 'summon')?.count, 3);
    assert.equal(sim.enemies.filter((e) => e.kind === 'bat' && !e.invader).length, 3);
    assert.equal(count(events, 'fury'), 0);
    boss.hurt(Math.ceil(boss.maxHp * 0.25), 0);
    events = run(sim, 1);
    assert.equal(count(events, 'fury'), 1);
    assert.ok(boss.speed > speed);
    assert.ok(boss.timing.windup < timing.windup);
    assert.ok(boss.timing.rally < timing.rally);
    assert.equal(sim.report().invaders.length, 0, 'the bats are the wave\'s own, nobody\'s invaders');
});

test('once furious, a boss is no longer stopped by critical hits, only by the shield', () => {
    const sim = quietNight();
    const boss = placeBoss(sim, 'warrior', 300);
    boss.hurt(Math.ceil(boss.maxHp * 0.6), 0);
    run(sim, 1);
    assert.ok(boss.bossKit.furious);
    boss.setState('windup');
    boss.hurt(1, 600, true);
    assert.equal(boss.state, 'windup', 'the blow still comes');
    boss.shove(600, 40);
    assert.equal(boss.state, 'stagger');
});

test('a warrior boss rallies from afar, charges and hits for two hearts', () => {
    const sim = quietNight();
    const boss = placeBoss(sim, 'warrior', 100);
    runUntil(sim, 30, () => boss.state === 'rally');
    assert.equal(boss.state, 'rally');
    assert.ok(boss.telegraphing, 'the rally shows the red "!"');
    const events = runUntil(sim, 300, () => sim.mage.hp < MAGE.hp);
    assert.ok(events.some((e) => e.type === 'hurt'));
    assert.equal(sim.mage.hp, MAGE.hp - BOSS.charge.damage);
    assert.ok(boss.reload > 0, 'it waits before charging again');
});

test('a critical hit stops the rally, and the shield stops the charge', () => {
    const sim = quietNight();
    const boss = placeBoss(sim, 'warrior', 100);
    runUntil(sim, 30, () => boss.state === 'rally');
    sim.tap(boss.center.x, boss.center.y);
    const events = runUntil(sim, 30, () => boss.state !== 'rally');
    assert.ok(events.some((e) => e.type === 'critical'));
    assert.equal(boss.state, 'stagger', 'stopped before the charge');

    const other = quietNight();
    const charger = placeBoss(other, 'warrior', 100);
    runUntil(other, 300, () => charger.state === 'charge' && Math.abs(charger.x - other.mage.x) < 160);
    other.shield();
    const blocked = runUntil(other, 120, () => charger.state !== 'charge');
    assert.ok(blocked.some((e) => e.type === 'blocked'));
    assert.equal(other.mage.hp, MAGE.hp);
});

test('an archer boss looses a volley as big as its level says, a plain archer one arrow', () => {
    for (const [level, arrows] of [[1, 2], [4, 4]]) {
        const sim = quietNight();
        sim.mage.shieldCooldown = 1e9; // no shield, no shove: the volley runs to its end
        const boss = placeBoss(sim, 'archer', 150, FLOOR, level);
        const events = runUntil(sim, 300, () => boss.state === 'recover');
        assert.equal(count(events, 'fire'), arrows, `level ${level}`);
    }
    const sim = quietNight();
    const archer = place(sim, 'archer', 150);
    const events = runUntil(sim, 300, () => archer.state === 'recover');
    assert.equal(count(events, 'fire'), 1);
});

test('a brawler boss throws its fireballs in a volley too', () => {
    const sim = quietNight();
    const boss = placeBoss(sim, 'brawler', 120, FLOOR, 2);
    const events = runUntil(sim, 300, () => boss.state === 'recover');
    assert.equal(count(events, 'fire'), 3);
});

test('a bat boss bites, flies up out of reach and dives again', () => {
    const sim = quietNight();
    const bat = placeBoss(sim, 'bat', 760, 200);
    runUntil(sim, 600, () => sim.mage.hp < MAGE.hp);
    assert.equal(sim.mage.hp, MAGE.hp - 1);
    assert.ok(bat.alive, 'it does not burst on its bite');
    assert.equal(bat.state, 'soar');
    runUntil(sim, 300, () => bat.state === 'fly');
    assert.ok(bat.y < sim.mage.chest.y - 100, 'it waits high up');
    const events = runUntil(sim, 600, () => sim.mage.hp < MAGE.hp - 1);
    assert.equal(sim.mage.hp, MAGE.hp - 2, 'and bites again');
    assert.equal(count(events, 'burst'), 0);
});

/** One tick where the wave's own monsters drop at once and the boss, once in sight, is finished with one bolt. */
function finishingTick(sim, state) {
    if (sim.offer) sim.choose(sim.offer[0]);
    sim.step();
    for (const e of sim.enemies) if (!e.invader) e.hp = 0;
    const boss = sim.enemies.find((e) => e.invader && e.x > 100 && e.x < 860);
    if (boss && !state.tapped) {
        boss.hp = 1;
        sim.tap(boss.center.x, boss.center.y);
        state.tapped = true;
    }
    return sim.drainEvents();
}

test('the wave ends only once the fallen boss has flown off', () => {
    const sim = night({ invaders: [{ id: 'x', kind: 'warrior', level: 1, name: 'X' }] });
    const state = { tapped: false };
    let killedAt = null;
    let clearedAt = null;
    for (let t = 0; t < 60 * 300 && clearedAt === null; t++) {
        for (const e of finishingTick(sim, state)) {
            if (e.type === 'kill' && e.invader) killedAt = sim.ticks;
            if (e.type === 'waveClear' && killedAt !== null) clearedAt = sim.ticks;
        }
    }
    assert.ok(clearedAt !== null, 'the boss wave ends');
    assert.ok(Math.abs((clearedAt - killedAt) * DT - INVADER.farewell) < 0.1, `after the farewell (${(clearedAt - killedAt) * DT}s)`);
});
