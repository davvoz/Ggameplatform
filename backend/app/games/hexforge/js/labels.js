/** Display names, roles, what each thing is for (`what`, one short line; `job`, a word or two for hero tiles) and colours. Gameplay numbers live on the server. */

export const HERO_INFO = {
    guardian: { name: 'Guardian', tag: 'Guardian', role: 'Tank · draws tower fire', job: 'Tank', what: 'Tough tank: nearby towers shoot him, not the others.', color: '#5aa9ff', short: 'G' },
    neon_blade: { name: 'Neon Blade', tag: 'Blade', role: 'Assassin · leaps over walls', job: 'Leaps walls', what: 'Fast, hits hard and leaps over walls.', color: '#ff3d9a', short: 'B' },
    technomancer: { name: 'Technomancer', tag: 'Mage', role: 'Mage · ranged, area nova', job: 'Ranged', what: 'Hits from afar; every few seconds a blast on an area.', color: '#a77bff', short: 'T' },
};

/**
 * `height`: top of the body (bars sit above it); `pick`: top of the whole
 * silhouette, chimneys and braziers included (clicks and bubbles use it);
 * `glow`: the building's signature colour. Heights are unscaled pixels.
 */
export const BUILDING_INFO = {
    core: { name: 'Core', what: 'The heart of your city: if it falls, the raider wins.', height: 44, pick: 84, glow: '#ff7a1a' },
    wall: { name: 'Wall', what: 'Blocks the way: heroes must break it or go round.', height: 26, pick: 26, glow: '#ff8a2a' },
    rune_tower: { name: 'Rune Tower', what: 'Shoots one hero, from far away.', height: 68, pick: 96, glow: '#ffb347' },
    lightning_tower: { name: 'Lightning Tower', what: 'Lightning that jumps across up to 3 heroes.', height: 68, pick: 98, glow: '#6fd3ff' },
    frost_tower: { name: 'Frost Tower', what: 'Hits a small area and slows heroes down.', height: 68, pick: 94, glow: '#9fe3ff' },
    rune_quarry: { name: 'Rune Quarry', what: 'Makes rune stone for the forge. Tap to collect.', height: 20, pick: 46, glow: '#ffb547' },
    scrap_foundry: { name: 'Scrap Foundry', what: 'Makes scrap for the forge. Tap to collect.', height: 30, pick: 66, glow: '#ff7a3d' },
    mana_well: { name: 'Mana Well', what: 'Makes mana for the forge. Tap to collect.', height: 14, pick: 30, glow: '#b48cff' },
    data_node: { name: 'Data Node', what: 'Makes chips for the forge. Tap to collect.', height: 46, pick: 56, glow: '#4dff9a' },
    vault: { name: 'Vault', what: 'Keeps 400 of each material safe from raiders.', height: 34, pick: 40, glow: '#ffd75e' },
    rune_trap: { name: 'Rune Trap', what: 'Hidden mine: blows up when a hero steps on it.', height: 0, pick: 0, glow: '#ff7a3d' },
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

/** Speed-up bonuses: what they are called, what they do, which icon and colour. */
export const BONUS_INFO = {
    hourglass: { name: 'Hourglass', effect: '−15 min', what: '15 minutes off a forge job, a hurt hero or the energy.', icon: 'hourglass', color: '#ffd27a' },
    golden_hourglass: { name: 'Golden hourglass', effect: '−1 hour', what: 'One hour off a forge job, a hurt hero or the energy.', icon: 'hourglass', color: '#ffb300' },
    salve: { name: 'Healing salve', effect: 'Heal now', what: 'Heals a hurt hero at once.', icon: 'salve', color: '#4dd98a' },
    flask: { name: 'Energy flask', effect: '+1 energy', what: 'One more attack charge right now.', icon: 'flask', color: '#6fd3ff' },
};

/** Which bonuses work on what: a forge job, a hurt hero, the energy. */
export const BONUS_TARGETS = {
    job: ['hourglass', 'golden_hourglass'],
    hero: ['salve', 'hourglass', 'golden_hourglass'],
    energy: ['flask', 'hourglass', 'golden_hourglass'],
};

/** Daily tasks: their line (from the goal) and icon. */
export const TASK_INFO = {
    collect_times: { text: (goal) => `Collect from your buildings ${goal} times`, icon: 'collect' },
    collect_units: { text: (goal) => `Collect ${goal} materials`, icon: 'gem' },
    forge: { text: (goal) => `Start ${goal} jobs at the forge`, icon: 'anvil' },
    claim: { text: (goal) => `Claim ${goal} forged items`, icon: 'gift' },
    attack: { text: (goal) => `Attack ${goal} times`, icon: 'attack' },
    win: { text: (goal) => (goal === 1 ? 'Win an attack' : `Win ${goal} attacks`), icon: 'trophy' },
};

/** Evolved forms: name, class, what they are good at, and their accent colour. */
export const FORM_INFO = {
    bastion: { name: 'Bastion', cls: 'guardian', what: 'Tougher, and towers turn on him from farther away.', accent: '#ffd36b' },
    warlord: { name: 'Warlord', cls: 'guardian', what: 'A heavier hammer that also hits the buildings around.', accent: '#ff5a2a' },
    phantom: { name: 'Phantom', cls: 'neon_blade', what: 'Faster on its feet, and strikes more often.', accent: '#8ff7ff' },
    reaper: { name: 'Reaper', cls: 'neon_blade', what: 'Harder blows, and far harder on towers.', accent: '#b6ff4d' },
    archon: { name: 'Archon', cls: 'technomancer', what: 'A bigger, stronger nova, more often.', accent: '#ffd36b' },
    arcanist: { name: 'Arcanist', cls: 'technomancer', what: 'Hits from much farther away, and harder.', accent: '#4dfff0' },
};

/** Tier names: 1 base, 2 evolved, 3 ascended. */
export const TIER_NAMES = { 1: 'Recruit', 2: 'Evolved', 3: 'Ascended' };
