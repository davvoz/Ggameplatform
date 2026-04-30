import { C_MEDIUM_BLUE } from './entities/LevelsThemes.js';
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
export const ITEM_SHOWCASE_TIME = 3; // seconds per entity in cinematics

const WORLDS = [
    {
        id: 1,
        name: 'Deep Space',
        subtitle: 'INTO THE VOID',
        icon: '◆',
        themeColor: C_MEDIUM_BLUE,
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
    },
    {
        id: 3,
        name: 'Simulation Break',
        subtitle: 'BEYOND THE CODE',
        icon: '⬡',
        themeColor: '#00ffcc',
        bossIds: [13, 14, 15, 16, 17, 18],
        miniBossIds: [9, 10, 11, 12],
        planets: null
    },
    {
        id: 4,
        name: 'Quantum Realm',
        subtitle: 'INTO THE STANDARD MODEL',
        icon: '⚛',
        themeColor: '#ff44ff',
        bossIds: [19, 20, 21, 22, 23, 24],
        miniBossIds: [13, 14, 15, 16],
        planets: null
    },
    {
        // World 5 — alternative survivor mode (see Game.gameMode === 'survivor').
        // Reuses bosses (final of each source world) and 12 mini-bosses.
        id: 5,
        name: 'Custom Survivor',
        subtitle: 'ADAPTIVE ARENA',
        icon: '◈',
        themeColor: '#ff44ff',
        bossIds: [6, 12, 18, 24],
        miniBossIds: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
        planets: null,
        mode: 'survivor'
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
    if (!wc?.planets) return -1;
    const levelsPerPlanet = LEVELS_PER_WORLD / wc.planets.length;
    return Math.floor((getWorldLevel(level) - 1) / levelsPerPlanet);
}

/** Planet name for the given level (null if world has no planets). */
export function getPlanetName(level) {
    const wc = getWorldConfig(getWorldForLevel(level));
    if (!wc?.planets) return null;
    const idx = getPlanetIndex(level);
    return idx >= 0 ? wc.planets[idx] : null;
}

export { WORLDS };
