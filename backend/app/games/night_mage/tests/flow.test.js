import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/app/Game.js';
import { MAGE } from '../js/config/Tuning.js';
import { bounceHitTime, demoShot, titleBeat, titleCue } from '../js/render/TitleDemo.js';
import { createEnemy } from '../js/sim/enemies/registry.js';
import { flatMap } from './support/maps.js';

const IDS = ['start', 'again', 'home', 'send:bat', 'send:warrior', 'send:archer', 'send:brawler', 'send:confirm', 'send:back', 'storm'];

/** Every button the screens could show, each in its own 10 x 10 spot along a line. */
const BUTTONS = IDS.map((id, i) => ({ id, x: i * 20, y: 0, w: 10, h: 10 }));
const at = (id) => [IDS.indexOf(id) * 20 + 5, 5];

function fakeParts(sent) {
    const quiet = () => {};
    return {
        renderer: {
            toWorld: (x, y) => ({ x, y }),
            update: quiet,
            drawTitle: () => BUTTONS,
            drawPlay: () => BUTTONS,
            effects: new Proxy({}, { get: () => quiet }), // takes every effect and draws none
            hud: { reset: quiet, playEvents: quiet },
            weather: { set: quiet },
        },
        audio: { unlock: quiet, play: quiet, playEvents: quiet, setMusic: quiet },
        platform: {
            week: () => ({ weekId: '2026-W46', seed: 1 }),
            loadInvaders: async () => [],
            loadInbox: async () => null,
            startRun: quiet,
            finishRun: quiet,
            reportInvaders: quiet,
            saveBest: quiet,
            sendInvader: async (kind, wave) => {
                sent.push({ kind, wave });
                return true;
            },
        },
        chrome: { setMode: quiet },
        scenes: { prepare: quiet },
        maps: [flatMap('green_wood')], // a flat floor under a real map's id
    };
}

/** Starts a night, lets it reach wave 5 and ends it, up to the results with buttons. */
function toResults(game) {
    game.frame(0);
    game.tap(...at('start'));
    game.frame(3); // past the countdown
    const sim = game.sim;
    sim.director.wave = 5;
    sim.mage.hp = 1;
    const bat = createEnemy('bat', { id: 99, x: sim.mage.x + 10, y: sim.mage.chest.y });
    bat.setState('fly');
    sim.enemies.push(bat);
    for (let i = 0; i < 5 && game.mode !== 'dying'; i++) game.tick();
    game.frame(2); // the fall
    game.frame(3); // the results come in
    assert.equal(game.mode, 'results');
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('after a night: pick a monster, go back, pick again, send it, go home', async () => {
    const sent = [];
    const game = new Game(fakeParts(sent));
    game.open();
    toResults(game);

    game.tap(...at('send:warrior'));
    game.tap(...at('send:back'));
    assert.deepEqual(sent, [], 'BACK sends nothing');

    game.tap(...at('send:archer'));
    game.tap(...at('send:confirm'));
    await flush();
    assert.deepEqual(sent, [{ kind: 'archer', wave: 5 }]);

    game.tap(...at('send:confirm'));
    await flush();
    assert.equal(sent.length, 1, 'only one invader per night');

    game.tap(...at('home'));
    assert.equal(game.mode, 'title');
});

test('the title mage casts at the demo targets, raises the shield and calls the storm', () => {
    const cues = [];
    for (let time = 0; time < 4 * 3.4; time += 1 / 60) {
        const cue = titleCue(time, time + 1 / 60);
        if (cue) cues.push({ scene: titleBeat(time + 1 / 60).scene, ...cue });
    }
    assert.deepEqual(cues.map((c) => c.move), ['cast', 'cast', 'shield', 'cast']);
    assert.deepEqual(cues.map((c) => c.scene), [0, 1, 2, 3]);
    assert.ok([cues[0], cues[1], cues[3]].every((c) => c.x < 480), 'the targets are on the left of the mage');
});

/** Starts a night and lets the countdown run out. */
function toFight(game) {
    game.open();
    game.frame(0);
    game.tap(...at('start'));
    game.frame(3);
    assert.equal(game.mode, 'play');
    game.sim.director.phase = 'break'; // no monsters of its own
    game.sim.director.timer = 1e9;
}

test('in the fight Space raises the shield and the storm button calls the storm', () => {
    const game = new Game(fakeParts([]));
    toFight(game);
    game.confirm();
    game.tick();
    assert.equal(game.sim.mage.shielded, true, 'Space: the shield');

    const bat = createEnemy('bat', { id: 99, x: 300, y: 200 });
    bat.setState('fly');
    game.sim.enemies.push(bat);
    while (!game.sim.storm.ready) game.sim.storm.addHit();
    game.tap(...at('storm'));
    game.tick();
    assert.equal(game.sim.storm.active, true, 'the button calls it');
    assert.equal(game.sim.score.misses, 0, 'a tap on the button is not a miss');
});

test('the title demo: the arrow flies at the mage, the fireball bounces back into Ken while the shield is up', () => {
    const chest = { x: 480, y: 374 };
    const archer = { kind: 'arrow', from: { x: 180, y: 373 }, chest, home: { x: 150, y: 385 }, release: 1, reflects: false };
    const early = demoShot(archer, 1.1);
    const later = demoShot(archer, 1.4);
    assert.equal(demoShot(archer, 0.5), null, 'not shot yet');
    assert.ok(later.x > early.x && later.phase === 'out');

    const ken = { kind: 'fireball', from: { x: 200, y: 372 }, chest, home: { x: 170, y: 384 }, release: 0.9, reflects: true };
    let bounce = null;
    for (let t = ken.release; t < 3.4 && bounce === null; t += 1 / 60) if (demoShot(ken, t).phase === 'back') bounce = t;
    const shieldAt = 1.25;
    assert.ok(bounce > shieldAt && bounce < shieldAt + MAGE.shieldTime, `bounce at ${bounce} with the shield up`);
    const hit = bounceHitTime(ken);
    assert.ok(hit > bounce && hit < 3.4, 'it gets back to Ken before the scene ends');
    assert.equal(Math.round(demoShot(ken, hit).x), ken.home.x);
});

test('keys 1 2 3 choose among the powers offered', () => {
    const game = new Game(fakeParts([]));
    toFight(game);
    game.sim.offer = ['twin', 'lucky', 'vampire'];
    game.frame(0.1);
    game.chooseBoon(0); // too soon: the cards are still coming in
    game.frame(1);
    game.chooseBoon(1);
    game.frame(1); // the picked card flashes, the others go
    game.tick();
    assert.equal(game.sim.boons.level('twin'), 0);
    assert.equal(game.sim.boons.level('lucky'), 1);
    assert.equal(game.sim.offer, null);
});
