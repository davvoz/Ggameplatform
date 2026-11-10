/** Display names, roles and colours. Gameplay numbers live on the server. */

export const HERO_INFO = {
    guardian: { name: 'Guardian', role: 'Tank · draws tower fire', color: '#5aa9ff', short: 'G' },
    neon_blade: { name: 'Neon Blade', role: 'Assassin · leaps over walls', color: '#ff3d9a', short: 'B' },
    technomancer: { name: 'Technomancer', role: 'Mage · ranged, area nova', color: '#a77bff', short: 'T' },
};

export const BUILDING_INFO = {
    core: { name: 'Core', height: 34, side: '#2a1430', top: '#47204f', glow: '#ff3db8' },
    wall: { name: 'Wall', height: 20, side: '#1d2533', top: '#2c3a4f', glow: '#39e6ff' },
    rune_tower: { name: 'Rune Tower', height: 62, side: '#2b2416', top: '#4a3a1d', glow: '#ffb547' },
    lightning_tower: { name: 'Lightning Tower', height: 66, side: '#14262e', top: '#1d4250', glow: '#39e6ff' },
    frost_tower: { name: 'Frost Tower', height: 58, side: '#18243a', top: '#2a4466', glow: '#9fe3ff' },
    rune_quarry: { name: 'Rune Quarry', height: 26, side: '#24262b', top: '#3a3d44', glow: '#ffb547' },
    scrap_foundry: { name: 'Scrap Foundry', height: 34, side: '#2e1d16', top: '#4a2c1e', glow: '#ff7a3d' },
    mana_well: { name: 'Mana Well', height: 22, side: '#211a33', top: '#33285a', glow: '#a77bff' },
    data_node: { name: 'Data Node', height: 40, side: '#13261c', top: '#1e3f2d', glow: '#4dff9a' },
    vault: { name: 'Vault', height: 30, side: '#2b2512', top: '#4d401a', glow: '#ffd75e' },
    rune_trap: { name: 'Rune Trap', height: 0, side: '#000', top: '#000', glow: '#ff7a3d' },
};

export const MATERIAL_INFO = {
    rune_stone: { name: 'Rune stone', color: '#ffb547' },
    scrap: { name: 'Scrap', color: '#ff7a3d' },
    mana: { name: 'Mana', color: '#a77bff' },
    chips: { name: 'Chips', color: '#4dff9a' },
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
