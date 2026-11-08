import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PlayerTuning, ScoreTuning } from '../js/config/Tuning.js';
import { sinX, cosX, atan2X } from '../js/core/MathX.js';
import { Btn } from '../js/sim/Buttons.js';
import { EventQueue } from '../js/sim/Events.js';
import { Missions } from '../js/sim/levels/Missions.js';
import { ScoreKeeper, Style } from '../js/sim/ScoreKeeper.js';
import { Simulation } from '../js/sim/Simulation.js';
import { createEnemy } from '../js/sim/enemies/registry.js';

const run = (sim, bits, ticks) => {
    for (let i = 0; i < ticks; i++) sim.step(bits);
};

/** A mission 1 simulation with nobody else in the street. */
function quietSim() {
    const sim = new Simulation(5);
    sim.world.enemies.length = 0;
    sim.world.director.update = () => {};
    run(sim, 0, 200);
    return sim;
}

test('deterministic trigonometry matches the engine closely', () => {
    for (let a = -10; a <= 10; a += 0.37) {
        assert.ok(Math.abs(sinX(a) - Math.sin(a)) < 1e-4, `sin ${a}`);
        assert.ok(Math.abs(cosX(a) - Math.cos(a)) < 1e-4, `cos ${a}`);
    }
    for (let y = -3; y <= 3; y += 0.7) {
        for (let x = -3; x <= 3; x += 0.9) assert.ok(Math.abs(atan2X(y, x) - Math.atan2(y, x)) < 2e-4, `atan2 ${y} ${x}`);
    }
});

test('Nonna lands, runs right and the camera follows', () => {
    const sim = quietSim();
    assert.equal(sim.player.state, 'alive');
    const x0 = sim.player.body.x;
    run(sim, Btn.RIGHT, 240);
    assert.ok(sim.player.body.x > x0 + 200);
    assert.ok(sim.world.camera.x > 50);
});

test('she cannot walk back past the left edge of the screen', () => {
    const sim = quietSim();
    run(sim, Btn.RIGHT, 300);
    run(sim, Btn.LEFT, 60);
    const camX = sim.world.camera.x;
    run(sim, Btn.LEFT, 400);
    assert.ok(sim.player.body.x >= camX + 7);
    assert.equal(sim.world.camera.x, camX, 'the camera never scrolls back');
});

test('a jump rises about 50 pixels and a short tap rises less', () => {
    const peak = (holdTicks) => {
        const sim = quietSim();
        const ground = sim.player.body.y;
        let top = ground;
        for (let i = 0; i < 90; i++) {
            sim.step(i < holdTicks ? Btn.JUMP : 0);
            top = Math.min(top, sim.player.body.y);
        }
        return ground - top;
    };
    const full = peak(40);
    const short = peak(3);
    assert.ok(full > 45 && full < 65, `full jump ${full}`);
    assert.ok(short < full - 15, `short ${short} vs full ${full}`);
});

test('crouching makes her short enough to duck a standing grunt shot', () => {
    const sim = quietSim();
    run(sim, Btn.DOWN, 5);
    assert.equal(sim.player.body.h, PlayerTuning.crouchHeight);
    // grunt bullets fly 19 px above the feet, 5 px tall
    assert.ok(PlayerTuning.crouchHeight < 19 - 2.5);
    assert.ok(PlayerTuning.height - 3 > 19 + 2.5);
});

test('shooting a grunt three times with the pistol kills it and scores', () => {
    const sim = quietSim();
    const b = sim.player.body;
    const grunt = sim.world.spawnEnemy('grunt', b.x + 90, undefined, { awake: true });
    grunt.awake = true;
    grunt.update = function update(world) { this.age++; if (this.dead) this.dyingUpdate(world); };
    run(sim, Btn.RIGHT | Btn.FIRE, 2);
    run(sim, Btn.FIRE, 60);
    assert.ok(grunt.dead, 'grunt dead');
    assert.ok(sim.score.total >= 100);
    assert.equal(sim.score.mission.kills, 1);
});

test('the multiplier climbs with kills, cools down, and resets when hurt', () => {
    const events = new EventQueue();
    const score = new ScoreKeeper(events);
    for (let i = 0; i < ScoreTuning.heatPerStep * 3; i++) score.kill(100, [], 0, 0, 'grunt', null);
    assert.equal(score.multiplier, 4);
    for (let i = 0; i < ScoreTuning.chainTicks + 2; i++) score.tick();
    assert.equal(score.multiplier, 3, 'one step lost after the chain ends');
    score.hurt();
    assert.equal(score.multiplier, 1);
});

test('style bonuses add points and extra heat', () => {
    const plain = new ScoreKeeper(new EventQueue());
    const slipper = new ScoreKeeper(new EventQueue());
    const a = plain.kill(100, [], 0, 0, 'grunt', null);
    const b = slipper.kill(100, [Style.MELEE], 0, 0, 'grunt', null);
    assert.equal(a, 100);
    assert.equal(b, 200);
    assert.ok(slipper.heat > plain.heat);
});

