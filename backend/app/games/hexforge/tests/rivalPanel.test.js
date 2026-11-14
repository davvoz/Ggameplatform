import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rivalBlocker } from '../js/core/leagues.js';

const rival = { name: 'Raider BOB', available: true };

test('a rival can be attacked only from the arena, once scouted and unshielded', () => {
    assert.equal(rivalBlocker({ arena: false }, rival), 'Clear Scrap Hollow to enter the arena');
    assert.equal(rivalBlocker({ arena: true }, null), 'Find a rival first');
    assert.equal(rivalBlocker({ arena: true }, { ...rival, available: false }), 'This rival is shielded now. Find another');
    assert.equal(rivalBlocker({ arena: true }, rival), null);
});
