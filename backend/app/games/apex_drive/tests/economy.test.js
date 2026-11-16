import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ECONOMY_FILE, economyData, economyJson } from '../tools/economy.js';

test('the server reads the same rules as the game: run node tools/export-economy.js after changing them', () => {
    assert.equal(readFileSync(ECONOMY_FILE, 'utf8'), economyJson());
});

test('the rules the server needs are all there', () => {
    const data = economyData();
    for (const world of data.worlds) {
        assert.ok(world.prizeScale > 0, world.id);
        for (const id of world.tracks) {
            const track = data.tracks[id];
            assert.ok(track.laps > 0 && track.lapLength > 0, id);
            assert.ok(track.cashPerLap > 0, `${id}: no cash on the road`);
        }
    }
    assert.equal(data.prizes.length, data.racers, 'a prize for every place');
    for (const [id, tiers] of Object.entries(data.parts)) assert.equal(tiers[0].price, 0, `${id}: the stock part is free`);
});
