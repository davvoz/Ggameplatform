import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canFuse, fusionCandidates } from '../js/core/fusion.js';

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
