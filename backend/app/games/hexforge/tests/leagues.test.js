import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leagueProgress, rivalBlocker } from '../js/core/leagues.js';

const rival = { name: 'Raider BOB', available: true };

test('the league bar fills from the floor of the league to the next one', () => {
    assert.equal(leagueProgress(200, 'Silver', { name: 'Gold', at: 500 }), 0);
    assert.equal(leagueProgress(350, 'Silver', { name: 'Gold', at: 500 }), 0.5);
    assert.equal(leagueProgress(2500, 'Mythic', null), 1);
});

test('a rival can be attacked only from the arena, once scouted and unshielded', () => {
    assert.equal(rivalBlocker({ arena: false }, rival), 'Clear Scrap Hollow to enter the arena');
    assert.equal(rivalBlocker({ arena: true }, null), 'Find a rival first');
    assert.equal(rivalBlocker({ arena: true }, { ...rival, available: false }), 'This rival is shielded now. Find another');
    assert.equal(rivalBlocker({ arena: true }, rival), null);
});
