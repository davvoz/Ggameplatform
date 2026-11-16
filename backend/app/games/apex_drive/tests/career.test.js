import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODS } from '../js/config/Mods.js';
import { PARTS } from '../js/config/Parts.js';
import { PRIZES, START_CREDITS } from '../js/config/Tuning.js';
import { Career } from '../js/sim/Career.js';

/** Two worlds of two tracks, to check the unlocking. */
const WORLDS = [
    { id: 'w1', name: 'ONE', tracks: ['a', 'b'], prizeScale: 1 },
    { id: 'w2', name: 'TWO', tracks: ['c', 'd'], prizeScale: 2 },
];
const finish = (career, trackId, position) => career.finishRace(trackId, { position, bestLap: 50, cash: 0 });

test('a new career has the start credits and the stock car', () => {
    const career = new Career();
    assert.equal(career.credits, START_CREDITS);
    assert.ok(Object.values(career.parts).every((tier) => tier === 0));
    assert.deepEqual(career.fitted, []);
});

test('parts are bought tier by tier, while the credits last', () => {
    const career = new Career({ credits: PARTS.engine.tiers[1].price });
    assert.equal(career.buyPart('engine'), 'ok');
    assert.equal(career.parts.engine, 1);
    assert.equal(career.credits, 0);
    assert.equal(career.buyPart('engine'), 'credits');
    const top = new Career({ credits: 1e9, parts: { engine: 3 } });
    assert.equal(top.buyPart('engine'), 'max');
    assert.equal(top.nextPart('engine'), null);
});

test('mods are bought once and fitted within slots and energy', () => {
    const career = new Career({ credits: 1e6 });
    assert.equal(career.fit('magnet'), 'missing');
    assert.equal(career.buyMod('magnet'), 'ok');
    assert.equal(career.buyMod('magnet'), 'owned');
    assert.equal(career.fit('magnet'), 'ok');
    // the stock bay: 2 slots, 3 energy; the magnet takes 1
    career.buyMod('lapShield');
    assert.equal(career.fit('lapShield'), 'energy', `needs ${MODS.lapShield.energy}`);
    career.buyMod('scrapHunter');
    assert.equal(career.fit('scrapHunter'), 'ok');
    career.buyMod('rallyKit');
    assert.equal(career.fit('rallyKit'), 'slots');
    career.unfit('magnet');
    assert.equal(career.fit('rallyKit'), 'ok');
    assert.deepEqual(career.fitted, ['scrapHunter', 'rallyKit']);
});

test('a race pays the place times the world, plus the pickups, and keeps the best', () => {
    const career = new Career({ credits: 0 }, { worlds: WORLDS });
    const first = career.finishRace('c', { position: 2, bestLap: 61.5, cash: 120 }, 2);
    assert.equal(first.prize, PRIZES[1] * 2);
    assert.equal(first.total, PRIZES[1] * 2 + 120);
    assert.equal(career.credits, first.total);
    assert.ok(first.newBest && first.newLap);
    const second = career.finishRace('c', { position: 4, bestLap: 60, cash: 0 }, 2);
    assert.ok(!second.newBest && second.newLap);
    assert.deepEqual(career.results.c, { best: 2, bestLap: 60 });
});

test('a podium opens the next track; a world opens when every track of the one before is on the podium', () => {
    const career = new Career({}, { worlds: WORLDS });
    assert.ok(career.isTrackOpen('a'));
    assert.ok(!career.isTrackOpen('b'));
    assert.deepEqual(finish(career, 'a', 5).unlocked, []);
    assert.deepEqual(finish(career, 'a', 3).unlocked, ['b']);
    assert.equal(career.nextTrack('a'), 'b');
    assert.ok(!career.isWorldOpen(1));
    assert.deepEqual(finish(career, 'b', 1).unlocked, ['c']);
    assert.ok(career.isWorldOpen(1) && !career.isTrackOpen('d'));
});

test('a saved career comes back the same, and a broken save is made safe', () => {
    const career = new Career({ credits: 1e6 });
    career.buyPart('tires');
    career.buyMod('magnet');
    career.fit('magnet');
    const again = new Career(JSON.parse(JSON.stringify(career.toJSON())));
    assert.deepEqual(again.toJSON(), career.toJSON());

    const broken = new Career({ credits: 'lots', parts: { engine: 99, tires: -2 }, owned: ['nope', 'magnet'], fitted: ['magnet', 'ghost'] });
    assert.equal(broken.credits, START_CREDITS);
    assert.equal(broken.parts.engine, PARTS.engine.tiers.length - 1);
    assert.equal(broken.parts.tires, 0);
    assert.deepEqual([...broken.owned], ['magnet']);
    assert.deepEqual(broken.fitted, ['magnet']);
});
