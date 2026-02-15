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
];

export function getLevelData(level) {
    const idx = Math.min(level - 1, LEVEL_DATA.length - 1);
    const base = LEVEL_DATA[idx];

    // Generate bonus waves based on level
    const bonusWaves = generateBonusWaves(level);
    return {
        ...base,
        waves: [...base.waves, ...bonusWaves]
    };
}

/**
 * Generate extra enemy waves based on level.
 * More waves and tougher compositions at higher levels.
 */
function generateBonusWaves(level) {
    // Boss levels get fewer bonus waves (focus on the boss)
    const isBoss = [5, 10, 15, 20, 25, 30].includes(level);
    const bonusCount = isBoss ? Math.floor(level / 10) : Math.floor(level / 3) + 1;
    // Clamp to reasonable range: 1-8 bonus waves
    const count = Math.min(8, Math.max(1, bonusCount));

    const formations = ['none', 'vee', 'line', 'diamond', 'pincer', 'ring', 'stagger', 'cross', 'arrow'];
    const patterns = ['straight', 'sine', 'zigzag', 'dive', 'circle', 'spiral', 'strafe', 'swoop', 'pendulum'];

    // Enemy pools by difficulty tier
    const earlyTypes = ['scout', 'swarm', 'fighter'];
    const midTypes = ['fighter', 'heavy', 'phantom', 'swarm'];
    const lateTypes = ['fighter', 'heavy', 'phantom', 'sentinel'];
    const endTypes = ['heavy', 'phantom', 'sentinel'];

    let pool;
    if (level <= 5) pool = earlyTypes;
    else if (level <= 12) pool = midTypes;
    else if (level <= 22) pool = lateTypes;
    else pool = endTypes;

    const waves = [];
    for (let w = 0; w < count; w++) {
        // Enemy count scales with level: 3 at L1, up to 8 at L30
        const enemyCount = Math.min(8, 3 + Math.floor(level / 5) + Math.floor(w / 2));
        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const type = pool[Math.floor(Math.random() * pool.length)];
            const x = 0.1 + (i / (enemyCount - 1 || 1)) * 0.8; // spread 0.1-0.9
            const pat = level > 8 ? patterns[Math.floor(Math.random() * patterns.length)] : patterns[Math.floor(Math.random() * 4)];
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