test('mission tally rewards accuracy, speed, rescues, all teeth and no damage', () => {
    const score = new ScoreKeeper(new EventQueue());
    score.beginMission(3, 3);
    for (let i = 0; i < 10; i++) score.shotFired();
    for (let i = 0; i < 8; i++) score.shotLanded();
    score.rescued();
    score.rescued();
    score.toothFound();
    score.toothFound();
    score.toothFound();
    for (let i = 0; i < 60 * 100; i++) score.tick();
    const before = score.total;
    const lines = score.closeMission(300);
    const byLabel = Object.fromEntries(lines.map((l) => [l.label, l.points]));
    assert.equal(byLabel.ACCURACY, 80 * ScoreTuning.accuracyPerPercent);
    assert.equal(byLabel.TIME, 200 * ScoreTuning.timeBonusPerSecond);
    assert.equal(byLabel.GRANDKIDS, 2 * ScoreTuning.rescueBonus);
    assert.equal(byLabel['GOLD TEETH'], ScoreTuning.allTeethBonus);
    assert.equal(byLabel.FLAWLESS, ScoreTuning.flawlessBonus);
    assert.equal(score.total - before, lines.reduce((sum, l) => sum + l.points, 0));
});

test('the shield grunt blocks bullets from the front but not from behind', () => {
    const sim = quietSim();
    const shield = sim.world.spawnEnemy('shield', sim.player.body.x + 60, undefined, { awake: true });
    shield.update(sim.world);
    shield.facing = -1;
    const front = { kind: 'bullet', x: shield.x - 8, y: shield.y - 14, dirX: 1, byPlayer: true };
    const back = { kind: 'bullet', x: shield.x + 8, y: shield.y - 14, dirX: -1, byPlayer: true };
    assert.equal(shield.takeHit(sim.world, 1, front), 0);
    assert.equal(shield.tray, shield.def.tray - 1);
    assert.equal(shield.takeHit(sim.world, 1, back), 1);
});

test('freeing a grandkid scores, counts and leaves a present', () => {
    const sim = new Simulation(5);
    sim.world.enemies.length = 0;
    const h = sim.world.hostages[0];
    sim.player.state = 'alive';
    sim.player.body.x = h.x;
    sim.player.body.y = h.y;
    sim.world.camera.x = h.x - 100;
    h.update(sim.world);
    assert.equal(h.state, 'freed');
    assert.equal(sim.score.mission.rescues, 1);
    for (let i = 0; i < 30; i++) h.update(sim.world);
    assert.ok(sim.world.pickups.items.some((p) => p.active && p.type === h.gift));
});

test('every mission is well formed', () => {
    for (const m of Missions) {
        assert.equal(m.hostages.length, 3, `${m.name} grandkids`);
        const teeth = m.pickups.filter((p) => p.type === 'tooth').length + m.props.filter((p) => p.drop === 'tooth').length;
        assert.equal(teeth, 3, `${m.name} teeth`);
        const finals = m.script.filter((c) => c.final);
        assert.equal(finals.length, 1, `${m.name} has one final boss`);
        assert.ok(finals[0].at + 384 <= m.length, `${m.name} boss arena fits`);
        for (const cue of m.script) {
            const specs = [...(cue.spawn ?? []), ...(cue.arena?.waves.flat() ?? []), ...(cue.boss ? [cue.boss] : [])];
            for (const s of specs) assert.doesNotThrow(() => createEnemy(s.type, s.x, 0, {}), `${m.name} ${s.type}`);
        }
    }
});

test('losing every life ends the run with a result', () => {
    const sim = new Simulation(3);
    let guard = 0;
    while (!sim.finished && guard++ < 60 * 60 * 20) {
        if (sim.player.alive && sim.player.vulnerable) sim.player.hurt(sim.world, 'test');
        sim.step(0);
    }
    assert.ok(sim.finished);
    assert.equal(sim.player.lives, 0);
    const r = sim.result();
    assert.equal(r.victory, false);
    assert.equal(typeof r.score, 'number');
});

test('a pilot that cannot die always reaches the end of the campaign', async () => {
    const { DemoPilot } = await import('../js/app/DemoPilot.js');
    for (const seed of [55, 404]) {
        const sim = new Simulation(seed);
        const pilot = new DemoPilot(1);
        let bossOut = false;
        while (!sim.finished && sim.tick < 60 * 60 * 40) {
            sim.step(pilot.buttons(sim));
            if (sim.player.state === 'dying') sim.player.lives = Math.max(sim.player.lives, 2);
            const boss = sim.world.boss;
            if (boss && boss.awake && !boss.dead && boss.state !== 'intro' && (boss.x < sim.world.camera.x - 60 || boss.x > sim.world.camera.right + 60 || boss.y < -20)) bossOut = true;
        }
        assert.ok(sim.won, `seed ${seed} did not finish (mission ${sim.missionIndex + 1}, phase ${sim.phase})`);
        assert.equal(bossOut, false, `seed ${seed}: a boss left its arena`);
    }
});
