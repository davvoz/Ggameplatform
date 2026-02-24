/**
 * WorldConfig — Central registry for world metadata.
 *
 * Pure data module — no game-object imports.
 * Used by CinematicManager, LevelManager, main.js, LevelData, etc.
 *
 * To add a new world:
 *   1. Append an entry to WORLDS[]
 *   2. Add corresponding BOSS_DEFS / MINIBOSS_DEFS in Enemy.js
 *   3. Add 30 levels in LevelData.js
 *   Everything else (cinematics, transitions, UI) adapts automatically.
 */

export const LEVELS_PER_WORLD = 30;
export const BOSS_INTERVAL = 5;       // boss every N levels within a world
export const ITEM_SHOWCASE_TIME = 3.0; // seconds per entity in cinematics

const WORLDS = [
    {
        id: 1,
        name: 'Deep Space',
        subtitle: 'INTO THE VOID',
        icon: '◆',
        themeColor: '#4488ff',
        bossIds: [1, 2, 3, 4, 5, 6],
        miniBossIds: [1, 2, 3, 4],
        planets: null
    },
    {
        id: 2,
        name: 'Planetary Flyover',
        subtitle: 'OVER THE WORLDS',
        icon: '◇',
        themeColor: '#44ff88',
        bossIds: [7, 8, 9, 10, 11, 12],
        miniBossIds: [5, 6, 7, 8],
        planets: ['Alien Jungle', 'Volcanic', 'Frozen', 'Desert', 'Mechanical', 'Toxic']
    }
];

// ─── Queries ─────────────────────────────────────────────

/** Get world config by 1-based world number. */
export function getWorldConfig(worldNum) {
    return WORLDS[worldNum - 1] || null;
}

/** Total number of defined worlds. */
export function getWorldCount() {
    return WORLDS.length;
}

/** Which world does a given absolute level belong to? (1-based) */
export function getWorldForLevel(level) {
    return Math.ceil(level / LEVELS_PER_WORLD);
}

/** Level number within its world (1-30). */
export function getWorldLevel(level) {
    return ((level - 1) % LEVELS_PER_WORLD) + 1;
}

/** Is this level a boss level? */
export function isBossLevel(level) {
    return getWorldLevel(level) % BOSS_INTERVAL === 0;
}

/** Planet index within a world that has planets (-1 if none). */
export function getPlanetIndex(level) {
    const wc = getWorldConfig(getWorldForLevel(level));
    if (!wc || !wc.planets) return -1;
    const levelsPerPlanet = LEVELS_PER_WORLD / wc.planets.length;
    return Math.floor((getWorldLevel(level) - 1) / levelsPerPlanet);
}

/** Planet name for the given level (null if world has no planets). */
export function getPlanetName(level) {
    const wc = getWorldConfig(getWorldForLevel(level));
    if (!wc || !wc.planets) return null;
    const idx = getPlanetIndex(level);
    return idx >= 0 ? wc.planets[idx] : null;
}

export { WORLDS };
