import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CareerSync } from '../js/app/CareerSync.js';
import { Career } from '../js/sim/Career.js';

/**
 * A server holding one career with the game's own rules (the real one,
 * apex_drive_be, applies the same: tools/export-economy.js), answering as
 * ApexServer does. `refuse` makes the next calls of a kind fail with a code;
 * `slow` holds every answer until `release()`.
 */
function fakeServer(start = {}) {
    const career = new Career(start);
    const calls = [];
    const refuse = {};
    let held = [];
    let slow = false;
    const answer = (kind, work) => {
        calls.push(kind);
        const reply = () => {
            if (refuse[kind]) return { ok: false, code: refuse[kind] };
            const extra = work?.() ?? {};
            return { ok: true, data: { career: career.toJSON(), ...extra } };
        };
        if (!slow) return Promise.resolve(reply());
        return new Promise((resolve) => held.push(() => resolve(reply())));
    };
    return {
        career,
        calls,
        refuse,
        hold: () => { slow = true; },
        release: () => {
            slow = false;
            const pending = held;
            held = [];
            pending.forEach((go) => go());
        },
        loadCareer: () => answer('load'),
        buyPart: (category) => answer('part', () => ({ answer: career.buyPart(category) })),
        buyMod: (id) => answer('mod', () => ({ answer: career.buyMod(id) })),
        setFitted: (mods) => answer('fitted', () => {
            for (const id of [...career.fitted]) career.unfit(id);
            mods.forEach((id) => career.fit(id));
        }),
        startRace: () => answer('start', () => ({ raceId: 'r1', seed: career.races + 1 })),
        finishRace: (id, result) => answer('finish', () => ({ payout: career.finishRace('duskValley', result, 1), id })),
        challenge: () => answer('challenge', () => ({ weekId: '2026-W47', trackId: 'underpass' })),
        startRun: () => answer('run'),
        finishRun: () => answer('runEnd', () => ({ score: 8000 })),
    };
}

const offline = () => ({ loadCareer: async () => ({ ok: false, code: 'offline' }) });

test('the career comes from the server; without one it lives for the visit', async () => {
    const server = fakeServer({ credits: 4321, races: 7 });
    const sync = new CareerSync(server);
    assert.equal(await sync.load(), true);
    assert.equal(sync.career.credits, 4321);
    assert.equal(sync.career.races, 7);

    const alone = new CareerSync(offline());
    assert.equal(await alone.load(), false);
    assert.equal(alone.career.credits, new Career().credits);
    assert.equal(alone.buyPart('tires'), 'ok', 'the rules still answer');
    await alone.settled();
});

test('a purchase answers at once, then the server has the last word', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    assert.equal(sync.buyPart('tires'), 'ok');
    assert.equal(sync.career.parts.tires, 1, 'at once');
    assert.equal(sync.buyPart('engine'), 'credits', 'refused here: nothing sent');
    await sync.settled();
    assert.deepEqual(server.calls, ['load', 'part']);
    assert.deepEqual(sync.career.toJSON(), server.career.toJSON());
});

test('a mod bought is fitted, on the server too', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    assert.equal(sync.buyMod('magnet'), 'ok');
    assert.deepEqual(sync.career.fitted, ['magnet']);
    sync.unfit('magnet');
    assert.equal(sync.fit('magnet'), 'ok');
    await sync.settled();
    assert.deepEqual(server.career.fitted, ['magnet']);
    assert.deepEqual(sync.career.toJSON(), server.career.toJSON());
});

test('answers still on their way do not undo the changes made after', async () => {
    const server = fakeServer({ credits: 5000 });
    const sync = new CareerSync(server);
    await sync.load();
    server.hold();
    sync.buyPart('tires');
    sync.buyPart('aero');
    server.release();
    // the first answer (tyres only) comes while the second is pending: it must not undo the aero
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(sync.career.parts.aero, 1);
    server.release();
    await sync.settled();
    assert.deepEqual(sync.career.toJSON(), server.career.toJSON());
});

test('a change the server refuses is undone: its career comes back', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    server.refuse.part = 'credits';
    sync.buyPart('tires');
    assert.equal(sync.career.parts.tires, 1);
    await sync.settled();
    assert.equal(sync.career.parts.tires, 0);
    assert.equal(sync.career.credits, server.career.credits);
});

test('a race is paid here at once and on the server, with the id it gave at the start', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    const race = sync.startRace('duskValley');
    assert.equal(race.seed, 1);
    const payout = sync.finishRace(race, 'duskValley', { position: 1, bestLap: 50, cash: 120 }, 1);
    assert.equal(payout.total, 1500 + 120);
    await sync.settled();
    assert.deepEqual(server.calls, ['load', 'start', 'finish']);
    assert.deepEqual(sync.career.toJSON(), server.career.toJSON());
});

test('a race the server finds impossible is not paid', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    server.refuse.finish = 'impossible_lap';
    const race = sync.startRace('duskValley');
    sync.finishRace(race, 'duskValley', { position: 1, bestLap: 1, cash: 0 }, 1);
    assert.equal(sync.career.credits, 3000, 'shown at once');
    await sync.settled();
    assert.equal(sync.career.credits, 1500, 'taken back');
});

test('the challenge comes from the server: nothing without one', async () => {
    const server = fakeServer();
    const sync = new CareerSync(server);
    await sync.load();
    assert.equal((await sync.challenge()).trackId, 'underpass');
    server.refuse.challenge = 'offline';
    assert.equal(await sync.challenge(), null);
});
