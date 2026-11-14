import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attackReport } from '../js/net/platform.js';

test('an attack reports its destruction as the score and counts for the quests', () => {
    const summary = { victory: true, core_destroyed: true, destruction: 87, heroes: [{ survived: true }, { survived: false }] };
    const report = attackReport(summary, { pvp: false, opponent: 'Scrap Hollow' });
    assert.equal(report.score, 87);
    assert.deepEqual(report.extra_data, {
        attacks: 1, victories: 1, destruction: 87, core_destroyed: 1, pvp: 0, opponent: 'Scrap Hollow', heroes_lost: 1,
    });
    assert.equal(attackReport({ ...summary, victory: false }, { pvp: true, opponent: 'x'.repeat(90) }).extra_data.opponent.length, 40);
});
