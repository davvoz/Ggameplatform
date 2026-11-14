import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raidOutcome, timeAgo, unseenText } from '../js/ui/raidLog.js';

test('raid times read like a feed', () => {
    assert.equal(timeAgo(20), 'just now');
    assert.equal(timeAgo(5 * 60), '5 min ago');
    assert.equal(timeAgo(3 * 3600 + 10), '3 h ago');
    assert.equal(timeAgo(86400), '1 day ago');
    assert.equal(timeAgo(3 * 86400), '3 days ago');
});

test('a raid reads from the defender side', () => {
    assert.equal(raidOutcome({ breached: true, destruction: 100, core_destroyed: true }), 'Breached · 100% destroyed · core destroyed');
    assert.equal(raidOutcome({ breached: false, destruction: 30, core_destroyed: false }), 'Held · 30% destroyed');
    assert.equal(unseenText(1), 'You were raided 1 time while away.');
    assert.equal(unseenText(3), 'You were raided 3 times while away.');
});
