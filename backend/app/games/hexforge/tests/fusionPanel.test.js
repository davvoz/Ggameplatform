import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildingLines, fusionBlocker, groupCandidates, heroLines, partName } from '../js/ui/panels/fusionPanel.js';
import { togglePick } from '../js/core/fusion.js';

test('buildings of one type share a tile; taps add one more, then put one back', () => {
    const walls = [{ id: 7, type: 'wall' }, { id: 8, type: 'wall' }, { id: 9, type: 'wall' }, { id: 2, type: 'frost_tower' }];
    const groups = groupCandidates('building', walls, [8]);
    assert.deepEqual(groups.map((g) => [g.key, g.ids.length, g.picked]), [['wall', 3, 1], ['frost_tower', 1, 0]]);
    assert.deepEqual(togglePick([], [7, 8, 9]), [7]);
    assert.deepEqual(togglePick([7], [7, 8, 9]), [7, 8]);
    assert.deepEqual(togglePick([7, 8], [7, 8, 9]), [7]);
    assert.deepEqual(togglePick([2], [2]), []);                 // the only frost tower: a second tap puts it back
    assert.deepEqual(togglePick([7, 8], [2]), [7, 8]);          // full: a tile not picked does nothing
});

test('the blocker asks for two picks, a squad left, a free slot and the materials', () => {
    const base = { kind: 'building', picked: [1, 2], cost: { scrap: 10 }, materials: { scrap: 10 }, freeSlots: 1, fighters: 8 };
    assert.equal(fusionBlocker({ ...base, picked: [1] }), 'Pick 1 more');
    assert.equal(fusionBlocker({ ...base, kind: 'hero', fighters: 5 }), 'You need at least 4 fighters left for a squad.');
    assert.equal(fusionBlocker({ ...base, freeSlots: 0 }), 'The forge is full: wait for a free slot.');
    assert.equal(fusionBlocker({ ...base, materials: { scrap: 9 } }), 'Not enough materials.');
    assert.equal(fusionBlocker(base), null);
});

test('parts and stats read in words', () => {
    assert.equal(partName({ type: 'lightning_tower', path: 'storm', power: 1.2 }), 'Lightning Tower ×1.2');
    assert.equal(partName({ type: 'guardian', form: 'bastion', power: 1.44 }), 'Bastion ×1.44');
    const lines = buildingLines({ hp: 4200, weapons: [{ type: 'rune_tower', damage: 160, range: 7, cooldown: 1 }],
        produces: [{ material: 'mana', per_hour: 121 }], blast: 500 });
    assert.equal(lines[0], '4200 health');
    assert.match(lines[1], /^Rune Tower: 160 dmg/);
    assert.equal(lines.length, 4);
    assert.ok(heroLines({ hp: 10, damage: 5, tower_bonus: 1, nova_damage: 0 }).every((l) => !l.includes('towers')));
});
