/**
 * LevelData - Deterministic level definitions for Altitude.
 *
 * Each level defines a fixed set of "screens" (sections).
 * A screen is one viewport-height of content with explicit platform
 * placements, enemies, collectibles and power-ups.
 *
 * Coordinate system:
 *   x  — 0..1  (fraction of DESIGN_WIDTH  = 400px)
 *   y  — 0..1  (fraction of DESIGN_HEIGHT = 700px, 0 = bottom, 1 = top)
 *
 * Platform types: 'normal' | 'fragile' | 'moving' | 'bouncy' | 'cloud' | 'deadly'
 * Enemy types:    'floater' | 'chaser' | 'shooter' | 'bat' | 'ghost'
 * Collectible:    'coin' | 'gem' | 'diamond' | 'star'
 * PowerUp:        'jetpack' | 'shield' | 'magnet' | 'spring_boots' | 'slow_time' | 'double_coins'
 */

// ─── helpers ────────────────────────────────────────────────────────────────
function p(x, y, type = 'normal') { return { x, y, type }; }
function e(x, y, type) { return { x, y, type }; }
function c(x, y, type = 'coin') { return { x, y, type }; }
function pu(x, y, type) { return { x, y, type }; }

/** Cycle `templates` for `times` repetitions → flat array of screens. */
function repeat(templates, times) {
    const result = [];
    for (let i = 0; i < times; i++) result.push(...templates);
    return result;
}

/**
 * Each screen has a platforms array that guarantees a reachable path.
 * The player starts at the bottom platform of each screen.
 *
 * Jump reach ≈ 150-180px high, 250px wide at peak.
 * So horizontal gaps ≤ 260px and vertical gaps ≤ 160px are always reachable.
 */

