import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressText, rankText, signed, stakesText } from '../js/core/leagues.js';

test('trophy changes read with their sign', () => {
    assert.equal(signed(30), '+30');
    assert.equal(signed(-20), '−20');
    assert.equal(signed(0), '0');
});

test('the next league and the rank read as sentences', () => {
    assert.equal(progressText({ trophies: 140, next_league: { name: 'Silver', at: 200 } }), 'Silver at 200 · 60 to go');
    assert.equal(progressText({ trophies: 2400, next_league: null }), 'Top league reached.');
    assert.equal(rankText({ rank: 3 }), 'Rank #3');
    assert.match(rankText({ rank: null }), /Not ranked yet/);
});

test('a rival card says what the raid is worth', () => {
    assert.equal(stakesText({ win: 40, loss: 10 }), 'Win +40 · lose −10 trophies');
});
