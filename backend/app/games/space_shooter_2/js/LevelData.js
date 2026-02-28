/**
 * LevelData - 30 discrete levels (no randomization)
 * 
 * Each level defines exact enemy waves that spawn in order.
 * Waves are sequential: all enemies in a wave must be cleared before next wave.
 * Last level in a boss-cycle has a boss fight.
 * 
 * Wave format:
 *   enemies: array of { type, x, pattern } - exact enemies to spawn
 *   delay:   seconds to wait before this wave starts (after previous cleared)
 * 
 * Level format:
 *   waves:          array of wave definitions
 *   boss:           boss level (null = no boss)
 *   speedMult:      enemy speed multiplier
 *   name:           display name for level
 *   description:    brief description
 */

function makeWave(enemies, delay = 1, formation = 'none') {
    return { enemies, delay, formation };
}

function e(type, x, pattern = 'straight') {
    return { type, x, pattern };
}

// x positions: 0.1 to 0.9 (fraction of canvas width, resolved at runtime)

const LEVEL_DATA = [
    // ===== LEVEL 1: First Contact =====
    {
        name: 'First Contact',
        description: 'Scout patrol detected. Engage!',
        speedMult: 1.0,
        boss: null,
        waves: [
            makeWave([e('scout', 0.5), e('scout', 0.3), e('scout', 0.7)], 1),
            makeWave([e('scout', 0.2), e('scout', 0.4), e('scout', 0.6), e('scout', 0.8)], 1.5),
            makeWave([e('scout', 0.3, 'sine'), e('scout', 0.5, 'sine'), e('scout', 0.7, 'sine')], 1.5),
        ]
    },
    // ===== LEVEL 2: Skirmish =====
    {
        name: 'Skirmish',
        description: 'Enemy fighters join the fray.',
        speedMult: 1.0,
        boss: null,
        waves: [
            makeWave([e('scout', 0.3), e('scout', 0.5), e('scout', 0.7), e('fighter', 0.5)], 1),
            makeWave([e('fighter', 0.3, 'sine'), e('fighter', 0.7, 'sine'), e('scout', 0.5)], 1.5),
            makeWave([e('scout', 0.2), e('scout', 0.4), e('fighter', 0.6), e('fighter', 0.8)], 1.5),
            makeWave([e('fighter', 0.5, 'zigzag'), e('scout', 0.3, 'sine'), e('scout', 0.7, 'sine')], 1),
        ]
    },
    // ===== LEVEL 3: Pincer =====
    {
        name: 'Pincer Attack',
        description: 'They\'re flanking us from both sides!',
        speedMult: 1.05,
        boss: null,
        waves: [
            makeWave([e('scout', 0.1, 'zigzag'), e('scout', 0.9, 'zigzag')], 1, 'pincer'),
            makeWave([e('fighter', 0.2), e('fighter', 0.8), e('scout', 0.5, 'dive')], 1.5),
            makeWave([e('scout', 0.1), e('scout', 0.3), e('scout', 0.7), e('scout', 0.9), e('fighter', 0.5, 'sine')], 1, 'line'),
            makeWave([e('fighter', 0.3, 'zigzag'), e('fighter', 0.7, 'zigzag'), e('fighter', 0.5, 'dive')], 1.5, 'vee'),
        ]
    },
    // ===== LEVEL 4: Swarm Incoming =====
    {
        name: 'Swarm Incoming',
        description: 'Swarm units detected. Stay focused!',
        speedMult: 1.05,
        boss: null,
        waves: [
            makeWave([e('swarm', 0.3), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6), e('swarm', 0.7)], 1, 'line'),
            makeWave([e('fighter', 0.3), e('fighter', 0.7), e('swarm', 0.2), e('swarm', 0.5), e('swarm', 0.8)], 1.5, 'diamond'),
            makeWave([e('swarm', 0.2, 'sine'), e('swarm', 0.3, 'sine'), e('swarm', 0.4, 'sine'), e('swarm', 0.5, 'sine'), e('swarm', 0.6, 'sine'), e('swarm', 0.7, 'sine'), e('swarm', 0.8, 'sine')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 5: Boss - Crimson Vanguard =====
    {
        name: 'Crimson Vanguard',
        description: 'WARNING: Capital ship approaching!',
        speedMult: 1.0,
        boss: 1,
        waves: [
            makeWave([e('scout', 0.3), e('scout', 0.7)], 1),
            makeWave([e('fighter', 0.4), e('fighter', 0.6)], 2),
            // Boss spawns after these waves
        ]
    },
    // ===== LEVEL 6: Deep Space =====
    {
        name: 'Deep Space',
        description: 'Venturing into uncharted territory.',
        speedMult: 1.1,
        boss: null,
        waves: [
            makeWave([e('fighter', 0.3, 'sine'), e('fighter', 0.5), e('fighter', 0.7, 'sine')], 1),
            makeWave([e('heavy', 0.5), e('scout', 0.3, 'dive'), e('scout', 0.7, 'dive')], 1.5),
            makeWave([e('fighter', 0.2), e('fighter', 0.4), e('fighter', 0.6), e('fighter', 0.8)], 1),
            makeWave([e('heavy', 0.3), e('heavy', 0.7), e('fighter', 0.5, 'zigzag')], 1.5, 'vee'),
        ]
    },
    // ===== LEVEL 7: Phantom Zone =====
    {
        name: 'Phantom Zone',
        description: 'Phase-shifting enemies detected ahead.',
        speedMult: 1.1,
        boss: null,
        waves: [
            makeWave([e('phantom', 0.4, 'sine'), e('phantom', 0.6, 'sine')], 1),
            makeWave([e('phantom', 0.3, 'zigzag'), e('phantom', 0.7, 'zigzag'), e('scout', 0.5)], 1.5),
            makeWave([e('phantom', 0.2), e('phantom', 0.5), e('phantom', 0.8), e('fighter', 0.4, 'dive')], 1),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('heavy', 0.5)], 1.5, 'ring'),
        ]
    },
    // ===== LEVEL 8: Sentinel Array =====
    {
        name: 'Sentinel Array',
        description: 'Armored sentinels block the path.',
        speedMult: 1.1,
        boss: null,
        waves: [
            makeWave([e('sentinel', 0.5), e('scout', 0.3), e('scout', 0.7)], 1),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('fighter', 0.5, 'sine')], 1.5),
            makeWave([e('sentinel', 0.5), e('phantom', 0.3, 'sine'), e('phantom', 0.7, 'sine')], 1),
            makeWave([e('sentinel', 0.4), e('sentinel', 0.6), e('heavy', 0.5)], 2, 'line'),
        ]
    },
    // ===== LEVEL 9: Full Assault =====
    {
        name: 'Full Assault',
        description: 'All enemy types converge!',
        speedMult: 1.15,
        boss: null,
        waves: [
            makeWave([e('scout', 0.2), e('fighter', 0.4), e('heavy', 0.6), e('phantom', 0.8)], 1),
            makeWave([e('swarm', 0.2), e('swarm', 0.3), e('swarm', 0.4), e('sentinel', 0.6), e('sentinel', 0.8)], 1.5),
            makeWave([e('phantom', 0.3, 'circle'), e('heavy', 0.5), e('phantom', 0.7, 'circle'), e('fighter', 0.2, 'dive'), e('fighter', 0.8, 'dive')], 1),
            makeWave([e('heavy', 0.3), e('heavy', 0.5), e('heavy', 0.7), e('swarm', 0.1), e('swarm', 0.9)], 1.5, 'cross'),
        ]
    },
    // ===== LEVEL 10: Boss - Iron Monolith =====
    {
        name: 'Iron Monolith',
        description: 'WARNING: Heavy dreadnought!',
        speedMult: 1.1,
        boss: 2,
        waves: [
            makeWave([e('fighter', 0.3, 'sine'), e('fighter', 0.7, 'sine')], 1),
            makeWave([e('heavy', 0.5), e('sentinel', 0.3), e('sentinel', 0.7)], 2),
        ]
    },
    // ===== LEVEL 11: Nebula Run =====
    {
        name: 'Nebula Run',
        description: 'Navigation through dense nebula.',
        speedMult: 1.15,
        boss: null,
        waves: [
            makeWave([e('phantom', 0.3, 'spiral'), e('phantom', 0.5, 'spiral'), e('phantom', 0.7, 'spiral')], 1, 'vee'),
            makeWave([e('scout', 0.2, 'dive'), e('scout', 0.4, 'dive'), e('scout', 0.6, 'dive'), e('scout', 0.8, 'dive')], 1, 'line'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('phantom', 0.5, 'circle')], 1.5, 'diamond'),
            makeWave([e('heavy', 0.4), e('heavy', 0.6), e('phantom', 0.2, 'strafe'), e('phantom', 0.8, 'strafe')], 1.5),
            makeWave([e('fighter', 0.3, 'sine'), e('fighter', 0.5, 'sine'), e('fighter', 0.7, 'sine'), e('swarm', 0.1), e('swarm', 0.9)], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 12: Minefield =====
    {
        name: 'Minefield',
        description: 'Swarms guard the field. Tread carefully.',
        speedMult: 1.2,
        boss: null,
        waves: [
            makeWave([e('swarm', 0.2), e('swarm', 0.3), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6), e('swarm', 0.7), e('swarm', 0.8)], 1, 'stagger'),
            makeWave([e('fighter', 0.3, 'strafe'), e('fighter', 0.7, 'strafe'), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6)], 1.5, 'pincer'),
            makeWave([e('heavy', 0.5), e('swarm', 0.2, 'pendulum'), e('swarm', 0.3), e('swarm', 0.7), e('swarm', 0.8, 'pendulum')], 1),
            makeWave([e('sentinel', 0.4), e('sentinel', 0.6), e('swarm', 0.1), e('swarm', 0.2), e('swarm', 0.8), e('swarm', 0.9)], 1.5, 'ring'),
        ]
    },
    // ===== LEVEL 13: Ambush =====
    {
        name: 'Ambush',
        description: 'Dive bombers incoming! Watch your six!',
        speedMult: 1.2,
        boss: null,
        waves: [
            makeWave([e('scout', 0.3, 'swoop'), e('scout', 0.5, 'swoop'), e('scout', 0.7, 'swoop')], 1, 'vee'),
            makeWave([e('fighter', 0.2, 'dive'), e('fighter', 0.5, 'dive'), e('fighter', 0.8, 'dive'), e('scout', 0.4, 'strafe'), e('scout', 0.6, 'strafe')], 1),
            makeWave([e('phantom', 0.3, 'dive'), e('phantom', 0.7, 'dive'), e('heavy', 0.5, 'pendulum'), e('fighter', 0.2), e('fighter', 0.8)], 1.5, 'cross'),
            makeWave([e('heavy', 0.3, 'swoop'), e('heavy', 0.7, 'swoop'), e('sentinel', 0.5)], 1.5),
            makeWave([e('fighter', 0.2, 'dive'), e('fighter', 0.4, 'dive'), e('fighter', 0.6, 'dive'), e('fighter', 0.8, 'dive')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 14: Gauntlet =====
    {
        name: 'The Gauntlet',
        description: 'Wave after wave. No respite.',
        speedMult: 1.25,
        boss: null,
        waves: [
            makeWave([e('scout', 0.2, 'spiral'), e('scout', 0.4), e('scout', 0.6), e('scout', 0.8, 'spiral')], 0.5, 'line'),
            makeWave([e('fighter', 0.3, 'strafe'), e('fighter', 0.5), e('fighter', 0.7, 'strafe')], 0.5, 'vee'),
            makeWave([e('heavy', 0.4, 'pendulum'), e('heavy', 0.6, 'pendulum'), e('scout', 0.2, 'dive'), e('scout', 0.8, 'dive')], 0.5),
            makeWave([e('phantom', 0.3, 'swoop'), e('sentinel', 0.5), e('phantom', 0.7, 'swoop')], 0.5, 'diamond'),
            makeWave([e('fighter', 0.2), e('fighter', 0.4), e('fighter', 0.6), e('fighter', 0.8), e('heavy', 0.5)], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6)], 0.5, 'ring'),
        ]
    },
    // ===== LEVEL 15: Boss - Void Leviathan =====
    {
        name: 'Void Leviathan',
        description: 'WARNING: Leviathan-class entity!',
        speedMult: 1.15,
        boss: 3,
        waves: [
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle')], 1),
            makeWave([e('sentinel', 0.4), e('sentinel', 0.6), e('heavy', 0.5)], 2),
        ]
    },
    // ===== LEVEL 16: Reinforcements =====
    {
        name: 'Reinforcements',
        description: 'Enemy forces redeploy with new tactics.',
        speedMult: 1.25,
        boss: null,
        waves: [
            makeWave([e('fighter', 0.2, 'strafe'), e('fighter', 0.4, 'strafe'), e('fighter', 0.6, 'strafe'), e('fighter', 0.8, 'strafe')], 1, 'line'),
            makeWave([e('heavy', 0.3, 'pendulum'), e('heavy', 0.5), e('heavy', 0.7, 'pendulum'), e('phantom', 0.2, 'swoop'), e('phantom', 0.8, 'swoop')], 1.5, 'pincer'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7), e('swarm', 0.2, 'spiral'), e('swarm', 0.4), e('swarm', 0.6), e('swarm', 0.8, 'spiral')], 1, 'stagger'),
            makeWave([e('heavy', 0.4, 'sine'), e('heavy', 0.6, 'sine'), e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle')], 1.5, 'cross'),
        ]
    },
    // ===== LEVEL 17: Crossfire =====
    {
        name: 'Crossfire',
        description: 'Caught between two assault wings.',
        speedMult: 1.3,
        boss: null,
        waves: [
            makeWave([e('fighter', 0.1, 'strafe'), e('fighter', 0.9, 'strafe'), e('scout', 0.5, 'swoop')], 1, 'pincer'),
            makeWave([e('sentinel', 0.2), e('sentinel', 0.8), e('fighter', 0.4, 'spiral'), e('fighter', 0.6, 'spiral')], 1.5),
            makeWave([e('heavy', 0.3, 'pendulum'), e('heavy', 0.7, 'pendulum'), e('phantom', 0.1, 'zigzag'), e('phantom', 0.9, 'zigzag'), e('scout', 0.5)], 1, 'cross'),
            makeWave([e('sentinel', 0.3), e('heavy', 0.5), e('sentinel', 0.7), e('fighter', 0.1, 'swoop'), e('fighter', 0.9, 'swoop')], 1.5, 'diamond'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.5, 'circle'), e('phantom', 0.7, 'circle')], 1, 'ring'),
        ]
    },
    // ===== LEVEL 18: Siege =====
    {
        name: 'Siege Breaker',
        description: 'Break through the fortified line!',
        speedMult: 1.3,
        boss: null,
        waves: [
            makeWave([e('sentinel', 0.2), e('sentinel', 0.35), e('sentinel', 0.5), e('sentinel', 0.65), e('sentinel', 0.8)], 1, 'line'),
            makeWave([e('heavy', 0.3, 'pendulum'), e('heavy', 0.5), e('heavy', 0.7, 'pendulum'), e('fighter', 0.2, 'swoop'), e('fighter', 0.8, 'swoop')], 1.5, 'vee'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7), e('phantom', 0.2, 'spiral'), e('phantom', 0.8, 'spiral')], 1, 'stagger'),
            makeWave([e('heavy', 0.4, 'strafe'), e('heavy', 0.6, 'strafe'), e('sentinel', 0.3), e('sentinel', 0.7), e('swarm', 0.5)], 1.5, 'cross'),
        ]
    },
    // ===== LEVEL 19: Storm Front =====
    {
        name: 'Storm Front',
        description: 'The final push before the fortress.',
        speedMult: 1.35,
        boss: null,
        waves: [
            makeWave([e('scout', 0.2, 'swoop'), e('scout', 0.4, 'swoop'), e('scout', 0.6, 'swoop'), e('scout', 0.8, 'swoop'), e('fighter', 0.5, 'spiral')], 0.5, 'arrow'),
            makeWave([e('fighter', 0.2, 'strafe'), e('fighter', 0.4), e('fighter', 0.6), e('fighter', 0.8, 'strafe'), e('heavy', 0.5)], 0.5, 'pincer'),
            makeWave([e('phantom', 0.3, 'circle'), e('sentinel', 0.5, 'pendulum'), e('phantom', 0.7, 'circle'), e('swarm', 0.2), e('swarm', 0.8)], 0.5, 'ring'),
            makeWave([e('heavy', 0.2, 'pendulum'), e('heavy', 0.4), e('heavy', 0.6), e('heavy', 0.8, 'pendulum')], 0.5, 'vee'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7), e('fighter', 0.2, 'swoop'), e('fighter', 0.8, 'swoop'), e('phantom', 0.5, 'circle')], 1, 'diamond'),
        ]
    },
    // ===== LEVEL 20: Boss - Omega Prime =====
    {
        name: 'Omega Prime',
        description: 'WARNING: Supreme command vessel!',
        speedMult: 1.2,
        boss: 4,
        waves: [
            makeWave([e('heavy', 0.3), e('heavy', 0.7), e('phantom', 0.5, 'circle')], 1),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7)], 2),
        ]
    },
    // ===== LEVELS 21-30: Endgame content (harder variations) =====
    {
        name: 'Dark Sector',
        description: 'Beyond known space. Maximum threat.',
        speedMult: 1.35,
        boss: null,
        waves: [
            makeWave([e('heavy', 0.2, 'pendulum'), e('heavy', 0.5), e('heavy', 0.8, 'pendulum'), e('phantom', 0.3, 'spiral'), e('phantom', 0.7, 'spiral')], 1, 'cross'),
            makeWave([e('sentinel', 0.2), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8), e('fighter', 0.5, 'swoop')], 1, 'line'),
            makeWave([e('swarm', 0.1, 'strafe'), e('swarm', 0.2), e('swarm', 0.3), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6), e('swarm', 0.7), e('swarm', 0.8), e('swarm', 0.9, 'strafe')], 0.5, 'stagger'),
            makeWave([e('heavy', 0.3, 'spiral'), e('heavy', 0.7, 'spiral'), e('sentinel', 0.5), e('phantom', 0.2, 'circle'), e('phantom', 0.8, 'circle')], 1.5, 'diamond'),
        ]
    },
    {
        name: 'Dead Zone',
        description: 'Nothing survives here for long.',
        speedMult: 1.4,
        boss: null,
        waves: [
            makeWave([e('phantom', 0.2, 'circle'), e('phantom', 0.4, 'spiral'), e('phantom', 0.6, 'spiral'), e('phantom', 0.8, 'circle')], 1, 'ring'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.5, 'pendulum'), e('heavy', 0.7, 'strafe'), e('sentinel', 0.2), e('sentinel', 0.8)], 1, 'vee'),
            makeWave([e('fighter', 0.1, 'swoop'), e('fighter', 0.3, 'swoop'), e('fighter', 0.5, 'dive'), e('fighter', 0.7, 'swoop'), e('fighter', 0.9, 'swoop')], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('heavy', 0.2), e('heavy', 0.8)], 1.5, 'pincer'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('heavy', 0.5, 'spiral'), e('swarm', 0.2), e('swarm', 0.4), e('swarm', 0.6), e('swarm', 0.8)], 1, 'stagger'),
        ]
    },
    {
        name: 'Hellfire',
        description: 'The inferno awaits.',
        speedMult: 1.4,
        boss: null,
        waves: [
            makeWave([e('fighter', 0.2, 'swoop'), e('fighter', 0.4, 'swoop'), e('fighter', 0.6, 'swoop'), e('fighter', 0.8, 'swoop'), e('heavy', 0.5, 'pendulum')], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.2, 'strafe'), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8, 'strafe'), e('phantom', 0.5, 'spiral')], 0.5, 'line'),
            makeWave([e('heavy', 0.2, 'pendulum'), e('heavy', 0.4), e('heavy', 0.6), e('heavy', 0.8, 'pendulum'), e('fighter', 0.5, 'swoop')], 0.5, 'pincer'),
            makeWave([e('phantom', 0.2, 'circle'), e('phantom', 0.4, 'spiral'), e('phantom', 0.6, 'spiral'), e('phantom', 0.8, 'circle'), e('sentinel', 0.5)], 0.5, 'ring'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.5), e('heavy', 0.7, 'strafe'), e('sentinel', 0.2), e('sentinel', 0.8)], 1, 'cross'),
        ]
    },
    {
        name: 'Exodus',
        description: 'Escape the collapsing sector.',
        speedMult: 1.45,
        boss: null,
        waves: [
            makeWave([e('swarm', 0.1, 'spiral'), e('swarm', 0.2), e('swarm', 0.3), e('swarm', 0.4), e('swarm', 0.5), e('swarm', 0.6), e('swarm', 0.7), e('swarm', 0.8), e('swarm', 0.9, 'spiral')], 0.5, 'stagger'),
            makeWave([e('fighter', 0.2, 'strafe'), e('fighter', 0.4, 'swoop'), e('fighter', 0.6, 'swoop'), e('fighter', 0.8, 'strafe')], 0.5, 'diamond'),
            makeWave([e('heavy', 0.3, 'pendulum'), e('sentinel', 0.5, 'pendulum'), e('heavy', 0.7, 'pendulum'), e('phantom', 0.2, 'spiral'), e('phantom', 0.8, 'spiral')], 0.5, 'vee'),
            makeWave([e('sentinel', 0.2), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8), e('heavy', 0.5, 'strafe')], 0.5, 'line'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.5, 'circle'), e('phantom', 0.7, 'circle'), e('fighter', 0.2, 'swoop'), e('fighter', 0.8, 'swoop')], 1, 'ring'),
        ]
    },
    // ===== LEVEL 25: Boss - Nemesis =====
    {
        name: 'Nemesis',
        description: 'WARNING: Unknown entity!',
        speedMult: 1.3,
        boss: 5,
        waves: [
            makeWave([e('heavy', 0.3), e('heavy', 0.5), e('heavy', 0.7)], 1),
            makeWave([e('sentinel', 0.2), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8)], 2),
            makeWave([e('phantom', 0.3, 'spiral'), e('phantom', 0.5, 'spiral'), e('phantom', 0.7, 'spiral')], 1.5, 'ring'),
        ]
    },
    // ===== LEVELS 26-29: Final stretch =====
    {
        name: 'Oblivion',
        description: 'The void consumes all.',
        speedMult: 1.5,
        boss: null,
        waves: [
            makeWave([e('heavy', 0.2, 'strafe'), e('heavy', 0.4, 'pendulum'), e('heavy', 0.6, 'pendulum'), e('heavy', 0.8, 'strafe'), e('phantom', 0.5, 'spiral')], 0.5, 'cross'),
            makeWave([e('sentinel', 0.2), e('sentinel', 0.5), e('sentinel', 0.8), e('fighter', 0.3, 'swoop'), e('fighter', 0.7, 'swoop')], 0.5, 'diamond'),
            makeWave([e('phantom', 0.1, 'circle'), e('phantom', 0.3, 'spiral'), e('phantom', 0.5, 'circle'), e('phantom', 0.7, 'spiral'), e('phantom', 0.9, 'circle')], 0.5, 'ring'),
            makeWave([e('heavy', 0.3, 'pendulum'), e('heavy', 0.5, 'strafe'), e('heavy', 0.7, 'pendulum'), e('sentinel', 0.2), e('sentinel', 0.8), e('swarm', 0.4, 'spiral'), e('swarm', 0.6, 'spiral')], 0.5, 'stagger'),
        ]
    },
    {
        name: 'Entropy',
        description: 'Reality fractures.',
        speedMult: 1.5,
        boss: null,
        waves: [
            makeWave([e('sentinel', 0.2, 'strafe'), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8, 'strafe'), e('heavy', 0.5, 'pendulum')], 0.5, 'line'),
            makeWave([e('phantom', 0.2, 'spiral'), e('phantom', 0.4, 'circle'), e('phantom', 0.6, 'circle'), e('phantom', 0.8, 'spiral'), e('fighter', 0.5, 'swoop')], 0.5, 'pincer'),
            makeWave([e('heavy', 0.2, 'strafe'), e('heavy', 0.4, 'pendulum'), e('heavy', 0.6, 'pendulum'), e('heavy', 0.8, 'strafe'), e('sentinel', 0.5)], 0.5, 'vee'),
            makeWave([e('fighter', 0.1, 'swoop'), e('fighter', 0.3, 'swoop'), e('fighter', 0.5, 'dive'), e('fighter', 0.7, 'swoop'), e('fighter', 0.9, 'swoop'), e('phantom', 0.5, 'spiral')], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('heavy', 0.2, 'spiral'), e('heavy', 0.8, 'spiral'), e('phantom', 0.5, 'circle')], 0.5, 'cross'),
        ]
    },
    {
        name: 'Singularity',
        description: 'One way in. No way out.',
        speedMult: 1.55,
        boss: null,
        waves: [
            makeWave([e('heavy', 0.2, 'pendulum'), e('sentinel', 0.35, 'strafe'), e('heavy', 0.5), e('sentinel', 0.65, 'strafe'), e('heavy', 0.8, 'pendulum')], 0.5, 'diamond'),
            makeWave([e('phantom', 0.2, 'spiral'), e('phantom', 0.4, 'spiral'), e('phantom', 0.6, 'spiral'), e('phantom', 0.8, 'spiral')], 0.5, 'ring'),
            makeWave([e('fighter', 0.1, 'swoop'), e('fighter', 0.3, 'swoop'), e('fighter', 0.5, 'swoop'), e('fighter', 0.7, 'swoop'), e('fighter', 0.9, 'swoop')], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.2, 'pendulum'), e('sentinel', 0.4), e('sentinel', 0.5), e('sentinel', 0.6), e('sentinel', 0.8, 'pendulum')], 0.5, 'stagger'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.5, 'spiral'), e('heavy', 0.7, 'strafe'), e('phantom', 0.2, 'circle'), e('phantom', 0.8, 'circle'), e('swarm', 0.4), e('swarm', 0.6)], 0.5, 'cross'),
        ]
    },
    {
        name: 'Event Horizon',
        description: 'Cross the point of no return.',
        speedMult: 1.55,
        boss: null,
        waves: [
            makeWave([e('heavy', 0.2, 'strafe'), e('heavy', 0.4, 'pendulum'), e('heavy', 0.6, 'pendulum'), e('heavy', 0.8, 'strafe'), e('heavy', 0.5, 'spiral')], 0.5, 'vee'),
            makeWave([e('sentinel', 0.2, 'pendulum'), e('sentinel', 0.4), e('sentinel', 0.6), e('sentinel', 0.8, 'pendulum'), e('phantom', 0.5, 'spiral')], 0.5, 'line'),
            makeWave([e('phantom', 0.1, 'spiral'), e('phantom', 0.3, 'circle'), e('phantom', 0.5, 'spiral'), e('phantom', 0.7, 'circle'), e('phantom', 0.9, 'spiral')], 0.5, 'ring'),
            makeWave([e('fighter', 0.2, 'swoop'), e('fighter', 0.4, 'swoop'), e('fighter', 0.6, 'swoop'), e('fighter', 0.8, 'swoop'), e('heavy', 0.5, 'pendulum'), e('sentinel', 0.3, 'strafe'), e('sentinel', 0.7, 'strafe')], 0.5, 'arrow'),
            makeWave([e('heavy', 0.3, 'spiral'), e('heavy', 0.5, 'pendulum'), e('heavy', 0.7, 'spiral'), e('sentinel', 0.5), e('phantom', 0.2, 'circle'), e('phantom', 0.8, 'circle')], 0.5, 'cross'),
        ]
    },
    // ===== LEVEL 30: Final Boss - Apocalypse =====
    {
        name: 'Apocalypse',
        description: 'THE FINAL BATTLE. Destroy the core!',
        speedMult: 1.4,
        boss: 6,
        waves: [
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.5, 'pendulum'), e('heavy', 0.7, 'strafe'), e('sentinel', 0.2), e('sentinel', 0.8)], 1, 'cross'),
            makeWave([e('phantom', 0.2, 'spiral'), e('phantom', 0.4, 'circle'), e('phantom', 0.6, 'circle'), e('phantom', 0.8, 'spiral')], 1, 'ring'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('heavy', 0.2, 'strafe'), e('heavy', 0.8, 'strafe')], 1.5, 'diamond'),
        ]
    },

    // ═══════════════════════════════════════════════════════════
    //  WORLD 2 — PLANETARY FLYOVER (Levels 31-60)
    //  6 Planets × 5 Levels — Low-altitude planetary flight
    // ═══════════════════════════════════════════════════════════

    // ═════ PLANET 1: ALIEN JUNGLE (Levels 31-35) ═════

    // ===== LEVEL 31: Jungle Descent =====
    {
        name: 'Jungle Descent',
        description: 'Entering alien jungle atmosphere. Watch for vines!',
        speedMult: 1.3,
        boss: null,
        miniboss: 5, // L31: Vine Sentinel
        waves: [
            makeWave([e('scout', 0.3), e('scout', 0.5), e('scout', 0.7), e('jungle_vine', 0.5)], 1),
            makeWave([e('jungle_vine', 0.3, 'sine'), e('jungle_vine', 0.7, 'sine'), e('fighter', 0.5)], 1.5),
            makeWave([e('stalker', 0.4, 'zigzag'), e('stalker', 0.6, 'zigzag'), e('scout', 0.2), e('scout', 0.8)], 1.5, 'pincer'),
        ]
    },
    // ===== LEVEL 32: Canopy Run =====
    {
        name: 'Canopy Run',
        description: 'Dense canopy — spawner nests ahead!',
        speedMult: 1.35,
        boss: null,
        miniboss: 6, // L32: Magma Sprite
        waves: [
            makeWave([e('nest', 0.5), e('jungle_vine', 0.3), e('jungle_vine', 0.7)], 1),
            makeWave([e('stalker', 0.3, 'sine'), e('stalker', 0.7, 'sine'), e('fighter', 0.5, 'zigzag')], 1.5, 'vee'),
            makeWave([e('jungle_vine', 0.2, 'strafe'), e('jungle_vine', 0.5), e('jungle_vine', 0.8, 'strafe'), e('stalker', 0.4)], 1),
            makeWave([e('nest', 0.3), e('nest', 0.7), e('stalker', 0.5, 'pendulum')], 1.5, 'line'),
        ]
    },
    // ===== LEVEL 33: Root Ambush =====
    {
        name: 'Root Ambush',
        description: 'Camouflaged predators lurk in the roots.',
        speedMult: 1.35,
        boss: null,
        miniboss: 7, // L33: Cryo Colossus
        waves: [makeWave([e('nest', 0.5), e('stalker', 0.2, 'zigzag'), e('stalker', 0.8, 'zigzag'), e('fighter', 0.4), e('fighter', 0.6)], 1, 'diamond'),
            makeWave([e('jungle_vine', 0.2), e('jungle_vine', 0.4), e('jungle_vine', 0.6), e('jungle_vine', 0.8)], 1.5, 'stagger'),
            makeWave([e('jungle_vine', 0.3, 'dive'), e('jungle_vine', 0.7, 'dive'), e('stalker', 0.5, 'sine')], 1.5, 'vee'),
            makeWave([e('stalker', 0.2, 'strafe'), e('jungle_vine', 0.5, 'pendulum'), e('stalker', 0.8, 'strafe'), e('fighter', 0.4)], 1, 'cross'),
        ]
    },
    // ===== LEVEL 34: Ancient Ruins =====
    {
        name: 'Ancient Ruins',
        description: 'Overgrown alien ruins — heavy resistance.',
        speedMult: 1.4,
        boss: null,
        miniboss: 8, // L34: Rust Hulk
        waves: [
            makeWave([e('stalker', 0.2, 'spiral'), e('stalker', 0.5, 'sine'), e('stalker', 0.8, 'spiral'), e('nest', 0.5)], 1, 'cross'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.7, 'strafe'), e('jungle_vine', 0.2, 'dive'), e('jungle_vine', 0.8, 'dive')], 1.5, 'pincer'),
            makeWave([e('nest', 0.3), e('nest', 0.7), e('stalker', 0.5, 'circle'), e('sentinel', 0.5)], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 35: Boss - Titanus Rex =====
    {
        name: 'Titanus Rex',
        description: 'WARNING: Planet guardian detected!',
        speedMult: 1.3,
        boss: 7,
        miniboss: 5, // L35 boss: Vine Sentinel
        waves: [
            makeWave([e('jungle_vine', 0.3, 'sine'), e('jungle_vine', 0.7, 'sine')], 1),
            makeWave([e('stalker', 0.3), e('stalker', 0.5), e('stalker', 0.7)], 2),
        ]
    },

    // ═════ PLANET 2: VOLCANIC (Levels 36-40) ═════

    // ===== LEVEL 36: Volcanic Entry =====
    {
        name: 'Volcanic Entry',
        description: 'Lava flows below. Fire creatures emerge!',
        speedMult: 1.35,
        boss: null,
        miniboss: 6, // L36: Magma Sprite
        waves: [
            makeWave([e('lava_golem', 0.5), e('fighter', 0.3, 'sine'), e('fighter', 0.7, 'sine')], 1),
            makeWave([e('lava_golem', 0.3), e('lava_golem', 0.7), e('stalker', 0.5, 'zigzag')], 1.5, 'vee'),
            makeWave([e('nest', 0.5), e('lava_golem', 0.2, 'strafe'), e('lava_golem', 0.8, 'strafe')], 1.5),
            makeWave([e('lava_golem', 0.2, 'zigzag'), e('lava_golem', 0.8, 'zigzag'), e('stalker', 0.4, 'dive'), e('stalker', 0.6, 'dive')], 1, 'pincer'),
        ]
    },
    // ===== LEVEL 37: Magma Flow =====
    {
        name: 'Magma Flow',
        description: 'The eruptions intensify. Stay mobile!',
        speedMult: 1.4,
        boss: null,
        miniboss: 7, // L37: Cryo Colossus
        waves: [
            makeWave([e('lava_golem', 0.3, 'pendulum'), e('lava_golem', 0.5), e('lava_golem', 0.7, 'pendulum')], 1, 'line'),
            makeWave([e('heavy', 0.5, 'strafe'), e('lava_golem', 0.2, 'dive'), e('lava_golem', 0.8, 'dive'), e('stalker', 0.4)], 1, 'diamond'),
            makeWave([e('nest', 0.3), e('lava_golem', 0.5, 'spiral'), e('nest', 0.7)], 1.5),
            makeWave([e('lava_golem', 0.2, 'swoop'), e('lava_golem', 0.4, 'swoop'), e('lava_golem', 0.6, 'swoop'), e('lava_golem', 0.8, 'swoop')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 38: Caldera Siege =====
    {
        name: 'Caldera Siege',
        description: 'The caldera is defended. Break through!',
        speedMult: 1.4,
        boss: null,
        miniboss: 8, // L38: Rust Hulk
        waves: [
            makeWave([e('stalker', 0.3, 'circle'), e('stalker', 0.7, 'circle'), e('lava_golem', 0.5, 'pendulum')], 1.5, 'ring'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.7, 'strafe'), e('lava_golem', 0.5), e('nest', 0.5)], 1),
            makeWave([e('lava_golem', 0.2, 'spiral'), e('lava_golem', 0.4), e('lava_golem', 0.6), e('lava_golem', 0.8, 'spiral'), e('stalker', 0.5)], 1, 'stagger'),
            makeWave([e('lava_golem', 0.2, 'swoop'), e('lava_golem', 0.4, 'swoop'), e('lava_golem', 0.6, 'swoop'), e('lava_golem', 0.8, 'swoop')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 39: Infernal Ridge  =====
    {
        name: 'Infernal Ridge',
        description: 'The ridge erupts with molten fury.',
        speedMult: 1.45,
        boss: null,
        miniboss: 5, // L39: Vine Sentinel
        waves: [
            makeWave([e('lava_golem', 0.2, 'strafe'), e('lava_golem', 0.4, 'pendulum'), e('lava_golem', 0.6, 'pendulum'), e('lava_golem', 0.8, 'strafe')], 0.5, 'cross'),
            makeWave([e('nest', 0.3), e('lava_golem', 0.5, 'spiral'), e('nest', 0.7), e('sentinel', 0.5)], 0.5),
            makeWave([e('lava_golem', 0.1, 'swoop'), e('lava_golem', 0.3, 'swoop'), e('lava_golem', 0.5, 'dive'), e('lava_golem', 0.7, 'swoop'), e('lava_golem', 0.9, 'swoop')], 0.5, 'arrow'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('lava_golem', 0.5, 'pendulum')], 1, 'ring'),
        ]
    },
    // ===== LEVEL 40: Boss - Magma Colossus =====
    {
        name: 'Magma Colossus',
        description: 'WARNING: Volcanic titan awakens!',
        speedMult: 1.35,
        boss: 8,
        miniboss: 6, // L40 boss: Magma Sprite
        waves: [
            makeWave([e('lava_golem', 0.3, 'sine'), e('lava_golem', 0.7, 'sine')], 1),
            makeWave([e('heavy', 0.4), e('heavy', 0.6), e('stalker', 0.5)], 2),
        ]
    },

    // ═════ PLANET 3: FROZEN (Levels 41-45) ═════

    // ===== LEVEL 41: Frozen Approach =====
    {
        name: 'Frozen Approach',
        description: 'Sub-zero temperatures. Ice elementals emerge.',
        speedMult: 1.4,
        boss: null,
        miniboss: 7, // L41: Cryo Colossus
        waves: [
            makeWave([e('frost_elemental', 0.5), e('fighter', 0.3), e('fighter', 0.7)], 1),
            makeWave([e('frost_elemental', 0.3, 'sine'), e('frost_elemental', 0.7, 'sine'), e('stalker', 0.5, 'zigzag')], 1.5, 'vee'),
            makeWave([e('frost_elemental', 0.2), e('frost_elemental', 0.5), e('frost_elemental', 0.8), e('nest', 0.5)], 1.5, 'line'),
            makeWave([e('frost_elemental', 0.3, 'strafe'), e('frost_elemental', 0.7, 'strafe'), e('stalker', 0.5, 'dive')], 1, 'pincer'),
            makeWave([e('heavy', 0.4), e('heavy', 0.6), e('frost_elemental', 0.2, 'spiral'), e('frost_elemental', 0.8, 'spiral')], 1.5, 'cross'),
        ]
    },
    // ===== LEVEL 42: Glacier Valley =====
    {
        name: 'Glacier Valley',
        description: 'The valley narrows. Ice formations block the path.',
        speedMult: 1.45,
        boss: null,
        miniboss: 8, // L42: Rust Hulk
        waves: [
            makeWave([e('frost_elemental', 0.3, 'pendulum'), e('frost_elemental', 0.7, 'pendulum'), e('sentinel', 0.5)], 1, 'diamond'),
            makeWave([e('stalker', 0.2, 'spiral'), e('stalker', 0.8, 'spiral'), e('frost_elemental', 0.4), e('frost_elemental', 0.6)], 1, 'ring'),
            makeWave([e('heavy', 0.5, 'strafe'), e('frost_elemental', 0.3, 'sine'), e('frost_elemental', 0.7, 'sine'), e('nest', 0.5)], 1.5, 'cross'),
            makeWave([e('frost_elemental', 0.2, 'dive'), e('frost_elemental', 0.4, 'dive'), e('frost_elemental', 0.6, 'dive'), e('frost_elemental', 0.8, 'dive')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 43: Crystal Cavern =====
    {
        name: 'Crystal Cavern',
        description: 'Inside the crystal cavern. Watch reflections!',
        speedMult: 1.45,
        boss: null,
        miniboss: 5, // L43: Vine Sentinel
        waves: [
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('stalker', 0.5, 'sine'), e('frost_elemental', 0.2, 'strafe'), e('frost_elemental', 0.8, 'strafe')], 1, 'pincer'),
            makeWave([e('nest', 0.3), e('frost_elemental', 0.5, 'spiral'), e('nest', 0.7), e('heavy', 0.5)], 1.5),
            makeWave([e('phantom', 0.3, 'sine'), e('phantom', 0.7, 'sine'), e('frost_elemental', 0.5, 'pendulum'), e('stalker', 0.2), e('stalker', 0.8)], 1, 'stagger'),
            makeWave([e('frost_elemental', 0.2, 'swoop'), e('frost_elemental', 0.4, 'swoop'), e('frost_elemental', 0.6, 'swoop'), e('frost_elemental', 0.8, 'swoop')], 1, 'arrow'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.7, 'strafe'), e('frost_elemental', 0.5, 'pendulum')], 1.5),
        ]
    },
    // ===== LEVEL 44: The Permafrost =====
    {
        name: 'The Permafrost',
        description: 'Eternal frost. The guardian stirs.',
        speedMult: 1.5,
        boss: null,
        miniboss: 6, // L44: Magma Sprite
        waves: [
            makeWave([e('stalker', 0.3, 'circle'), e('stalker', 0.5, 'spiral'), e('stalker', 0.7, 'circle'), e('sentinel', 0.5)], 0.5, 'ring'),
            makeWave([e('heavy', 0.3, 'pendulum'), e('heavy', 0.7, 'pendulum'), e('frost_elemental', 0.5, 'dive'), e('nest', 0.5)], 0.5, 'vee'),
            makeWave([e('frost_elemental', 0.1, 'swoop'), e('frost_elemental', 0.3, 'swoop'), e('frost_elemental', 0.5, 'swoop'), e('frost_elemental', 0.7, 'swoop'), e('frost_elemental', 0.9, 'swoop')], 0.5, 'arrow'),
            makeWave([e('phantom', 0.3, 'spiral'), e('phantom', 0.7, 'spiral'), e('frost_elemental', 0.5, 'circle')], 1, 'diamond'),
            makeWave([e('frost_elemental', 0.2, 'dive'), e('frost_elemental', 0.4, 'dive'), e('frost_elemental', 0.6, 'dive'), e('frost_elemental', 0.8, 'dive')], 0.5, 'line'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('frost_elemental', 0.2), e('frost_elemental', 0.5), e('frost_elemental', 0.8)], 0.5, 'stagger'),
        ]
    },
    // ===== LEVEL 45: Boss - Frost Sovereign =====
    {
        name: 'Frost Sovereign',
        description: 'WARNING: The ice lord descends!',
        speedMult: 1.4,
        boss: 9,
        miniboss: 7, // L45 boss: Cryo Colossus
        waves: [
            makeWave([e('frost_elemental', 0.3, 'circle'), e('frost_elemental', 0.7, 'circle')], 1),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7)], 2),
        ]
    },

    // ═════ PLANET 4: DESERT (Levels 46-50) ═════

    // ===== LEVEL 46: Desert Landing =====
    {
        name: 'Desert Landing',
        description: 'Scorching sands and burrowing wurms.',
        speedMult: 1.45,
        boss: null,
        miniboss: 8, // L46: Rust Hulk
        waves: [
            makeWave([e('sand_wurm', 0.3, 'zigzag'), e('sand_wurm', 0.7, 'zigzag'), e('stalker', 0.5)], 1.5, 'pincer'),
            makeWave([e('nest', 0.5), e('sand_wurm', 0.2, 'pendulum'), e('sand_wurm', 0.8, 'pendulum'), e('heavy', 0.5)], 1.5),
            makeWave([e('sand_wurm', 0.2, 'strafe'), e('sand_wurm', 0.8, 'strafe'), e('fighter', 0.4), e('fighter', 0.6)], 1, 'diamond'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('sand_wurm', 0.5, 'sine')], 1.5, 'line'),
        ]
    },
    // ===== LEVEL 47: Dune Crossing =====
    {
        name: 'Dune Crossing',
        description: 'Sandstorms reduce visibility. Stay alert!',
        speedMult: 1.5,
        boss: null,
        miniboss: 5, // L47: Vine Sentinel
        waves: [
            makeWave([e('stalker', 0.2, 'sine'), e('stalker', 0.5, 'spiral'), e('stalker', 0.8, 'sine'), e('sand_wurm', 0.4)], 1, 'ring'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('sand_wurm', 0.5, 'pendulum'), e('nest', 0.5)], 1.5, 'diamond'),
            makeWave([e('sand_wurm', 0.2, 'dive'), e('sand_wurm', 0.4, 'dive'), e('sand_wurm', 0.6, 'dive'), e('sand_wurm', 0.8, 'dive')], 1, 'arrow'),
            makeWave([e('heavy', 0.5, 'strafe'), e('sand_wurm', 0.3, 'sine'), e('sand_wurm', 0.7, 'sine')], 1, 'cross'),
            makeWave([e('sand_wurm', 0.2, 'swoop'), e('sand_wurm', 0.4, 'swoop'), e('sand_wurm', 0.6, 'swoop'), e('sand_wurm', 0.8, 'swoop'), e('stalker', 0.5)], 1, 'stagger'),
        ]
    },
    // ===== LEVEL 48: Oasis Siege =====
    {
        name: 'Oasis Siege',
        description: 'The oasis is fortified. Break the lines!',
        speedMult: 1.5,
        boss: null,
        miniboss: 6, // L48: Magma Sprite
        waves: [
            makeWave([e('sand_wurm', 0.3, 'circle'), e('sand_wurm', 0.7, 'circle'), e('sentinel', 0.5)], 1, 'ring'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.7, 'strafe'), e('sand_wurm', 0.5, 'spiral'), e('stalker', 0.2), e('stalker', 0.8)], 1, 'cross'),
            makeWave([e('nest', 0.3), e('sand_wurm', 0.5, 'pendulum'), e('nest', 0.7), e('phantom', 0.5, 'circle')], 1.5),
            makeWave([e('sand_wurm', 0.2, 'swoop'), e('sand_wurm', 0.4, 'swoop'), e('sand_wurm', 0.6, 'swoop'), e('sand_wurm', 0.8, 'swoop'), e('sentinel', 0.5)], 1, 'stagger'),
        ]
    },
    // ===== LEVEL 49: Temple of Storms =====
    {
        name: 'Temple of Storms',
        description: 'Ancient desert temple. Maximum threat.',
        speedMult: 1.55,
        boss: null,
        miniboss: 7, // L49: Cryo Colossus
        waves: [
            makeWave([e('sand_wurm', 0.2, 'strafe'), e('sand_wurm', 0.4, 'pendulum'), e('sand_wurm', 0.6, 'pendulum'), e('sand_wurm', 0.8, 'strafe')], 0.5, 'cross'),
            makeWave([e('stalker', 0.3, 'spiral'), e('stalker', 0.7, 'spiral'), e('heavy', 0.5, 'strafe')], 0.5, 'pincer'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('sand_wurm', 0.5, 'spiral'), e('nest', 0.3), e('nest', 0.7)], 0.5, 'ring'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('sand_wurm', 0.2, 'dive'), e('sand_wurm', 0.8, 'dive')], 0.5, 'diamond'),
            makeWave([e('sand_wurm', 0.1, 'swoop'), e('sand_wurm', 0.3, 'swoop'), e('sand_wurm', 0.5, 'dive'), e('sand_wurm', 0.7, 'swoop'), e('sand_wurm', 0.9, 'swoop')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 50: Boss - Sandstorm Leviathan =====
    {
        name: 'Sandstorm Leviathan',
        description: 'WARNING: The sand titan rises!',
        speedMult: 1.45,
        boss: 10,
        miniboss: 8, // L50 boss: Rust Hulk
        waves: [
            makeWave([e('sand_wurm', 0.3, 'pendulum'), e('sand_wurm', 0.7, 'pendulum')], 1),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7), e('heavy', 0.5)], 2),
        ]
    },

    // ═════ PLANET 5: MECHANICAL (Levels 51-55) ═════

    // ===== LEVEL 51: Factory Floor =====
    {
        name: 'Factory Floor',
        description: 'Automated defenses online. Drones inbound!',
        speedMult: 1.5,
        boss: null,
        miniboss: 5, // L51: Vine Sentinel
        waves: [
            makeWave([e('mech_drone', 0.5), e('fighter', 0.3), e('fighter', 0.7)], 1),
            makeWave([e('mech_drone', 0.3, 'strafe'), e('mech_drone', 0.7, 'strafe'), e('stalker', 0.5, 'sine')], 1.5, 'line'),
            makeWave([e('nest', 0.5), e('mech_drone', 0.2), e('mech_drone', 0.8), e('sentinel', 0.5)], 1.5, 'diamond'),
            makeWave([e('mech_drone', 0.2, 'sine'), e('mech_drone', 0.8, 'sine'), e('heavy', 0.5, 'pendulum'), e('stalker', 0.3), e('stalker', 0.7)], 1, 'cross'),
        ]
    },
    // ===== LEVEL 52: Assembly Line =====
    {
        name: 'Assembly Line',
        description: 'Endless production. They keep coming!',
        speedMult: 1.55,
        boss: null,
        miniboss: 6, // L52: Magma Sprite
        waves: [
            makeWave([e('mech_drone', 0.2, 'pendulum'), e('mech_drone', 0.4), e('mech_drone', 0.6), e('mech_drone', 0.8, 'pendulum')], 1, 'line'),
            makeWave([e('stalker', 0.3, 'circle'), e('stalker', 0.7, 'circle'), e('mech_drone', 0.5, 'strafe')], 1, 'ring'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.7, 'strafe'), e('mech_drone', 0.5), e('nest', 0.5)], 1.5, 'cross'),
            makeWave([e('mech_drone', 0.2, 'sine'), e('mech_drone', 0.4, 'sine'), e('mech_drone', 0.6, 'sine'), e('mech_drone', 0.8, 'sine')], 1, 'stagger'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('mech_drone', 0.5, 'spiral')], 1, 'diamond'),
        ]
    },
    // ===== LEVEL 53: Control Core =====
    {
        name: 'Control Core',
        description: 'Deep inside the machine. The AI fights back.',
        speedMult: 1.55,
        boss: null,
        miniboss: 7, // L53: Cryo Colossus
        waves: [
            makeWave([e('mech_drone', 0.3, 'circle'), e('mech_drone', 0.5, 'circle'), e('mech_drone', 0.7, 'circle')], 1, 'ring'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.7, 'pendulum'), e('mech_drone', 0.5, 'spiral'), e('stalker', 0.2), e('stalker', 0.8)], 1, 'pincer'),
            makeWave([e('nest', 0.3), e('mech_drone', 0.5, 'strafe'), e('nest', 0.7), e('phantom', 0.5, 'circle')], 1.5),
            makeWave([e('mech_drone', 0.1, 'swoop'), e('mech_drone', 0.3, 'swoop'), e('mech_drone', 0.5, 'dive'), e('mech_drone', 0.7, 'swoop'), e('mech_drone', 0.9, 'swoop')], 1, 'arrow'),
            makeWave([e('heavy', 0.3, 'strafe'), e('heavy', 0.5, 'pendulum'), e('heavy', 0.7, 'strafe'), e('mech_drone', 0.2), e('mech_drone', 0.8)], 1, 'cross'),
        ]
    },
    // ===== LEVEL 54: Reactor Chamber =====
    {
        name: 'Reactor Chamber',
        description: 'Approaching the reactor. Energy levels critical!',
        speedMult: 1.6,
        boss: null,
        miniboss: 8, // L54: Rust Hulk
        waves: [
            makeWave([e('stalker', 0.3, 'spiral'), e('stalker', 0.5, 'circle'), e('stalker', 0.7, 'spiral'), e('mech_drone', 0.2, 'swoop'), e('mech_drone', 0.8, 'swoop')], 0.5, 'ring'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('mech_drone', 0.5, 'spiral'), e('nest', 0.3), e('nest', 0.7)], 0.5),
            makeWave([e('mech_drone', 0.2, 'dive'), e('mech_drone', 0.4, 'dive'), e('mech_drone', 0.6, 'dive'), e('mech_drone', 0.8, 'dive'), e('heavy', 0.5)], 0.5, 'arrow'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('mech_drone', 0.2, 'strafe'), e('mech_drone', 0.8, 'strafe')], 1, 'stagger'),
            makeWave([e('mech_drone', 0.2, 'circle'), e('mech_drone', 0.4, 'spiral'), e('mech_drone', 0.6, 'spiral'), e('mech_drone', 0.8, 'circle'), e('sentinel', 0.5)], 0.5, 'cross'),
        ]
    },
    // ===== LEVEL 55: Boss - Omega Construct =====
    {
        name: 'Omega Construct',
        description: 'WARNING: The machine god activates!',
        speedMult: 1.5,
        boss: 11,
        miniboss: 5, // L55 boss: Vine Sentinel
        waves: [
            makeWave([e('mech_drone', 0.3, 'strafe'), e('mech_drone', 0.7, 'strafe')], 1),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.5), e('sentinel', 0.7), e('mech_drone', 0.5)], 2),
            makeWave([e('stalker', 0.3, 'spiral'), e('stalker', 0.7, 'spiral'), e('mech_drone', 0.5, 'circle')], 1.5, 'ring'),
        ]
    },

    // ═════ PLANET 6: TOXIC (Levels 56-60) ═════

    // ===== LEVEL 56: Toxic Shores =====
    {
        name: 'Toxic Shores',
        description: 'Poisonous atmosphere. Toxic blobs emerge!',
        speedMult: 1.55,
        boss: null,
        miniboss: 6, // L56: Magma Sprite
        waves: [
            makeWave([e('toxic_blob', 0.3, 'zigzag'), e('toxic_blob', 0.7, 'zigzag'), e('stalker', 0.5)], 1.5, 'vee'),
            makeWave([e('nest', 0.5), e('toxic_blob', 0.2), e('toxic_blob', 0.8), e('heavy', 0.5)], 1.5, 'line'),
            makeWave([e('toxic_blob', 0.2, 'strafe'), e('toxic_blob', 0.8, 'strafe'), e('stalker', 0.4, 'sine'), e('stalker', 0.6, 'sine')], 1, 'diamond'),
            makeWave([e('sentinel', 0.3), e('sentinel', 0.7), e('toxic_blob', 0.5, 'pendulum'), e('nest', 0.5)], 1.5, 'cross'),
        ]
    },
    // ===== LEVEL 57: Acid Rain =====
    {
        name: 'Acid Rain',
        description: 'Corrosive rain falls. The blobs multiply!',
        speedMult: 1.55,
        boss: null,
        miniboss: 7, // L57: Cryo Colossus
        waves: [
            makeWave([e('stalker', 0.2, 'spiral'), e('stalker', 0.8, 'spiral'), e('toxic_blob', 0.5, 'sine')], 1, 'ring'),
            makeWave([e('heavy', 0.5, 'strafe'), e('toxic_blob', 0.3, 'strafe'), e('toxic_blob', 0.7, 'strafe'), e('nest', 0.5)], 1.5, 'cross'),
            makeWave([e('toxic_blob', 0.2, 'swoop'), e('toxic_blob', 0.4, 'swoop'), e('toxic_blob', 0.6, 'swoop'), e('toxic_blob', 0.8, 'swoop')], 1, 'arrow'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('toxic_blob', 0.5, 'pendulum')], 1, 'diamond'),
            makeWave([e('sentinel', 0.3, 'strafe'), e('sentinel', 0.7, 'strafe'), e('toxic_blob', 0.5, 'spiral'), e('stalker', 0.2), e('stalker', 0.8)], 1, 'pincer'),
        ]
    },
    // ===== LEVEL 58: Mutation Zone =====
    {
        name: 'Mutation Zone',
        description: 'Maximum radiation. Everything here wants you dead.',
        speedMult: 1.6,
        boss: null,
        miniboss: 8, // L58: Rust Hulk
        waves: [
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.7, 'pendulum'), e('toxic_blob', 0.5, 'spiral'), e('stalker', 0.2), e('stalker', 0.8)], 1, 'pincer'),
            makeWave([e('nest', 0.3), e('toxic_blob', 0.5, 'strafe'), e('nest', 0.7), e('phantom', 0.5, 'circle')], 1.5),
            makeWave([e('toxic_blob', 0.2, 'dive'), e('toxic_blob', 0.4, 'dive'), e('toxic_blob', 0.6, 'dive'), e('toxic_blob', 0.8, 'dive'), e('heavy', 0.5)], 1, 'stagger'),
            makeWave([e('mech_drone', 0.3, 'strafe'), e('mech_drone', 0.7, 'strafe'), e('toxic_blob', 0.5, 'pendulum')], 1, 'diamond'),
            makeWave([e('toxic_blob', 0.1, 'swoop'), e('toxic_blob', 0.3, 'swoop'), e('toxic_blob', 0.5, 'dive'), e('toxic_blob', 0.7, 'swoop'), e('toxic_blob', 0.9, 'swoop')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 59: Ground Zero =====
    {
        name: 'Ground Zero',
        description: 'The toxic heart. The Emperor awaits.',
        speedMult: 1.65,
        boss: null,
        miniboss: 5, // L59: Vine Sentinel
        waves: [
            makeWave([e('stalker', 0.3, 'spiral'), e('stalker', 0.5, 'circle'), e('stalker', 0.7, 'spiral'), e('toxic_blob', 0.2, 'swoop'), e('toxic_blob', 0.8, 'swoop')], 0.5, 'ring'),
            makeWave([e('phantom', 0.3, 'circle'), e('phantom', 0.7, 'circle'), e('toxic_blob', 0.5, 'spiral'), e('nest', 0.3), e('nest', 0.7)], 0.5),
            makeWave([e('mech_drone', 0.3, 'strafe'), e('mech_drone', 0.7, 'strafe'), e('toxic_blob', 0.5, 'pendulum'), e('heavy', 0.2, 'spiral'), e('heavy', 0.8, 'spiral')], 0.5, 'diamond'),
            makeWave([e('toxic_blob', 0.1, 'swoop'), e('toxic_blob', 0.3, 'swoop'), e('toxic_blob', 0.5, 'dive'), e('toxic_blob', 0.7, 'swoop'), e('toxic_blob', 0.9, 'swoop'), e('sentinel', 0.5)], 1, 'arrow'),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('toxic_blob', 0.2, 'strafe'), e('toxic_blob', 0.8, 'strafe')], 0.5, 'stagger'),
        ]
    },
    // ===== LEVEL 60: Boss - Toxin Emperor =====
    {
        name: 'Toxin Emperor',
        description: 'THE ULTIMATE THREAT. Purify the planet!',
        speedMult: 1.55,
        boss: 12,
        miniboss: 6, // L60 boss: Magma Sprite
        waves: [
            makeWave([e('toxic_blob', 0.3, 'circle'), e('toxic_blob', 0.7, 'circle'), e('stalker', 0.5)], 1),
            makeWave([e('sentinel', 0.3, 'pendulum'), e('sentinel', 0.5), e('sentinel', 0.7, 'pendulum'), e('mech_drone', 0.5)], 1),
            makeWave([e('phantom', 0.3, 'spiral'), e('phantom', 0.5, 'spiral'), e('phantom', 0.7, 'spiral'), e('toxic_blob', 0.5)], 1.5, 'ring'),
        ]
    },
];

