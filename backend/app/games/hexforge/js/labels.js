/** Display names, roles and colours. Gameplay numbers live on the server. */

export const HERO_INFO = {
    guardian: { name: 'Guardian', tag: 'Guardian', role: 'Tank · draws tower fire', color: '#5aa9ff', short: 'G' },
    neon_blade: { name: 'Neon Blade', tag: 'Blade', role: 'Assassin · leaps over walls', color: '#ff3d9a', short: 'B' },
    technomancer: { name: 'Technomancer', tag: 'Mage', role: 'Mage · ranged, area nova', color: '#a77bff', short: 'T' },
};

/**
 * `height`: top of the body (bars sit above it); `pick`: top of the whole
 * silhouette, chimneys and braziers included (clicks and bubbles use it);
 * `glow`: the building's signature colour. Heights are unscaled pixels.
 */
export const BUILDING_INFO = {
    core: { name: 'Core', height: 44, pick: 84, glow: '#ff7a1a' },
    wall: { name: 'Wall', height: 26, pick: 26, glow: '#ff8a2a' },
    rune_tower: { name: 'Rune Tower', height: 68, pick: 96, glow: '#ffb347' },
    lightning_tower: { name: 'Lightning Tower', height: 68, pick: 98, glow: '#6fd3ff' },
    frost_tower: { name: 'Frost Tower', height: 68, pick: 94, glow: '#9fe3ff' },
    rune_quarry: { name: 'Rune Quarry', height: 20, pick: 46, glow: '#ffb547' },
    scrap_foundry: { name: 'Scrap Foundry', height: 30, pick: 66, glow: '#ff7a3d' },
    mana_well: { name: 'Mana Well', height: 14, pick: 30, glow: '#b48cff' },
    data_node: { name: 'Data Node', height: 46, pick: 56, glow: '#4dff9a' },
    vault: { name: 'Vault', height: 34, pick: 40, glow: '#ffd75e' },
    rune_trap: { name: 'Rune Trap', height: 0, pick: 0, glow: '#ff7a3d' },
};

export const MATERIAL_INFO = {
    rune_stone: { name: 'Rune stone', color: '#ffb547', icon: 'gem' },
    scrap: { name: 'Scrap', color: '#ff7a3d', icon: 'gear' },
    mana: { name: 'Mana', color: '#b48cff', icon: 'drop' },
    chips: { name: 'Chips', color: '#4dff9a', icon: 'chip' },
};

export const SIDE_INFO = {
    north: 'North', east: 'East', south: 'South', west: 'West',
};

export const PRIORITY_INFO = {
    towers: { name: 'Towers', hint: 'Blades and mages hunt the defences first' },
    core: { name: 'Core', hint: 'Straight for the heart of the city' },
    production: { name: 'Production', hint: 'Raid the quarries, wells and vault' },
};

export const TACTIC_INFO = {
    compact: { name: 'Compact', hint: 'One group, marching at the pace of the slowest' },
    spread: { name: 'Spread', hint: 'Fan out along the edge, everyone at full speed' },
    split: { name: 'Split', hint: 'Two pairs entering from two points' },
};

export const AIM_INFO = {
    closest: { name: 'Closest', hint: 'Shoots the nearest hero.' },
    weakest: { name: 'Weakest', hint: 'Finishes off the hero with the least health.' },
    ranged: { name: 'Back line', hint: 'Hunts ranged heroes like the Technomancer first.' },
};

/** Icons for the attack plan choices (ids of the sprite in index.html). */
export const CHOICE_ICONS = {
    side: { north: 'arrow', east: 'arrow', south: 'arrow', west: 'arrow' },
    priority: { towers: 'tower', core: 'flame', production: 'pick' },
    tactic: { compact: 'compact', spread: 'spread', split: 'split' },
    aim: { closest: 'aim', weakest: 'hero', ranged: 'bolt' },
};
