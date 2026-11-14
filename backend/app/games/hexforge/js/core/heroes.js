/** Hero rules: a hero's state, its stats and gear, what blocks evolving or training, an Explorer's trips. */

export const INJURY_SECONDS = 900;   // as on the server: a fallen hero heals in 15 minutes

/** True when the hero has the XP for its next tier and is not at the forge already. */
export function evolveReady(hero, tierXp) {
    if (hero.cls === 'explorer') return false;
    const next = (hero.tier ?? 1) + 1;
    return next <= 3 && !hero.evolving && (hero.xp ?? 0) >= (tierXp?.[next] ?? Infinity);
}

/** 'forge' while evolving, 'hurt' while healing, else 'picked' or 'ready'; plus the seconds left to heal. */
export function heroStatus(hero, picked, serverNow) {
    if (hero.cls === 'explorer') {
        if (!hero.mission) return { state: 'home', left: 0, healed: 1 };
        const left = hero.mission.ready_at - serverNow;
        return left > 0 ? { state: 'away', left, healed: 1 } : { state: 'back', left: 0, healed: 1 };
    }
    if (hero.evolving) return { state: 'forge', left: 0, healed: 1 };
    const left = hero.injured_until ? hero.injured_until - serverNow : 0;
    if (left > 0) return { state: 'hurt', left, healed: Math.max(0, Math.min(1, 1 - left / INJURY_SECONDS)) };
    return { state: picked ? 'picked' : 'ready', left: 0, healed: 1 };
}

/** How far through its trip an Explorer is, 0..1. */
export function tripProgress(trip, now) {
    const span = trip.ready_at - trip.started_at;
    return span > 0 ? Math.max(0, Math.min(1, (now - trip.started_at) / span)) : 1;
}

/** The stats of a hero as it is (or as `form` at `tier`), from the server's table. */
export function statsOf(table, cls, form = null, tier = 1) {
    if (!form || tier <= 1) return table.stats[cls].base;
    return table.stats[cls][form][String(tier)];
}

/**
 * The stats of a new form or tier, carrying the same gear: each stat keeps
 * the share the items add now (`base` = without items, `shown` = with them).
 */
export function withGear(target, base, shown) {
    const out = { ...target };
    for (const key of Object.keys(target)) {
        if (!(key in shown) || !(key in base) || typeof target[key] !== 'number') continue;
        if (key === 'barrier' || key === 'regen') continue;
        const ratio = base[key] ? shown[key] / base[key] : 1;
        const value = base[key] ? target[key] * ratio : target[key] + (shown[key] - base[key]);
        out[key] = Number.isInteger(target[key]) ? Math.round(value) : Math.round(value * 100) / 100;
    }
    return out;
}

/** The items that fit `slot` of a hero of `cls`: weapons of its class, or any spell. */
export function fittingItems(items, table, cls, slot) {
    return items.filter((i) => {
        const row = table.items[i.type];
        if (row.slot !== slot) return false;
        if (cls === 'explorer') return row.cls === 'explorer';      // the Explorer carries only its own gear
        return row.cls === null || row.cls === cls;
    });
}

/** Why the hero cannot go to the forge now, or null. */
export function evolveBlocker({ hero, table, materials, freeSlots, serverNow }) {
    const next = (hero.tier ?? 1) + 1;
    if (next > 3) return 'Fully ascended';
    if (hero.evolving) return 'Already at the forge';
    const need = table.tier_xp[String(next)];
    if ((hero.xp ?? 0) < need) return `${need - (hero.xp ?? 0)} more XP from fighting`;
    if (hero.injured_until && hero.injured_until > serverNow) return 'Hurt: wait until healed';
    if (freeSlots <= 0) return 'All forge slots are busy';
    const { cost } = table.costs[hero.cls][String(next)];
    if (Object.entries(cost).some(([m, n]) => (materials[m] ?? 0) < n)) return 'Not enough materials';
    return null;
}

/** A top-tier hero's mastery: its level, what it adds, and the bar inside the level. */
export function masteryOf(points, { perLevel, levels, bonus }) {
    const level = Math.min(levels, Math.floor(points / perLevel));
    const maxed = level >= levels;
    return { level, maxed, into: maxed ? perLevel : points - level * perLevel, pct: Math.round(bonus * 100 * level) };
}

/** Why this hero cannot train right now, or null. */
export function trainBlocker(hero, training, serverNow) {
    if (hero.evolving) return 'At the forge';
    if (hero.injured_until && hero.injured_until > serverNow) return 'Hurt: heal first';
    if (training.left <= 0) return 'Rested for today: back tomorrow';
    return null;
}

/** How long a mission takes for this Explorer: the Trail Boots shorten it. */
export function tripSeconds(seconds, gear, itemTable) {
    const boots = gear?.spell?.type === 'trail_boots' ? gear.spell : null;
    const cut = boots ? itemTable.items.trail_boots.levels[boots.level - 1] : 0;
    return Math.round(seconds * (1 - cut / 100));
}
