import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildingLines, canFuse, fusionBlocker, fusionCandidates, groupCandidates, heroLines, partName, togglePick,
} from '../js/fusionPanel.js';

const FUSION = { base_types: ['rune_tower', 'frost_tower', 'mana_well', 'wall'], donor_types: ['rune_tower', 'frost_tower', 'mana_well', 'wall', 'rune_trap'] };

function state() {
    return {
        fusion: FUSION,
        upgrades: { max_level: 5, levels: { rune_tower: { level: 5 }, frost_tower: { level: 5 }, mana_well: { level: 3 }, rune_trap: { level: 5 } } },
        city: {
            buildings: [
                { id: 1, type: 'rune_tower' }, { id: 2, type: 'frost_tower' }, { id: 3, type: 'mana_well' },
                { id: 4, type: 'rune_trap' }, { id: 5, type: 'rune_tower', fusion: { grade: 1, parts: [] } },
                { id: 6, type: 'core' },
            ],
        },
        heroes: [
            { id: 1, cls: 'guardian', tier: 3, form: 'bastion' }, { id: 2, cls: 'neon_blade', tier: 3, form: 'reaper' },
            { id: 3, cls: 'technomancer', tier: 2, form: 'archon' }, { id: 4, cls: 'explorer' },
            { id: 5, cls: 'neon_blade', tier: 3, form: 'phantom', evolving: 9 },
        ],
    };
}

test('only maxed buildings and ascended heroes can be a base; never the core or the explorer', () => {
    const s = state();
    assert.equal(canFuse('building', s.city.buildings[0], s), true);
    assert.equal(canFuse('building', s.city.buildings[2], s), false);      // mana well only level 3
    assert.equal(canFuse('building', s.city.buildings[3], s), false);      // a trap is never a body
    assert.equal(canFuse('building', s.city.buildings[5], s), false);
    assert.equal(canFuse('hero', s.heroes[0], s), true);
    assert.equal(canFuse('hero', s.heroes[2], s), false);
    assert.equal(canFuse('hero', s.heroes[3], s), false);
    assert.equal(canFuse('hero', s.heroes[4], s), false);                  // at the forge
});

test('candidates are maxed, free and of the same grade, of any kind', () => {
    const s = state();
    assert.deepEqual(fusionCandidates('building', s.city.buildings[0], s).map((b) => b.id), [2, 4]);
    assert.deepEqual(fusionCandidates('building', s.city.buildings[4], s).map((b) => b.id), []);
    assert.deepEqual(fusionCandidates('hero', s.heroes[0], s).map((h) => h.id), [2]);
});

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