export const LEVEL_DATA = [

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 1 — Learning the Ropes
    // Pure basics: normal platforms only, a few coins, no enemies.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 1,
        name: 'Learning the Ropes',
        description: 'Master the basics — jump, land, climb.',
        targetAltitude: 2100,
        bgColor: '#0d1a2a',
        bgAccent: '#1a3a5a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.25, 0.22), p(0.75, 0.22),
                    p(0.5, 0.36), p(0.2, 0.5), p(0.8, 0.5),
                    p(0.5, 0.64), p(0.3, 0.78), p(0.7, 0.78),
                    p(0.5, 0.9),
                ],
                enemies: [],
                collectibles: [
                    c(0.25, 0.28), c(0.75, 0.28), c(0.5, 0.42),
                    c(0.2, 0.56), c(0.8, 0.56),
                ],
                powerUps: [],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 2 — Fragile Steps
    // Introduces fragile platforms mixed with normals. Coins reward careful play.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 2,
        name: 'Fragile Steps',
        description: 'Watch your footing — some platforms break!',
        targetAltitude: 4200,
        bgColor: '#1a1a3a',
        bgAccent: '#3a2a5a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.25, 0.22, 'fragile'), p(0.75, 0.22),
                    p(0.5, 0.36), p(0.2, 0.5, 'fragile'), p(0.8, 0.5, 'fragile'),
                    p(0.5, 0.64, 'normal'), p(0.35, 0.78, 'fragile'), p(0.65, 0.78),
                    p(0.5, 0.9),
                ],
                enemies: [],
                collectibles: [
                    c(0.25, 0.28, 'coin'), c(0.75, 0.28, 'coin'),
                    c(0.2, 0.56, 'gem'), c(0.8, 0.56, 'coin'),
                    c(0.5, 0.42, 'coin'),
                ],
                powerUps: [],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.2, 'fragile'), p(0.8, 0.2),
                    p(0.5, 0.34, 'fragile'), p(0.25, 0.5), p(0.75, 0.5, 'fragile'),
                    p(0.5, 0.65), p(0.2, 0.8, 'fragile'), p(0.8, 0.8),
                    p(0.5, 0.92),
                ],
                enemies: [],
                collectibles: [
                    c(0.2, 0.26, 'coin'), c(0.8, 0.26, 'coin'),
                    c(0.5, 0.4, 'gem'), c(0.25, 0.56, 'coin'),
                    c(0.75, 0.56, 'coin'),
                ],
                powerUps: [pu(0.5, 0.15, 'spring_boots')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 3 — Moving Targets
    // Introduces moving platforms. Shield power-up available.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 3,
        name: 'Moving Targets',
        description: 'The ground itself shifts beneath your feet.',
        targetAltitude: 6300,
        bgColor: '#1a2a3a',
        bgAccent: '#2a4a6a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.3, 0.22, 'moving'), p(0.7, 0.22),
                    p(0.5, 0.36, 'moving'), p(0.25, 0.5), p(0.75, 0.5, 'moving'),
                    p(0.5, 0.64), p(0.3, 0.78, 'moving'), p(0.7, 0.78),
                    p(0.5, 0.92),
                ],
                enemies: [],
                collectibles: [
                    c(0.3, 0.28, 'coin'), c(0.7, 0.28, 'coin'),
                    c(0.5, 0.42, 'gem'), c(0.25, 0.56, 'coin'),
                ],
                powerUps: [pu(0.75, 0.56, 'shield')],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.2, 'normal'), p(0.8, 0.2, 'moving'),
                    p(0.5, 0.33, 'fragile'), p(0.25, 0.48, 'moving'), p(0.75, 0.48),
                    p(0.5, 0.62, 'moving'), p(0.25, 0.76), p(0.75, 0.76, 'fragile'),
                    p(0.5, 0.9),
                ],
                enemies: [e(0.5, 2.55, 'floater'), e(0.3, 0.4, 'floater'), e(0.7, 0.4, 'floater')],
                collectibles: [
                    c(0.2, 0.26, 'coin'), c(0.8, 0.26, 'coin'),
                    c(0.5, 0.39, 'gem'), c(0.75, 0.54, 'coin'),
                ],
                powerUps: [pu(0.8, 0.15, 'extra_life')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 4 — Bounce House
    // Bouncy platforms teach momentum. First real enemy variety.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 4,
        name: 'Bounce House',
        description: 'Spring high — but control where you land!',
        targetAltitude: 8400,
        bgColor: '#2a1a3a',
        bgAccent: '#5a2a7a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.25, 0.24, 'bouncy'), p(0.75, 0.24),
                    p(0.5, 0.38, 'bouncy'), p(0.2, 0.52), p(0.8, 0.52, 'bouncy'),
                    p(0.5, 0.66), p(0.35, 0.8, 'bouncy'), p(0.65, 0.8),
                    p(0.5, 0.92),
                ],
                enemies: [e(0.8, 0.3, 'bat'), e(0.3, 0.55, 'floater')],
                collectibles: [
                    c(0.25, 0.3, 'gem'), c(0.75, 0.3, 'coin'),
                    c(0.5, 0.44, 'coin'), c(0.2, 0.58, 'coin'),
                    c(0.8, 0.58, 'gem'),
                ],
                powerUps: [pu(0.5, 0.72, 'jetpack')],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.22, 'bouncy'), p(0.8, 0.22, 'fragile'),
                    p(0.5, 0.36, 'normal'), p(0.3, 0.5, 'bouncy'), p(0.7, 0.5),
                    p(0.5, 0.64, 'bouncy'), p(0.25, 0.78), p(0.75, 0.78, 'moving'),
                    p(0.5, 0.92),
                ],
                enemies: [e(0.5, 0.44, 'bat'), e(0.75, 0.57, 'bat')],
                collectibles: [
                    c(0.2, 0.28, 'coin'), c(0.8, 0.28, 'coin'),
                    c(0.3, 0.56, 'gem'), c(0.7, 0.56, 'coin'),
                    c(0.5, 0.18, 'diamond'),
                ],
                powerUps: [pu(0.8, 0.12, 'extra_life')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 5 — Storm Clouds
    // Cloud platforms (semi-transparent) + chasers. Magnet power-up helps.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 5,
        name: 'Storm Clouds',
        description: 'Clouds fade in and out — move fast!',
        targetAltitude: 10500,
        bgColor: '#2a2a4a',
        bgAccent: '#4a4a7a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.25, 0.22, 'cloud'), p(0.75, 0.22),
                    p(0.5, 0.35, 'cloud'), p(0.2, 0.49), p(0.8, 0.49, 'cloud'),
                    p(0.5, 0.63), p(0.3, 0.77, 'cloud'), p(0.7, 0.77),
                    p(0.5, 0.91),
                ],
                enemies: [e(0.5, 0.43, 'chaser')],
                collectibles: [
                    c(0.25, 0.28, 'coin'), c(0.75, 0.28, 'gem'),
                    c(0.5, 0.41, 'coin'), c(0.2, 0.55, 'coin'),
                    c(0.8, 0.55, 'coin'),
                ],
                powerUps: [pu(0.5, 0.15, 'magnet')],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.21, 'cloud'), p(0.8, 0.21, 'cloud'),
                    p(0.5, 0.34, 'normal'), p(0.3, 0.48, 'cloud'), p(0.7, 0.48),
                    p(0.5, 0.62, 'cloud'), p(0.25, 0.76, 'normal'), p(0.75, 0.76, 'cloud'),
                    p(0.5, 0.9),
                ],
                enemies: [e(0.35, 0.42, 'chaser'), e(0.65, 0.65, 'floater')],
                collectibles: [
                    c(0.2, 0.27, 'gem'), c(0.8, 0.27, 'coin'),
                    c(0.5, 0.4, 'coin'), c(0.3, 0.54, 'coin'),
                    c(0.7, 0.54, 'gem'),
                ],
                powerUps: [pu(0.75, 0.1, 'shield')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 6 — Danger Zone
    // Deadly spikes introduced. Routes must avoid them deliberately.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 6,
        name: 'Danger Zone',
        description: 'Spikes everywhere — choose your path wisely.',
        targetAltitude: 12600,
        bgColor: '#3a1a1a',
        bgAccent: '#6a2a2a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.2, 0.22), p(0.8, 0.22, 'deadly'),
                    p(0.5, 0.36), p(0.15, 0.5, 'deadly'), p(0.75, 0.5),
                    p(0.35, 0.64), p(0.85, 0.64, 'deadly'),
                    p(0.5, 0.78), p(0.2, 0.92),
                ],
                enemies: [e(0.5, 0.3, 'shooter')],
                collectibles: [
                    c(0.2, 0.28, 'gem'), c(0.5, 0.42, 'coin'),
                    c(0.75, 0.56, 'coin'), c(0.35, 0.7, 'coin'),
                ],
                powerUps: [pu(0.5, 0.15, 'shield')],
            },
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.25, 0.22), p(0.75, 0.22, 'deadly'),
                    p(0.5, 0.35, 'fragile'), p(0.2, 0.49, 'deadly'), p(0.8, 0.49),
                    p(0.5, 0.63), p(0.25, 0.77, 'deadly'), p(0.75, 0.77),
                    p(0.5, 0.91),
                ],
                enemies: [e(0.6, 0.43, 'shooter'), e(0.4, 0.65, 'bat')],
                collectibles: [
                    c(0.25, 0.28, 'gem'), c(0.8, 0.55, 'gem'),
                    c(0.5, 0.41, 'coin'), c(0.75, 0.83, 'star'),
                ],
                powerUps: [pu(0.2, 0.15, 'extra_life')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 7 — Ghost Town
    // Ghosts introduced (immune when phased). Slow-time helps a lot.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 7,
        name: 'Ghost Town',
        description: 'Phasing enemies — stomp them only when solid!',
        targetAltitude: 15000,
        bgColor: '#1a1a3a',
        bgAccent: '#3a3a6a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08), p(0.25, 0.22), p(0.75, 0.22, 'moving'),
                    p(0.5, 0.36), p(0.2, 0.5, 'fragile'), p(0.8, 0.5),
                    p(0.5, 0.64), p(0.3, 0.78), p(0.7, 0.78, 'bouncy'),
                    p(0.5, 0.92),
                ],
                enemies: [e(1.4, 0.3, 'ghost'), e(0.8, 0.58, 'ghost')],
                collectibles: [
                    c(0.25, 0.28, 'coin'), c(0.75, 0.28, 'gem'),
                    c(0.5, 0.42, 'coin'), c(0.2, 0.56, 'diamond'),
                ],
                powerUps: [pu(0.5, 0.15, 'slow_time')],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.21, 'cloud'), p(0.8, 0.21),
                    p(0.5, 0.34, 'moving'), p(0.25, 0.48), p(0.75, 0.48, 'fragile'),
                    p(0.5, 0.62), p(0.3, 0.76, 'moving'), p(0.7, 0.76),
                    p(0.5, 0.9),
                ],
                enemies: [e(0.5, 0.42, 'ghost'), e(0.25, 0.65, 'chaser'), e(0.75, 0.65, 'ghost')],
                collectibles: [
                    c(0.2, 0.27, 'coin'), c(0.8, 0.27, 'coin'),
                    c(0.5, 0.4, 'gem'), c(0.25, 0.54, 'coin'),
                    c(0.75, 0.54, 'star'),
                ],
                powerUps: [pu(0.2, 0.12, 'extra_life')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 8 — Lightning Storm
    // Dense enemy mix. Double-coins power-up. Tighter platform layout.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 8,
        name: 'Lightning Storm',
        description: 'The sky fights back. Stay focused.',
        targetAltitude: 17400,
        bgColor: '#3a3a1a',
        bgAccent: '#6a6a2a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.2, 0.2), p(0.8, 0.2),
                    p(0.5, 0.32, 'fragile'), p(0.25, 0.44), p(0.75, 0.44, 'moving'),
                    p(0.5, 0.56, 'bouncy'), p(0.2, 0.68), p(0.8, 0.68, 'fragile'),
                    p(0.5, 0.8), p(0.35, 0.92),
                ],
                enemies: [
                    e(0.1, 0.26, 'shooter'),
                    e(0.8, 0.5, 'bat'), e(0.7, 0.5, 'bat'),
                ],
                collectibles: [
                    c(0.2, 0.26, 'gem'), c(0.8, 0.26, 'gem'),
                    c(0.5, 0.38, 'coin'), c(0.25, 0.5, 'coin'),
                    c(0.75, 0.5, 'coin'), c(0.5, 0.62, 'diamond'),
                ],
                powerUps: [pu(0.5, 0.12, 'double_coins')],
            },
            {
                platforms: [
                    p(0.5, 0.08), p(0.2, 0.2, 'moving'), p(0.8, 0.2),
                    p(0.5, 0.33), p(0.25, 0.47, 'fragile'), p(0.75, 0.47, 'moving'),
                    p(0.5, 0.61), p(0.2, 0.75, 'bouncy'), p(0.8, 0.75),
                    p(0.5, 0.89),
                ],
                enemies: [
                    e(0.35, 0.27, 'chaser'), e(0.65, 0.27, 'chaser'),
                    e(0.5, 0.55, 'shooter'),
                ],
                collectibles: [
                    c(0.2, 0.26, 'coin'), c(0.8, 0.26, 'coin'),
                    c(0.5, 0.39, 'gem'), c(0.25, 0.53, 'coin'),
                    c(0.75, 0.53, 'star'),
                ],
                powerUps: [pu(0.8, 0.14, 'extra_life')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 9 — Edge of Space
    // Everything mixed: all platform types, all enemies. Very challenging.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 9,
        name: 'Edge of Space',
        description: 'One step from the stars — survive everything.',
        targetAltitude: 20400,
        bgColor: '#1a0a2a',
        bgAccent: '#3a1a5a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.2, 0.21, 'cloud'), p(0.8, 0.21, 'moving'),
                    p(0.5, 0.34, 'fragile'), p(0.25, 0.48), p(0.75, 0.48, 'bouncy'),
                    p(0.5, 0.61, 'moving'), p(0.2, 0.74, 'deadly'), p(0.75, 0.74),
                    p(0.5, 0.9),
                ],
                enemies: [
                    e(0.5, 0.28, 'ghost'),
                    e(0.3, 0.42, 'chaser'), e(0.7, 0.55, 'shooter'),
                ],
                collectibles: [
                    c(0.2, 0.27, 'gem'), c(0.8, 0.27, 'gem'),
                    c(0.5, 0.4, 'coin'), c(0.25, 0.54, 'diamond'),
                    c(0.75, 0.54, 'coin'), c(0.75, 0.8, 'star'),
                ],
                powerUps: [pu(0.5, 0.15, 'jetpack')],
            },
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.25, 0.21, 'moving'), p(0.75, 0.21, 'cloud'),
                    p(0.5, 0.34, 'bouncy'), p(0.2, 0.48, 'fragile'), p(0.8, 0.48),
                    p(0.5, 0.62, 'cloud'), p(0.3, 0.76, 'deadly'), p(0.7, 0.76),
                    p(0.5, 0.9),
                ],
                enemies: [
                    e(0.5, 0.42, 'ghost'),
                    e(0.25, 0.56, 'bat'), e(0.75, 0.65, 'shooter'),
                    e(0.5, 0.25, 'chaser'),
                ],
                collectibles: [
                    c(0.25, 0.27, 'gem'), c(0.75, 0.27, 'coin'),
                    c(0.8, 0.54, 'gem'), c(0.5, 0.4, 'coin'),
                    c(0.7, 0.82, 'star'),
                ],
                powerUps: [pu(0.2, 0.1, 'slow_time')],
            },
        ], 3),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 10 — Summit
    // Final challenge. Narrow paths, maximum enemy density, big rewards.
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 10,
        name: 'The Summit',
        description: 'The top of the world — claim it!',
        targetAltitude: 24000,
        bgColor: '#0a0a1a',
        bgAccent: '#1a2a5a',
        screens: repeat([
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.2, 0.2, 'moving'), p(0.8, 0.2, 'cloud'),
                    p(0.5, 0.33, 'fragile'), p(0.25, 0.47, 'bouncy'), p(0.75, 0.47, 'deadly'),
                    p(0.5, 0.61, 'moving'), p(0.2, 0.75, 'cloud'), p(0.7, 0.75),
                    p(0.5, 0.9),
                ],
                enemies: [
                    e(0.5, 0.27, 'ghost'),
                    e(0.3, 0.41, 'shooter'), e(0.7, 0.41, 'chaser'),
                    e(0.25, 0.68, 'bat'),
                ],
                collectibles: [
                    c(0.2, 0.26, 'gem'), c(0.8, 0.26, 'diamond'),
                    c(0.5, 0.39, 'coin'), c(0.25, 0.53, 'star'),
                    c(0.5, 0.67, 'diamond'),
                ],
                powerUps: [pu(0.8, 0.53, 'shield')],
            },
            {
                platforms: [
                    p(0.5, 0.08),
                    p(0.25, 0.21, 'cloud'), p(0.75, 0.21, 'moving'),
                    p(0.5, 0.34, 'bouncy'), p(0.2, 0.48, 'deadly'), p(0.8, 0.48, 'fragile'),
                    p(0.5, 0.62, 'moving'), p(0.3, 0.76), p(0.7, 0.76, 'cloud'),
                    p(0.5, 0.9),
                ],
                enemies: [
                    e(0.5, 0.28, 'ghost'),
                    e(0.35, 0.42, 'shooter'), e(0.65, 0.55, 'chaser'),
                    e(0.5, 0.68, 'bat'), e(0.25, 0.72, 'ghost'),
                ],
                collectibles: [
                    c(0.25, 0.27, 'gem'), c(0.75, 0.27, 'gem'),
                    c(0.5, 0.4, 'diamond'), c(0.8, 0.54, 'star'),
                    c(0.3, 0.82, 'star'),
                ],
                powerUps: [pu(0.5, 0.14, 'double_coins')],
            },
        ], 3),
    },
];

