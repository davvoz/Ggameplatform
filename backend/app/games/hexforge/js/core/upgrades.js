/** Building upgrade rules: a type's stats at a level and path, and what blocks the next level. */

/** The stats of a type at a level (and path, from level 3). */
export function statsAt(table, level, path) {
    const row = table.stats[String(level)];
    return path && row[path] ? row[path] : row;
}

/** Why the type cannot be upgraded now, or null. */
export function upgradeBlocker({ type, level, coreLevel, maxLevel, cost, materials, freeSlots, busy }) {
    if (busy) return 'Already at the forge.';
    if (level >= maxLevel) return null;
    if (type !== 'core' && level + 1 > coreLevel) return `Upgrade the Core to level ${level + 1} first.`;
    if (freeSlots <= 0) return 'The forge is full: wait for a free slot.';
    if (Object.entries(cost).some(([m, n]) => (materials[m] ?? 0) < n)) return 'Not enough materials.';
    return null;
}