export function getLevelData(level) {
    const idx = Math.min(level - 1, LEVEL_DATA.length - 1);
    const base = LEVEL_DATA[idx];

    // Generate bonus waves based on level
    const bonusWaves = generateBonusWaves(level);
    // World 2 speed damping: reduce inherited speedMult to keep normal difficulty manageable
    const sMult = level > 30 ? base.speedMult * 0.82 : base.speedMult;
    return {
        ...base,
        speedMult: sMult,
        waves: [...base.waves, ...bonusWaves]
    };
}

/**
 * Generate extra enemy waves based on level.
 * More waves and tougher compositions at higher levels.
 */
function generateBonusWaves(level) {
    // Boss levels get fewer bonus waves (focus on the boss)
    const w1BossLevels = [5, 10, 15, 20, 25, 30];
    const w2BossLevels = [35, 40, 45, 50, 55, 60];
    const isBoss = w1BossLevels.includes(level) || w2BossLevels.includes(level);

    // Use world-relative level so W2 feels like W1 in length
    const relLevel = level > 30 ? level - 30 : level;

    const bonusCount = isBoss ? Math.floor(relLevel / 10) : (level > 30
        ? Math.floor(relLevel / 5) + 1   // W2: fewer bonus waves
        : Math.floor(relLevel / 3) + 1); // W1: original formula
    // Clamp to reasonable range: 1 for W2, 1-8 for W1
    const maxBonusWaves = level > 30 ? 5 : 8;
    const count = Math.min(maxBonusWaves, Math.max(1, bonusCount));

    const formations = ['none', 'vee', 'line', 'diamond', 'pincer', 'ring', 'stagger', 'cross', 'arrow'];
    const patterns = ['straight', 'sine', 'zigzag', 'dive', 'circle', 'spiral', 'strafe', 'swoop', 'pendulum'];

    // ─── World 1 enemy pools ───
    const earlyTypes = ['scout', 'swarm', 'fighter'];
    const midTypes = ['fighter', 'heavy', 'phantom', 'swarm'];
    const lateTypes = ['fighter', 'heavy', 'phantom', 'sentinel'];
    const endTypes = ['heavy', 'phantom', 'sentinel'];

    // ─── World 2 enemy pools (includes W1 + W2 enemies) ───
    const w2JunglePool = ['stalker', 'jungle_vine', 'nest', 'fighter', 'scout'];
    const w2VolcanicPool = ['stalker', 'lava_golem', 'nest', 'heavy', 'fighter'];
    const w2FrostPool = ['stalker', 'frost_elemental', 'nest', 'sentinel', 'heavy'];
    const w2DesertPool = ['stalker', 'sand_wurm', 'nest', 'phantom', 'sentinel'];
    const w2MechPool = ['stalker', 'mech_drone', 'nest', 'sentinel', 'heavy', 'phantom'];
    const w2ToxicPool = ['stalker', 'toxic_blob', 'nest', 'sentinel', 'phantom', 'mech_drone'];

    let pool;
    if (level <= 5) pool = earlyTypes;
    else if (level <= 12) pool = midTypes;
    else if (level <= 22) pool = lateTypes;
    else if (level <= 30) pool = endTypes;
    else if (level <= 35) pool = w2JunglePool;
    else if (level <= 40) pool = w2VolcanicPool;
    else if (level <= 45) pool = w2FrostPool;
    else if (level <= 50) pool = w2DesertPool;
    else if (level <= 55) pool = w2MechPool;
    else pool = w2ToxicPool;

    const waves = [];
    for (let w = 0; w < count; w++) {
        // Enemy count scales with world-relative level: 3 at L1, up to 6 at endgame
        const enemyCount = Math.min(6, 3 + Math.floor(relLevel / 7) + Math.floor(w / 3));
        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const type = pool[Math.floor(Math.random() * pool.length)];
            const x = 0.1 + (i / (enemyCount - 1 || 1)) * 0.8; // spread 0.1-0.9
            const pat = relLevel > 8 ? patterns[Math.floor(Math.random() * patterns.length)] : patterns[Math.floor(Math.random() * 4)];
            enemies.push(e(type, parseFloat(x.toFixed(2)), pat));
        }
        const formation = formations[Math.floor(Math.random() * formations.length)];
        const delay = w === 0 ? 1.5 : (0.5 + Math.random() * 0.5);
        waves.push(makeWave(enemies, parseFloat(delay.toFixed(1)), formation));
    }
    return waves;
}

export function getTotalLevels() {
    return LEVEL_DATA.length;
}

export default LEVEL_DATA;
