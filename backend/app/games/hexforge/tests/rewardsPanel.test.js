import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLong, headline } from '../js/ui/panels/rewardsPanel.js';

test('a calendar tile shows a bonus first, else the first material, with + when there is more', () => {
    assert.deepEqual(headline({ xp: 10, bonuses: {}, materials: { rune_stone: 80, scrap: 80 } }),
        { icon: 'gem', color: '#ffb547', text: '80+' });
    assert.equal(headline({ xp: 10, bonuses: { hourglass: 1 }, materials: {} }).text, '×1');
    assert.equal(headline({ xp: 40, bonuses: { golden_hourglass: 2, flask: 1 }, materials: { mana: 5 } }).text, '×2+');
    assert.equal(headline({ xp: 10, bonuses: { salve: 1 }, materials: {} }).icon, 'salve');
});

test('long countdowns switch to days', () => {
    assert.equal(formatLong(59), '0:59');
    assert.equal(formatLong(3 * 3600 + 5), '3:00:05');
    assert.equal(formatLong(2 * 86400 + 5 * 3600 + 100), '2 d 5 h');
});
