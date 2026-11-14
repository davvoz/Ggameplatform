/** Display names, roles, what each thing is for (`what`, one short line; `job`, a word or two for hero tiles) and colours. Gameplay numbers live on the server. */

export const HERO_INFO = {
    guardian: { name: 'Guardian', tag: 'Guardian', role: 'Tank · draws tower fire', job: 'Tank', what: 'Tough tank: nearby towers shoot him, not the others.', color: '#5aa9ff', short: 'G' },
    neon_blade: { name: 'Neon Blade', tag: 'Blade', role: 'Assassin · leaps over walls', job: 'Assassin', what: 'Fast, hits hard and leaps over walls.', color: '#ff3d9a', short: 'B' },
    explorer: { name: 'Explorer', tag: 'Scout', role: 'Scout · never fights', job: 'Missions', what: 'Goes on missions and comes back with surprise loot.', color: '#3fd0a0', short: 'X' },
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
    train: { text: (goal) => `Train your heroes ${goal} times`, icon: 'dagger' },
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

/** Hero items: name, one line on what they do, icon and colour. Numbers come from the server's table. */
export const ITEM_INFO = {
    rune_maul: { name: 'Rune Maul', what: 'A heavier hammer: more damage.', icon: 'hammer', color: '#ff8a3d' },
    aegis_plate: { name: 'Aegis Plate', what: 'Rune-forged plate: more health.', icon: 'shield', color: '#5aa9ff' },
    plasma_edge: { name: 'Plasma Edge', what: 'A hotter blade: more damage.', icon: 'dagger', color: '#ff3d9a' },
    flux_daggers: { name: 'Flux Daggers', what: 'Lighter daggers: faster blows.', icon: 'daggers', color: '#ff7ad1' },
    storm_staff: { name: 'Storm Staff', what: 'More damage, and a stronger nova.', icon: 'staff', color: '#a77bff' },
    focus_lens: { name: 'Focus Lens', what: 'Sees farther: longer reach.', icon: 'eye', color: '#4dfff0' },
    ward_sigil: { name: 'Ward Sigil', what: 'A shield that soaks the first blows.', icon: 'ward', color: '#6fd3ff' },
    mending_rune: { name: 'Mending Rune', what: 'Heals the hero during the fight.', icon: 'heart', color: '#4dd98a' },
    haste_rune: { name: 'Haste Rune', what: 'Moves faster.', icon: 'wing', color: '#ffd27a' },
    treasure_map: { name: 'Treasure Map', what: 'Explorer only: more loot from every mission.', icon: 'map', color: '#3fd0a0' },
    trail_boots: { name: 'Trail Boots', what: 'Explorer only: shorter missions.', icon: 'boot', color: '#c9a36b' },
};

/** The two paths each building type may take at level 3. */
export const PATH_INFO = {
    sniper: { name: 'Sniper', what: 'Shoots farther and harder.', accent: '#ffb347' },
    gatling: { name: 'Gatling', what: 'Shoots much more often.', accent: '#ff6a3d' },
    storm: { name: 'Storm', what: 'Lightning jumps to more heroes.', accent: '#8fd6ff' },
    overload: { name: 'Overload', what: 'One huge bolt.', accent: '#c58bff' },
    glacier: { name: 'Glacier', what: 'Slows heroes more, for longer.', accent: '#9fe3ff' },
    blizzard: { name: 'Blizzard', what: 'A wider, harder frost blast.', accent: '#e8f6ff' },
    bulwark: { name: 'Bulwark', what: 'Much tougher walls.', accent: '#c9a36b' },
    spiked: { name: 'Spiked', what: 'Hurts every hero that strikes it.', accent: '#ff5a4a' },
    inferno: { name: 'Inferno', what: 'A bigger, hotter blast.', accent: '#ff7a3d' },
    snare: { name: 'Snare', what: 'Holds the heroes it catches.', accent: '#7dff9a' },
    rich_vein: { name: 'Rich Vein', what: 'Makes materials faster.', accent: '#ffd36b' },
    deep_store: { name: 'Deep Store', what: 'Holds far more before it is full.', accent: '#5aa9ff' },
    strongbox: { name: 'Strongbox', what: 'Keeps more of each material safe from raiders.', accent: '#ffd75e' },
    armored: { name: 'Armored', what: 'Much harder to break.', accent: '#a7b3c2' },
    citadel: { name: 'Citadel', what: 'A much tougher Core.', accent: '#ffb347' },
    beacon: { name: 'Beacon', what: 'The Core shoots heroes that come close.', accent: '#ff3d9a' },
};

/** The Explorer's missions: how long, and a hint of what they may bring. */
export const MISSION_INFO = {
    scout: { name: 'Scouting', line: 'A quick look around: some materials, maybe a bonus.' },
    expedition: { name: 'Expedition', line: 'Further out: more materials, often a bonus, sometimes an item.' },
    voyage: { name: 'Long voyage', line: 'Deep into the wilds: lots of materials, bonuses, a good chance of an item.' },
};

/** What an item's effect amounts to, in words: effectText('hp_pct', 18) → '+18% health'. */
export function effectText(effect, value) {
    switch (effect) {
        case 'damage_pct': return `+${value}% damage`;
        case 'loot_pct': return `+${value}% loot`;
        case 'trip_pct': return `−${value}% mission time`;
        case 'hp_pct': return `+${value}% health`;
        case 'haste_pct': return `blows ${value}% faster`;
        case 'spell_pct': return `+${value}% damage and nova`;
        case 'range': return `+${value} reach`;
        case 'barrier_pct': return `shield of ${value}% health`;
        case 'regen_pct': return `heals ${value}% health a second`;
        case 'speed_pct': return `+${value}% speed`;
        default: return '';
    }
}

/** " ×n" after a name when there is more than one. */
export function times(n) {
    return n > 1 ? ` ×${n}` : '';
}

/** Each trophy league's colour. */
export const LEAGUE_COLORS = {
    Bronze: '#d08a4c',
    Silver: '#c3cbdb',
    Gold: '#ffd75e',
    Neon: '#39e6ff',
    Mythic: '#ff3d9a',
};

/** "+30" / "−20" / "0" for a trophy change. */
export function signed(n) {
    if (n > 0) return `+${n}`;
    if (n < 0) return `−${-n}`;
    return '0';
}

/** How far the next league is, or a line for the top league. */
export function progressText(me) {
    if (!me.next_league) return 'Top league reached.';
    return `${me.next_league.name} at ${me.next_league.at} · ${me.next_league.at - me.trophies} to go`;
}

/** Your place in the ranking, in words. */
export function rankText(me) {
    return me.rank ? `Rank #${me.rank}` : 'Not ranked yet: win a raid against a rival';
}

/** The line under a rival's name: what the raid is worth. */
export function stakesText(stakes) {
    return `Win ${signed(stakes.win)} · lose ${signed(-stakes.loss)} trophies`;
}