export const TOTAL_LEVELS = LEVEL_DATA.length;

export function getLevelData(levelIndex) {
    return LEVEL_DATA[levelIndex] ?? null;
}

/**
 * Procedurally generate one screen for Infinite Mode.
 * @param {number} screenIndex - 0-based, drives both seed and difficulty scaling.
 * @returns {{ platforms, enemies, collectibles, powerUps }}
 */
export function generateInfiniteScreen(screenIndex) {
    // Deterministic pseudo-random (sin-based) — same index → same screen every run
    const rng = (s) => {
        const x = Math.sin(screenIndex * 2718.28 + s * 1618.03) * 100000;
        return x - Math.floor(x); // 0..1
    };

    const difficulty = Math.min(1, screenIndex / 12); // ramps fully over 12 screens
    const maxPlatformTypeIdx = Math.max(2, Math.floor(2 + difficulty * 5));

    const PLATFORM_POOL = ['normal', 'normal', 'fragile', 'moving', 'bouncy', 'cloud', 'deadly'];
    const ENEMY_POOL = ['bat', 'floater', 'chaser', 'shooter', 'ghost'];
    const COIN_POOL = ['coin', 'coin', 'gem', 'diamond', 'star'];
    const PU_POOL = ['shield', 'jetpack', 'magnet', 'spring_boots', 'slow_time', 'double_coins', 'extra_life'];

    const pick = (pool, seed, maxIdx) =>
        pool[Math.floor(rng(seed) * Math.min(maxIdx, pool.length))];

    // ── Platforms ──────────────────────────────────────────────────────────
    // Y rows bottom → top; two platforms per row except bottom and top
    const yRows = [0.9, 0.78, 0.65, 0.52, 0.4, 0.28, 0.16, 0.08];
    const platforms = [];

    // Bottom landing row — always two safe normals
    platforms.push(
        { x: 0.2 + rng(1) * 0.2, y: 0.9, type: 'normal' },
        { x: 0.6 + rng(2) * 0.2, y: 0.9, type: 'normal' }
    );

    // Middle rows — two platforms each
    for (let i = 1; i < yRows.length - 1; i++) {
        const y = yRows[i];
        const x1 = 0.1 + rng(i * 7 + 3) * 0.38;
        const x2 = 0.52 + rng(i * 7 + 5) * 0.38;
        let t1 = pick(PLATFORM_POOL, i * 7 + 4, maxPlatformTypeIdx);
        let t2 = pick(PLATFORM_POOL, i * 7 + 6, maxPlatformTypeIdx);
        // Never put deadly near the very top
        if (y < 0.25) {
            if (t1 === 'deadly')
                t1 = 'normal';
            if (t2 === 'deadly')
                t2 = 'normal';
        }
        platforms.push(
            { x: x1, y, type: t1 },
            { x: x2, y, type: t2 }
        );
    }

    // Top platform — always a safe exit, roughly centred
    platforms.push({ x: 0.25 + rng(100) * 0.5, y: 0.08, type: 'normal' });

    // ── Enemies ────────────────────────────────────────────────────────────
    const enemies = [];
    const maxEnemyTypeIdx = Math.max(1, Math.floor(1 + difficulty * (ENEMY_POOL.length - 1)));
    const enemyCount = screenIndex < 2 ? 0 : Math.min(4, 1 + Math.floor(rng(200) * difficulty * 3));

    for (let i = 0; i < enemyCount; i++) {
        enemies.push({
            x: 0.15 + rng(210 + i * 3) * 0.7,
            y: 0.2 + rng(211 + i * 3) * 0.55,
            type: pick(ENEMY_POOL, 212 + i * 3, maxEnemyTypeIdx),
        });
    }

    // ── Collectibles ───────────────────────────────────────────────────────
    const collectibles = [];
    const maxCoinTypeIdx = Math.max(1, Math.floor(1 + difficulty * (COIN_POOL.length - 1)));
    const coinCount = 3 + Math.floor(rng(300) * 4);
    for (let i = 0; i < coinCount; i++) {
        collectibles.push({
            x: 0.1 + rng(310 + i * 2) * 0.8,
            y: 0.1 + rng(311 + i * 2) * 0.8,
            type: pick(COIN_POOL, 312 + i * 2, maxCoinTypeIdx),
        });
    }

    // ── Power-ups ──────────────────────────────────────────────────────────
    const powerUps = [];

    // Random power-up slot (50% chance, any type in the pool)
    if (rng(400) < 0.5) {
        powerUps.push({
            x: 0.2 + rng(401) * 0.6,
            y: 0.15 + rng(402) * 0.55,
            type: PU_POOL[Math.floor(rng(403) * PU_POOL.length)],
        });
    }

    // Guaranteed extra_life every 5 screens — always placed at a different
    // position so it doesn't coincide with the random slot above
    if (screenIndex > 0 && screenIndex % 5 === 0) {
        powerUps.push({
            x: 0.15 + rng(410) * 0.7,
            y: 0.3 + rng(411) * 0.4,
            type: 'extra_life',
        });
    }

    return { platforms, enemies, collectibles, powerUps };
}
