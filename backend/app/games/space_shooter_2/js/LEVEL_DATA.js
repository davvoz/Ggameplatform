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
        speedMult: 1,
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
        speedMult: 1,
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
        speedMult: 1,
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
            makeWave([e('scout', 0.3), e('nest', 0.5), e('scout', 0.7), e('jungle_vine', 0.5)], 1),
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

    // ═════════════════════════════════════════════
    //  WORLD 3 — SIMULATION BREAK   (Levels 61-90)
    // ═════════════════════════════════════════════
    // ── Sector 1: Boot Sequence (61-65) ──
    // ===== LEVEL 61: Boot Sequence =====
    {
        name: 'Boot Sequence',
        description: 'The simulation initialises. Something is already wrong.',
        speedMult: 1,
        boss: null,
        waves: [
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.5, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink')], 1),
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.4), e('glitch_drone', 0.6), e('glitch_drone', 0.8, 'glitch_blink')], 1.5),
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.5, 'sine'), e('glitch_drone', 0.7, 'glitch_blink')], 1.5),
        ]
    },
    // ===== LEVEL 62: Memory Leak =====
    {
        name: 'Memory Leak',
        description: 'Data cubes overflow from corrupted sectors.',
        speedMult: 1.05,
        boss: null,
        waves: [
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink'), e('data_cube', 0.5)], 1),
            makeWave([e('data_cube', 0.3), e('data_cube', 0.7), e('glitch_drone', 0.5, 'glitch_blink')], 1.5),
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('data_cube', 0.5), e('glitch_drone', 0.8, 'glitch_blink')], 1),
        ]
    },
    // ===== LEVEL 63: Stutter =====
    {
        name: 'Stutter',
        description: 'Enemies teleport in erratic bursts.',
        speedMult: 1.1,
        boss: null,
        waves: [
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink')], 1, 'pincer'),
            makeWave([e('fragment_shard', 0.5), e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink')], 1.5),
            makeWave([e('data_cube', 0.4), e('fragment_shard', 0.6), e('glitch_drone', 0.2), e('glitch_drone', 0.8)], 1),
            makeWave([e('fragment_shard', 0.3, 'sine'), e('fragment_shard', 0.7, 'sine'), e('glitch_drone', 0.5, 'spiral')], 1.5, 'vee'),
        ]
    },
    // ===== LEVEL 64: Debug Mode =====
    {
        name: 'Debug Mode',
        description: 'Warp bugs materialise through code fissures.',
        speedMult: 1.12,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.5, 'phase_drift'), e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink')], 1),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('warp_bug', 0.7, 'phase_drift'), e('fragment_shard', 0.5, 'zigzag')], 1.5),
            makeWave([e('data_cube', 0.2), e('warp_bug', 0.5, 'phase_drift'), e('data_cube', 0.8), e('glitch_drone', 0.5, 'glitch_blink')], 1, 'diamond'),
            makeWave([e('fragment_shard', 0.3, 'dive'), e('warp_bug', 0.5, 'phase_drift'), e('fragment_shard', 0.7, 'dive')], 1),
        ]
    },
    // ===== LEVEL 65: Boss - Corrupted Compiler =====
    {
        name: 'Corrupted Compiler',
        description: 'Code turns hostile. Compile or be compiled.',
        speedMult: 1.1,
        boss: 13,
        miniboss: 9,
        waves: [
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink'), e('data_cube', 0.5)], 1),
            makeWave([e('fragment_shard', 0.3), e('warp_bug', 0.5, 'phase_drift'), e('fragment_shard', 0.7)], 1),
            makeWave([e('data_cube', 0.3, 'zigzag'), e('data_cube', 0.7, 'zigzag'), e('glitch_drone', 0.5, 'glitch_blink')], 1.5, 'ring'),
        ]
    },

    // ── Sector 2: Null Pointer (66-70) ──
    // ===== LEVEL 66: Null Pointer =====
    {
        name: 'Null Pointer',
        description: 'References collapse. Enemies spawn from the void.',
        speedMult: 1.15,
        boss: null,
        waves: [
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.5, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink'), e('error_node', 0.5)], 1),
            makeWave([e('error_node', 0.3), e('error_node', 0.7), e('glitch_drone', 0.5, 'glitch_blink')], 1.5),
            makeWave([e('fragment_shard', 0.3, 'sine'), e('error_node', 0.5), e('fragment_shard', 0.7, 'sine'), e('warp_bug', 0.5, 'phase_drift')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 67: Fragmented =====
    {
        name: 'Fragmented',
        description: 'Mirror ghosts reflect your every move.',
        speedMult: 1.18,
        boss: null,
        waves: [
            makeWave([e('mirror_ghost', 0.5, 'orbit_player'), e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink')], 1),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('mirror_ghost', 0.7, 'orbit_player'), e('fragment_shard', 0.5, 'spiral')], 1.5),
            makeWave([e('data_cube', 0.2), e('mirror_ghost', 0.5, 'orbit_player'), e('data_cube', 0.8), e('warp_bug', 0.5, 'phase_drift')], 1, 'stagger'),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('fragment_shard', 0.5, 'dive'), e('mirror_ghost', 0.7, 'orbit_player')], 1),
        ]
    },
    // ===== LEVEL 68: Syntax Error =====
    {
        name: 'Syntax Error',
        description: 'In valid patterns arise. Brace for chaos.',
        speedMult: 1.2,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.3), e('warp_bug', 0.5, 'phase_drift'), e('error_node', 0.7)], 1),
            makeWave([e('fragment_shard', 0.2, 'zigzag'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.8, 'zigzag')], 1.5, 'pincer'),
            makeWave([e('data_cube', 0.3), e('error_node', 0.5), e('data_cube', 0.7), e('glitch_drone', 0.5, 'glitch_blink')], 1),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player'), e('warp_bug', 0.7, 'phase_drift')], 1, 'vee'),
        ]
    },
    // ===== LEVEL 69: Infinite Loop =====
    {
        name: 'Infinite Loop',
        description: 'Waves that never end. Break the cycle.',
        speedMult: 1.22,
        boss: null,
        waves: [
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.4, 'glitch_blink'), e('glitch_drone', 0.6, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink')], 1, 'ring'),
            makeWave([e('data_cube', 0.3, 'spiral'), e('fragment_shard', 0.5), e('data_cube', 0.7, 'spiral'), e('error_node', 0.5)], 1.5),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift'), e('mirror_ghost', 0.7, 'orbit_player')], 1, 'cross'),
            makeWave([e('error_node', 0.3), e('fragment_shard', 0.5, 'sine'), e('error_node', 0.7), e('mirror_ghost', 0.5, 'orbit_player')], 1),
        ]
    },
    // ===== LEVEL 70: Boss - Fragment King =====
    {
        name: 'Fragment King',
        description: 'The king of broken data. Assemble your resolve.',
        speedMult: 1.15,
        boss: 14,
        miniboss: 10,
        waves: [
            makeWave([e('fragment_shard', 0.3, 'spiral'), e('fragment_shard', 0.5), e('fragment_shard', 0.7, 'spiral')], 1),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.7, 'orbit_player')], 1.5),
            makeWave([e('data_cube', 0.3), e('warp_bug', 0.5, 'phase_drift'), e('data_cube', 0.7), e('fragment_shard', 0.5, 'dive')], 1, 'diamond'),
        ]
    },

    // ── Sector 3: Buffer Zone (71-75) ──
    // ===== LEVEL 71: Buffer Overflow =====
    {
        name: 'Buffer Overflow',
        description: 'Too much data. Systems strain under the load.',
        speedMult: 1.25,
        boss: null,
        waves: [
            makeWave([e('data_cube', 0.2), e('data_cube', 0.4), e('data_cube', 0.6), e('data_cube', 0.8)], 1, 'line'),
            makeWave([e('error_node', 0.3), e('error_node', 0.7), e('glitch_drone', 0.5, 'glitch_blink'), e('glitch_drone', 0.5, 'glitch_blink')], 1.5),
            makeWave([e('fragment_shard', 0.2, 'strafe'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.8, 'strafe'), e('warp_bug', 0.5, 'phase_drift')], 1, 'stagger'),
            makeWave([e('data_cube', 0.3, 'zigzag'), e('error_node', 0.5), e('data_cube', 0.7, 'zigzag'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
        ]
    },
    // ===== LEVEL 72: Race Condition =====
    {
        name: 'Race Condition',
        description: 'Enemies arrive out of order. Synchronise or die.',
        speedMult: 1.28,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.2, 'phase_drift'), e('warp_bug', 0.8, 'phase_drift'), e('glitch_drone', 0.5, 'glitch_blink')], 0.5),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.7, 'orbit_player')], 1, 'arrow'),
            makeWave([e('fragment_shard', 0.2, 'zigzag'), e('data_cube', 0.5, 'spiral'), e('fragment_shard', 0.8, 'zigzag'), e('warp_bug', 0.5, 'phase_drift')], 1.5),
            makeWave([e('error_node', 0.3), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.7), e('data_cube', 0.5, 'pendulum')], 1, 'cross'),
        ]
    },
    // ===== LEVEL 73: Deadlock =====
    {
        name: 'Deadlock',
        description: 'Processes freeze. Only force breaks the stalemate.',
        speedMult: 1.3,
        boss: null,
        waves: [
            makeWave([e('data_cube', 0.3), e('data_cube', 0.5), e('data_cube', 0.7), e('error_node', 0.5)], 1, 'diamond'),
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift'), e('mirror_ghost', 0.8, 'orbit_player')], 1.5),
            makeWave([e('fragment_shard', 0.3, 'strafe'), e('error_node', 0.5), e('fragment_shard', 0.7, 'strafe'), e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink')], 1, 'pincer'),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('data_cube', 0.5), e('warp_bug', 0.7, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
        ]
    },
    // ===== LEVEL 74: Segfault =====
    {
        name: 'Segfault',
        description: 'Memory violations cascade through every sector.',
        speedMult: 1.32,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.2), e('error_node', 0.5), e('error_node', 0.8)], 1, 'line'),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('fragment_shard', 0.5, 'dive'), e('mirror_ghost', 0.7, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift')], 1.5),
            makeWave([e('data_cube', 0.2, 'spiral'), e('glitch_drone', 0.4, 'glitch_blink'), e('glitch_drone', 0.6, 'glitch_blink'), e('data_cube', 0.8, 'spiral')], 1, 'ring'),
            makeWave([e('fragment_shard', 0.3, 'pendulum'), e('error_node', 0.5), e('fragment_shard', 0.7, 'pendulum'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
            makeWave([e('warp_bug', 0.2, 'phase_drift'), e('warp_bug', 0.5, 'phase_drift'), e('warp_bug', 0.8, 'phase_drift')], 0.5, 'stagger'),
        ]
    },
    // ===== LEVEL 75: Boss - Mirror Engine =====
    {
        name: 'Mirror Engine',
        description: 'It copies everything. Think before you shoot.',
        speedMult: 1.25,
        boss: 15,
        miniboss: 11,
        waves: [
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('mirror_ghost', 0.5, 'orbit_player'), e('mirror_ghost', 0.7, 'orbit_player')], 1),
            makeWave([e('data_cube', 0.3), e('error_node', 0.5), e('data_cube', 0.7), e('warp_bug', 0.5, 'phase_drift')], 1.5),
            makeWave([e('fragment_shard', 0.2, 'dive'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.8, 'dive')], 1, 'arrow'),
        ]
    },

    // ── Sector 4: Kernel Panic (76-80) ──
    // ===== LEVEL 76: Blue Screen =====
    {
        name: 'Blue Screen',
        description: 'Critical failure. The system fights back.',
        speedMult: 1.35,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.3), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.7), e('data_cube', 0.5)], 1, 'diamond'),
            makeWave([e('fragment_shard', 0.2, 'spiral'), e('warp_bug', 0.4, 'phase_drift'), e('warp_bug', 0.6, 'phase_drift'), e('fragment_shard', 0.8, 'spiral')], 1.5),
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.4, 'glitch_blink'), e('mirror_ghost', 0.5, 'orbit_player'), e('glitch_drone', 0.6, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink')], 1, 'ring'),
            makeWave([e('data_cube', 0.3, 'pendulum'), e('error_node', 0.5), e('data_cube', 0.7, 'pendulum'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
        ]
    },
    // ===== LEVEL 77: Kernel Panic =====
    {
        name: 'Kernel Panic',
        description: 'Core processes crash. Total system meltdown.',
        speedMult: 1.38,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.2), e('error_node', 0.5), e('error_node', 0.8), e('fragment_shard', 0.5, 'dive')], 1),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift'), e('mirror_ghost', 0.7, 'orbit_player'), e('data_cube', 0.5, 'zigzag')], 1.5, 'cross'),
            makeWave([e('glitch_drone', 0.1, 'glitch_blink'), e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.5, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink'), e('glitch_drone', 0.9, 'glitch_blink')], 1, 'ring'),
            makeWave([e('data_cube', 0.3), e('error_node', 0.5), e('data_cube', 0.7), e('fragment_shard', 0.3, 'sine'), e('fragment_shard', 0.7, 'sine')], 1, 'stagger'),
        ]
    },
    // ===== LEVEL 78: Bit Rot =====
    {
        name: 'Bit Rot',
        description: 'Data decays. Even your weapons feel unstable.',
        speedMult: 1.4,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.2, 'phase_drift'), e('data_cube', 0.5, 'spiral'), e('warp_bug', 0.8, 'phase_drift')], 1, 'pincer'),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.7, 'orbit_player'), e('fragment_shard', 0.5, 'circle')], 1.5),
            makeWave([e('error_node', 0.2), e('warp_bug', 0.4, 'phase_drift'), e('data_cube', 0.6, 'zigzag'), e('error_node', 0.8)], 1, 'arrow'),
            makeWave([e('fragment_shard', 0.3, 'dive'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.7, 'dive'), e('glitch_drone', 0.5, 'glitch_blink')], 1),
            makeWave([e('data_cube', 0.3, 'pendulum'), e('data_cube', 0.5), e('data_cube', 0.7, 'pendulum')], 0.5, 'line'),
        ]
    },
    // ===== LEVEL 79: Overflow =====
    {
        name: 'Overflow',
        description: 'Values break limits. Everything escalates.',
        speedMult: 1.42,
        boss: null,
        miniboss: 9,
        waves: [
            makeWave([e('error_node', 0.3), e('error_node', 0.5), e('error_node', 0.7), e('mirror_ghost', 0.5, 'orbit_player')], 1),
            makeWave([e('data_cube', 0.2, 'spiral'), e('fragment_shard', 0.4, 'strafe'), e('fragment_shard', 0.6, 'strafe'), e('data_cube', 0.8, 'spiral')], 1.5, 'diamond'),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player'), e('warp_bug', 0.7, 'phase_drift'), e('error_node', 0.5)], 1),
            makeWave([e('glitch_drone', 0.2, 'glitch_blink'), e('glitch_drone', 0.4, 'glitch_blink'), e('mirror_ghost', 0.5, 'orbit_player'), e('glitch_drone', 0.6, 'glitch_blink'), e('glitch_drone', 0.8, 'glitch_blink')], 1, 'arrow'),
        ]
    },
    // ===== LEVEL 80: Boss - Chaos Generator =====
    {
        name: 'Chaos Generator',
        description: 'Randomness incarnate. Nothing is predictable.',
        speedMult: 1.35,
        boss: 16,
        miniboss: 12,
        waves: [
            makeWave([e('error_node', 0.3, 'spiral'), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.7, 'spiral')], 1),
            makeWave([e('fragment_shard', 0.2, 'circle'), e('warp_bug', 0.5, 'phase_drift'), e('fragment_shard', 0.8, 'circle')], 1.5),
            makeWave([e('data_cube', 0.3), e('mirror_ghost', 0.5, 'orbit_player'), e('data_cube', 0.7), e('error_node', 0.5)], 1, 'cross'),
        ]
    },

    // ── Sector 5: Ghost Protocol (81-85) ──
    // ===== LEVEL 81: Data Corruption =====
    {
        name: 'Data Corruption',
        description: 'Files rewrite themselves. Trust nothing.',
        speedMult: 1.45,
        boss: null,
        waves: [
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.8, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift')], 1),
            makeWave([e('data_cube', 0.3, 'spiral'), e('fragment_shard', 0.5, 'dive'), e('data_cube', 0.7, 'spiral'), e('error_node', 0.5)], 1.5, 'diamond'),
            makeWave([e('glitch_drone', 0.1, 'glitch_blink'), e('glitch_drone', 0.3, 'glitch_blink'), e('mirror_ghost', 0.5, 'orbit_player'), e('glitch_drone', 0.7, 'glitch_blink'), e('glitch_drone', 0.9, 'glitch_blink')], 1, 'ring'),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('error_node', 0.5), e('warp_bug', 0.7, 'phase_drift'), e('fragment_shard', 0.5, 'zigzag')], 1),
        ]
    },
    // ===== LEVEL 82: Ghost Process =====
    {
        name: 'Ghost Process',
        description: 'Phantom threads haunt every sector.',
        speedMult: 1.48,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('warp_bug', 0.5, 'phase_drift'), e('warp_bug', 0.7, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player')], 1, 'vee'),
            makeWave([e('error_node', 0.2), e('data_cube', 0.5, 'pendulum'), e('error_node', 0.8), e('fragment_shard', 0.5, 'spiral')], 1.5),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('mirror_ghost', 0.5, 'orbit_player'), e('mirror_ghost', 0.7, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift')], 1, 'stagger'),
            makeWave([e('data_cube', 0.2, 'zigzag'), e('error_node', 0.4), e('fragment_shard', 0.6, 'dive'), e('data_cube', 0.8, 'zigzag')], 1),
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('mirror_ghost', 0.5, 'orbit_player'), e('glitch_drone', 0.7, 'glitch_blink')], 0.5, 'arrow'),
        ]
    },
    // ===== LEVEL 83: Malware =====
    {
        name: 'Malware',
        description: 'Hostile code spreads. Error nodes multiply.',
        speedMult: 1.5,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.2), e('error_node', 0.4), e('error_node', 0.6), e('error_node', 0.8)], 1, 'line'),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('warp_bug', 0.5, 'phase_drift'), e('mirror_ghost', 0.7, 'orbit_player'), e('fragment_shard', 0.5, 'dive')], 1.5),
            makeWave([e('data_cube', 0.3, 'pendulum'), e('error_node', 0.5), e('data_cube', 0.7, 'pendulum'), e('warp_bug', 0.5, 'phase_drift')], 1, 'cross'),
            makeWave([e('fragment_shard', 0.2, 'spiral'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.8, 'spiral'), e('error_node', 0.5)], 1),
        ]
    },
    // ===== LEVEL 84: Wormhole =====
    {
        name: 'Wormhole',
        description: 'Space folds. Enemies arrive from everywhere.',
        speedMult: 1.52,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.1, 'phase_drift'), e('warp_bug', 0.3, 'phase_drift'), e('warp_bug', 0.5, 'phase_drift'), e('warp_bug', 0.7, 'phase_drift'), e('warp_bug', 0.9, 'phase_drift')], 1, 'ring'),
            makeWave([e('error_node', 0.3), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.7), e('data_cube', 0.5, 'pendulum')], 1.5),
            makeWave([e('fragment_shard', 0.2, 'strafe'), e('data_cube', 0.4, 'zigzag'), e('mirror_ghost', 0.6, 'orbit_player'), e('fragment_shard', 0.8, 'strafe')], 1, 'stagger'),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('error_node', 0.5), e('warp_bug', 0.7, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
            makeWave([e('data_cube', 0.3), e('data_cube', 0.5), e('data_cube', 0.7), e('glitch_drone', 0.5, 'circle')], 0.5, 'diamond'),
        ]
    },
    // ===== LEVEL 85: Boss - Data Devourer =====
    {
        name: 'Data Devourer',
        description: 'It consumes code. Your weapons barely register.',
        speedMult: 1.45,
        boss: 17,
        miniboss: 9,
        waves: [
            makeWave([e('error_node', 0.3, 'circle'), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.7, 'circle')], 1),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('data_cube', 0.5, 'pendulum'), e('warp_bug', 0.7, 'phase_drift'), e('fragment_shard', 0.5)], 1.5),
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.8, 'orbit_player')], 1, 'pincer'),
        ]
    },

    // ── Sector 6: The Kernel (86-90) ──
    // ===== LEVEL 86: Cascade Failure =====
    {
        name: 'Cascade Failure',
        description: 'One crash triggers another. Systems fall like dominoes.',
        speedMult: 1.55,
        boss: null,
        waves: [
            makeWave([e('error_node', 0.2), e('error_node', 0.4), e('error_node', 0.6), e('error_node', 0.8), e('mirror_ghost', 0.5, 'orbit_player')], 1, 'cross'),
            makeWave([e('fragment_shard', 0.3, 'spiral'), e('warp_bug', 0.5, 'phase_drift'), e('fragment_shard', 0.7, 'spiral'), e('data_cube', 0.5)], 1.5),
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('mirror_ghost', 0.4, 'orbit_player'), e('mirror_ghost', 0.6, 'orbit_player'), e('mirror_ghost', 0.8, 'orbit_player')], 1, 'ring'),
            makeWave([e('data_cube', 0.3, 'pendulum'), e('error_node', 0.5), e('data_cube', 0.7, 'pendulum'), e('warp_bug', 0.5, 'phase_drift')], 1),
            makeWave([e('fragment_shard', 0.3, 'dive'), e('mirror_ghost', 0.5, 'orbit_player'), e('fragment_shard', 0.7, 'dive')], 0.5, 'arrow'),
        ]
    },
    // ===== LEVEL 87: Zero Day =====
    {
        name: 'Zero Day',
        description: 'An unknown exploit. No patch exists.',
        speedMult: 1.58,
        boss: null,
        waves: [
            makeWave([e('warp_bug', 0.2, 'phase_drift'), e('mirror_ghost', 0.4, 'orbit_player'), e('error_node', 0.6), e('warp_bug', 0.8, 'phase_drift')], 1),
            makeWave([e('data_cube', 0.3, 'zigzag'), e('fragment_shard', 0.5, 'pendulum'), e('data_cube', 0.7, 'zigzag'), e('mirror_ghost', 0.5, 'orbit_player')], 1.5, 'diamond'),
            makeWave([e('error_node', 0.2), e('error_node', 0.5), e('error_node', 0.8), e('warp_bug', 0.5, 'phase_drift')], 1, 'stagger'),
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('fragment_shard', 0.5, 'spiral'), e('mirror_ghost', 0.7, 'orbit_player'), e('data_cube', 0.5, 'pendulum')], 1),
            makeWave([e('glitch_drone', 0.3, 'glitch_blink'), e('glitch_drone', 0.5, 'glitch_blink'), e('glitch_drone', 0.7, 'glitch_blink'), e('error_node', 0.5)], 0.5, 'ring'),
        ]
    },
    // ===== LEVEL 88: Entropy Max =====
    {
        name: 'Entropy Max',
        description: 'Maximum disorder. Only order survives.',
        speedMult: 1.6,
        boss: null,
        waves: [
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('error_node', 0.4), e('warp_bug', 0.6, 'phase_drift'), e('mirror_ghost', 0.8, 'orbit_player')], 1, 'pincer'),
            makeWave([e('data_cube', 0.3, 'pendulum'), e('fragment_shard', 0.5, 'circle'), e('data_cube', 0.7, 'pendulum'), e('error_node', 0.5)], 1.5),
            makeWave([e('warp_bug', 0.2, 'phase_drift'), e('mirror_ghost', 0.4, 'orbit_player'), e('error_node', 0.6), e('warp_bug', 0.8, 'phase_drift'), e('fragment_shard', 0.5, 'spiral')], 1, 'cross'),
            makeWave([e('data_cube', 0.2, 'zigzag'), e('data_cube', 0.4, 'zigzag'), e('mirror_ghost', 0.6, 'orbit_player'), e('data_cube', 0.8, 'zigzag')], 1),
            makeWave([e('error_node', 0.3), e('error_node', 0.5), e('error_node', 0.7), e('mirror_ghost', 0.5, 'orbit_player')], 0.5, 'arrow'),
        ]
    },
    // ===== LEVEL 89: Last Signal =====
    {
        name: 'Last Signal',
        description: 'One final transmission. The Kernel awakens.',
        speedMult: 1.62,
        boss: null,
        miniboss: 12,
        waves: [
            makeWave([e('mirror_ghost', 0.2, 'orbit_player'), e('mirror_ghost', 0.4, 'orbit_player'), e('mirror_ghost', 0.6, 'orbit_player'), e('mirror_ghost', 0.8, 'orbit_player')], 1, 'line'),
            makeWave([e('error_node', 0.3, 'spiral'), e('warp_bug', 0.5, 'phase_drift'), e('error_node', 0.7, 'spiral'), e('data_cube', 0.5)], 1.5),
            makeWave([e('fragment_shard', 0.2, 'dive'), e('data_cube', 0.4, 'pendulum'), e('mirror_ghost', 0.6, 'orbit_player'), e('fragment_shard', 0.8, 'dive')], 1, 'stagger'),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('error_node', 0.5), e('warp_bug', 0.7, 'phase_drift'), e('mirror_ghost', 0.5, 'orbit_player')], 1),
            makeWave([e('error_node', 0.2), e('error_node', 0.4), e('mirror_ghost', 0.5, 'orbit_player'), e('error_node', 0.6), e('error_node', 0.8)], 0.5, 'ring'),
        ]
    },
    // ===== LEVEL 90: Boss - The Kernel =====
    {
        name: 'The Kernel',
        description: 'THE CORE OF THE SIMULATION. End it.',
        speedMult: 1.55,
        boss: 18,
        miniboss: 10,
        waves: [
            makeWave([e('mirror_ghost', 0.3, 'orbit_player'), e('error_node', 0.5), e('mirror_ghost', 0.7, 'orbit_player')], 1),
            makeWave([e('warp_bug', 0.3, 'phase_drift'), e('data_cube', 0.5, 'pendulum'), e('warp_bug', 0.7, 'phase_drift'), e('fragment_shard', 0.5)], 1.5),
            makeWave([e('error_node', 0.2), e('mirror_ghost', 0.4, 'orbit_player'), e('error_node', 0.6), e('mirror_ghost', 0.8, 'orbit_player')], 1, 'diamond'),
        ]
    },

    // ═══════════════════════════════════════════════════════
    //  WORLD 4 — QUANTUM REALM  (Levels 91-120)
    //  Theme: High-energy physics, Standard Model
    //  Enemies: quark_triplet, neutrino_ghost, boson_carrier,
    //           higgs_field, positron_mirror, gluon_chain
    //  Movements: quantum_tunnel, wave_function, orbital, superposition
    // ═══════════════════════════════════════════════════════
    // ── Sector 1: Quark Lattice (91-95) ──
    // Level 91
    {
        name: 'Quark Entry',
        description: 'You breach the quantum boundary. Triplet quarks materialise.',
        speedMult: 1,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('quark_triplet', 0.5, 'quantum_tunnel'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1),
            makeWave([e('quark_triplet', 0.2), e('quark_triplet', 0.4), e('quark_triplet', 0.6), e('quark_triplet', 0.8)], 1.5),
            makeWave([e('quark_triplet', 0.3, 'wave_function'), e('neutrino_ghost', 0.5, 'wave_function'), e('quark_triplet', 0.7, 'wave_function')], 1.5),
        ]
    },
    // Level 92
    {
        name: 'Quark Lattice',
        description: 'Color-charged triplets swarm the field. Kill all three together!',
        speedMult: 1.05,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('quark_triplet', 0.5), e('quark_triplet', 0.8, 'quantum_tunnel')], 1),
            makeWave([e('neutrino_ghost', 0.3, 'wave_function'), e('quark_triplet', 0.5), e('neutrino_ghost', 0.7, 'wave_function')], 1.5),
            makeWave([e('quark_triplet', 0.2), e('neutrino_ghost', 0.4, 'wave_function'), e('quark_triplet', 0.6), e('neutrino_ghost', 0.8, 'wave_function')], 1.5, 'vee'),
        ]
    },
    // Level 93
    {
        name: 'Color Charge',
        description: 'Red, green, blue — the chromodynamic dance intensifies.',
        speedMult: 1.1,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('boson_carrier', 0.5, 'orbital'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1),
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('boson_carrier', 0.5), e('neutrino_ghost', 0.8, 'wave_function')], 1.5, 'pincer'),
            makeWave([e('quark_triplet', 0.3), e('quark_triplet', 0.5), e('quark_triplet', 0.7), e('boson_carrier', 0.5, 'orbital')], 1.5),
        ]
    },
    // Level 94
    {
        name: 'Gluon Bond',
        description: 'Gluon carriers reinforce quark defences. Break the chains!',
        speedMult: 1.15,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('gluon_chain', 0.2), e('gluon_chain', 0.4), e('gluon_chain', 0.6), e('gluon_chain', 0.8)], 1, 'line'),
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('boson_carrier', 0.5, 'orbital'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1.5),
            makeWave([e('gluon_chain', 0.2), e('quark_triplet', 0.4), e('gluon_chain', 0.6), e('quark_triplet', 0.8)], 1.5, 'stagger'),
        ]
    },
    // ===== LEVEL 95: Boss - Proton Crusher =====
    {
        name: 'Proton Crusher',
        description: 'WARNING: Proton-class entity detected. Destroy all quarks!',
        speedMult: 1.2,
        boss: 19,
        miniboss: 13,
        waves: [
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1),
            makeWave([e('gluon_chain', 0.3), e('boson_carrier', 0.5, 'orbital'), e('gluon_chain', 0.7)], 1.5),
        ]
    },

    // ── Sector 2: Lepton Fields (96-100) ──
    // Level 96
    {
        name: 'Lepton Field',
        description: 'Electron orbital paths detected. Beware phase-shifting neutrinos!',
        speedMult: 1.1,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('neutrino_ghost', 0.3, 'wave_function'), e('neutrino_ghost', 0.5, 'wave_function'), e('neutrino_ghost', 0.7, 'wave_function')], 1),
            makeWave([e('quark_triplet', 0.2), e('neutrino_ghost', 0.4, 'orbital'), e('neutrino_ghost', 0.6, 'orbital'), e('quark_triplet', 0.8)], 1.5, 'ring'),
            makeWave([e('neutrino_ghost', 0.3, 'superposition'), e('boson_carrier', 0.5), e('neutrino_ghost', 0.7, 'superposition')], 1.5),
        ]
    },
    // Level 97
    {
        name: 'Electron Orbit',
        description: 'Orbital patterns confuse targeting. Watch the oscillation!',
        speedMult: 1.15,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('neutrino_ghost', 0.2, 'orbital'), e('boson_carrier', 0.4, 'orbital'), e('neutrino_ghost', 0.6, 'orbital'), e('boson_carrier', 0.8, 'orbital')], 1, 'diamond'),
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('higgs_field', 0.5), e('quark_triplet', 0.7, 'quantum_tunnel')], 1.5),
            makeWave([e('neutrino_ghost', 0.2, 'superposition'), e('neutrino_ghost', 0.5, 'superposition'), e('neutrino_ghost', 0.8, 'superposition')], 1.5),
        ]
    },
    // Level 98
    {
        name: 'Neutrino Wave',
        description: 'Neutrinos oscillate between flavors. Only one is vulnerable!',
        speedMult: 1.2,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('neutrino_ghost', 0.4, 'wave_function'), e('neutrino_ghost', 0.6, 'wave_function'), e('neutrino_ghost', 0.8, 'wave_function')], 1),
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('higgs_field', 0.5), e('boson_carrier', 0.7, 'orbital')], 1.5, 'cross'),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('neutrino_ghost', 0.4, 'superposition'), e('neutrino_ghost', 0.6, 'superposition'), e('quark_triplet', 0.8, 'quantum_tunnel')], 1.5),
        ]
    },
    // Level 99
    {
        name: 'Muon Decay',
        description: 'Heavy leptons decay into lighter forms. The field destabilises.',
        speedMult: 1.25,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('positron_mirror', 0.3, 'quantum_tunnel'), e('neutrino_ghost', 0.5, 'wave_function'), e('positron_mirror', 0.7, 'quantum_tunnel')], 1),
            makeWave([e('higgs_field', 0.3), e('boson_carrier', 0.5, 'orbital'), e('higgs_field', 0.7)], 1.5, 'pincer'),
            makeWave([e('positron_mirror', 0.2), e('neutrino_ghost', 0.4, 'superposition'), e('positron_mirror', 0.6), e('neutrino_ghost', 0.8, 'superposition')], 1.5),
        ]
    },
    // ===== LEVEL 100: Boss - Electroweak Unifier =====
    {
        name: 'Electroweak Unifier',
        description: 'WARNING: Electroweak unification event! Two phases, one enemy!',
        speedMult: 1.3,
        boss: 20,
        miniboss: 14,
        waves: [
            makeWave([e('neutrino_ghost', 0.3, 'wave_function'), e('neutrino_ghost', 0.7, 'wave_function')], 1),
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('positron_mirror', 0.5), e('boson_carrier', 0.7, 'orbital')], 1.5),
        ]
    },

    // ── Sector 3: Boson Conduit (101-105) ──
    // Level 101
    {
        name: 'Boson Stream',
        description: 'Force carriers flow through the conduit. They link enemies together!',
        speedMult: 1.15,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('boson_carrier', 0.5, 'orbital'), e('boson_carrier', 0.7, 'orbital')], 1),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('boson_carrier', 0.4, 'orbital'), e('quark_triplet', 0.6, 'quantum_tunnel'), e('boson_carrier', 0.8, 'orbital')], 1.5, 'arrow'),
            makeWave([e('gluon_chain', 0.2), e('boson_carrier', 0.4, 'orbital'), e('gluon_chain', 0.6), e('boson_carrier', 0.8, 'orbital')], 1.5, 'line'),
        ]
    },
    // Level 102
    {
        name: 'W-Boson Path',
        description: 'Weak force carriers grant immunity shields to nearby enemies.',
        speedMult: 1.2,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('higgs_field', 0.5), e('boson_carrier', 0.7, 'orbital')], 1),
            makeWave([e('neutrino_ghost', 0.2, 'superposition'), e('boson_carrier', 0.4, 'orbital'), e('neutrino_ghost', 0.6, 'superposition'), e('boson_carrier', 0.8, 'orbital')], 1.5, 'diamond'),
            makeWave([e('gluon_chain', 0.2), e('gluon_chain', 0.4), e('higgs_field', 0.5), e('gluon_chain', 0.6), e('gluon_chain', 0.8)], 1.5, 'line'),
        ]
    },
    // Level 103
    {
        name: 'Z-Boson Resonance',
        description: 'Resonance patterns amplify enemy fire rates. Stay sharp!',
        speedMult: 1.25,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('boson_carrier', 0.2, 'orbital'), e('positron_mirror', 0.4, 'quantum_tunnel'), e('boson_carrier', 0.6, 'orbital'), e('positron_mirror', 0.8, 'quantum_tunnel')], 1, 'cross'),
            makeWave([e('higgs_field', 0.3), e('neutrino_ghost', 0.5, 'wave_function'), e('higgs_field', 0.7)], 1.5),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('boson_carrier', 0.4, 'orbital'), e('quark_triplet', 0.6, 'quantum_tunnel'), e('boson_carrier', 0.8, 'orbital')], 1.5, 'stagger'),
        ]
    },
    // Level 104
    {
        name: 'Photon Flood',
        description: 'Massless photons flood the field. Speed is their weapon!',
        speedMult: 1.3,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('neutrino_ghost', 0.4, 'wave_function'), e('neutrino_ghost', 0.6, 'wave_function'), e('neutrino_ghost', 0.8, 'wave_function')], 1, 'vee'),
            makeWave([e('positron_mirror', 0.3, 'superposition'), e('boson_carrier', 0.5, 'orbital'), e('positron_mirror', 0.7, 'superposition')], 1.5),
            makeWave([e('gluon_chain', 0.2), e('higgs_field', 0.4), e('gluon_chain', 0.6), e('higgs_field', 0.8)], 1.5, 'pincer'),
        ]
    },
    // ===== LEVEL 105: Boss - Gluon Overlord =====
    {
        name: 'Gluon Overlord',
        description: 'WARNING: 8 color-charge turrets orbit the overlord. Break the pairs!',
        speedMult: 1.35,
        boss: 21,
        miniboss: 15,
        waves: [
            makeWave([e('gluon_chain', 0.3), e('boson_carrier', 0.5, 'orbital'), e('gluon_chain', 0.7)], 1, 'line'),
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1.5),
        ]
    },

    // ── Sector 4: Higgs Vacuum (106-110) ──
    // Level 106
    {
        name: 'Higgs Vacuum',
        description: 'Mass fields slow your bullets. Find the gaps in the golden aura!',
        speedMult: 1.2,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('higgs_field', 0.3), e('higgs_field', 0.5), e('higgs_field', 0.7)], 1),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('higgs_field', 0.5), e('quark_triplet', 0.8, 'quantum_tunnel')], 1.5, 'ring'),
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('higgs_field', 0.5), e('boson_carrier', 0.7, 'orbital')], 1.5),
        ]
    },
    // Level 107
    {
        name: 'Symmetry Break',
        description: 'Electroweak symmetry shatters. New patterns emerge!',
        speedMult: 1.25,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('higgs_field', 0.3), e('positron_mirror', 0.5, 'superposition'), e('higgs_field', 0.7)], 1, 'pincer'),
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('gluon_chain', 0.4), e('gluon_chain', 0.6), e('neutrino_ghost', 0.8, 'wave_function')], 1.5),
            makeWave([e('higgs_field', 0.3), e('boson_carrier', 0.5, 'orbital'), e('higgs_field', 0.7)], 1.5, 'diamond'),
        ]
    },
    // Level 108
    {
        name: 'Mass Genesis',
        description: 'The Higgs mechanism grants mass. Enemies become heavier, slower, tougher.',
        speedMult: 1.3,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('higgs_field', 0.2), e('higgs_field', 0.4), e('higgs_field', 0.6), e('higgs_field', 0.8)], 1, 'line'),
            makeWave([e('quark_triplet', 0.3, 'quantum_tunnel'), e('boson_carrier', 0.5, 'orbital'), e('quark_triplet', 0.7, 'quantum_tunnel')], 1.5, 'arrow'),
            makeWave([e('positron_mirror', 0.2, 'superposition'), e('higgs_field', 0.4), e('positron_mirror', 0.6, 'superposition'), e('higgs_field', 0.8)], 1.5),
        ]
    },
    // Level 109
    {
        name: 'Vacuum Decay',
        description: 'False vacuum destabilises. The fabric of space trembles!',
        speedMult: 1.35,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('higgs_field', 0.3), e('gluon_chain', 0.5), e('higgs_field', 0.7)], 1),
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('positron_mirror', 0.4, 'quantum_tunnel'), e('neutrino_ghost', 0.6, 'wave_function'), e('positron_mirror', 0.8, 'quantum_tunnel')], 1.5, 'cross'),
            makeWave([e('boson_carrier', 0.2, 'orbital'), e('higgs_field', 0.4), e('higgs_field', 0.6), e('boson_carrier', 0.8, 'orbital')], 1.5, 'stagger'),
        ]
    },
    // ===== LEVEL 110: Boss - Higgs Manifestation =====
    {
        name: 'Higgs Manifestation',
        description: 'WARNING: Mass wells pull you in! Weakpoints only exposed during field phase!',
        speedMult: 1.4,
        boss: 22,
        miniboss: 16,
        waves: [
            makeWave([e('higgs_field', 0.3), e('higgs_field', 0.7)], 1),
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('gluon_chain', 0.5), e('boson_carrier', 0.7, 'orbital')], 1.5),
        ]
    },

    // ── Sector 5: Antimatter Rift (111-115) ──
    // Level 111
    {
        name: 'Antimatter Rift',
        description: 'Matter and antimatter collide. Kill paired enemies together!',
        speedMult: 1.25,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('positron_mirror', 0.3, 'quantum_tunnel'), e('positron_mirror', 0.5, 'quantum_tunnel'), e('positron_mirror', 0.7, 'quantum_tunnel')], 1),
            makeWave([e('positron_mirror', 0.2, 'superposition'), e('quark_triplet', 0.4), e('positron_mirror', 0.6, 'superposition'), e('quark_triplet', 0.8)], 1.5, 'ring'),
            makeWave([e('neutrino_ghost', 0.3, 'wave_function'), e('positron_mirror', 0.5, 'quantum_tunnel'), e('neutrino_ghost', 0.7, 'wave_function')], 1.5),
        ]
    },
    // Level 112
    {
        name: 'Pair Creation',
        description: 'Particle-antiparticle pairs spontaneously appear from the vacuum.',
        speedMult: 1.3,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('positron_mirror', 0.2, 'quantum_tunnel'), e('positron_mirror', 0.4), e('positron_mirror', 0.6), e('positron_mirror', 0.8, 'quantum_tunnel')], 1, 'vee'),
            makeWave([e('boson_carrier', 0.3, 'orbital'), e('higgs_field', 0.5), e('boson_carrier', 0.7, 'orbital')], 1.5),
            makeWave([e('gluon_chain', 0.2), e('positron_mirror', 0.4, 'superposition'), e('positron_mirror', 0.6, 'superposition'), e('gluon_chain', 0.8)], 1.5, 'line'),
        ]
    },
    // Level 113
    {
        name: 'Annihilation Zone',
        description: 'The annihilation energy is extreme. Every kill triggers paired explosions!',
        speedMult: 1.35,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('positron_mirror', 0.2, 'superposition'), e('neutrino_ghost', 0.4, 'wave_function'), e('positron_mirror', 0.6, 'superposition'), e('neutrino_ghost', 0.8, 'wave_function')], 1, 'diamond'),
            makeWave([e('higgs_field', 0.3), e('positron_mirror', 0.5, 'quantum_tunnel'), e('higgs_field', 0.7)], 1.5),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('boson_carrier', 0.4, 'orbital'), e('positron_mirror', 0.6, 'superposition'), e('gluon_chain', 0.8)], 1.5, 'cross'),
        ]
    },
    // Level 114
    {
        name: 'CP Violation',
        description: 'Matter-antimatter asymmetry detected. Expect unpredictable spawns!',
        speedMult: 1.4,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('positron_mirror', 0.3, 'superposition'), e('positron_mirror', 0.5, 'quantum_tunnel'), e('positron_mirror', 0.7, 'superposition')], 1),
            makeWave([e('higgs_field', 0.2), e('gluon_chain', 0.4), e('gluon_chain', 0.6), e('higgs_field', 0.8)], 1.5, 'pincer'),
            makeWave([e('boson_carrier', 0.2, 'orbital'), e('neutrino_ghost', 0.4, 'wave_function'), e('boson_carrier', 0.6, 'orbital'), e('neutrino_ghost', 0.8, 'wave_function')], 1.5, 'stagger'),
        ]
    },
    // ===== LEVEL 115: Boss - Antimatter Sovereign =====
    {
        name: 'Antimatter Sovereign',
        description: 'WARNING: Mirror halves — balance your damage or it heals!',
        speedMult: 1.45,
        boss: 23,
        miniboss: 13,
        waves: [
            makeWave([e('positron_mirror', 0.3, 'superposition'), e('positron_mirror', 0.7, 'superposition')], 1),
            makeWave([e('higgs_field', 0.3), e('boson_carrier', 0.5, 'orbital'), e('higgs_field', 0.7)], 1.5),
        ]
    },

    // ── Sector 6: Unified Field (116-120) ──
    // Level 116
    {
        name: 'Unified Field',
        description: 'All forces converge. Every enemy type appears!',
        speedMult: 1.3,
        boss: null,
        miniboss: 14,
        waves: [
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('neutrino_ghost', 0.4, 'wave_function'), e('boson_carrier', 0.6, 'orbital'), e('higgs_field', 0.8)], 1, 'arrow'),
            makeWave([e('positron_mirror', 0.3, 'superposition'), e('gluon_chain', 0.5), e('positron_mirror', 0.7, 'superposition')], 1.5),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('boson_carrier', 0.4, 'orbital'), e('higgs_field', 0.6), e('gluon_chain', 0.8)], 1.5, 'diamond'),
        ]
    },
    // Level 117
    {
        name: 'Super Symmetry',
        description: 'Supersymmetric partners mirror every attack. Double trouble!',
        speedMult: 1.35,
        boss: null,
        miniboss: 15,
        waves: [
            makeWave([e('positron_mirror', 0.2, 'superposition'), e('neutrino_ghost', 0.4, 'superposition'), e('positron_mirror', 0.6, 'superposition'), e('neutrino_ghost', 0.8, 'superposition')], 1, 'ring'),
            makeWave([e('higgs_field', 0.3), e('boson_carrier', 0.5, 'orbital'), e('higgs_field', 0.7)], 1.5, 'cross'),
            makeWave([e('gluon_chain', 0.2), e('quark_triplet', 0.4, 'quantum_tunnel'), e('gluon_chain', 0.6), e('quark_triplet', 0.8, 'quantum_tunnel')], 1.5, 'line'),
        ]
    },
    // Level 118
    {
        name: 'Feynman Vertex',
        description: 'Interaction vertices multiply. Every enemy connects to every other!',
        speedMult: 1.4,
        boss: null,
        miniboss: 16,
        waves: [
            makeWave([e('boson_carrier', 0.2, 'orbital'), e('boson_carrier', 0.4, 'orbital'), e('boson_carrier', 0.6, 'orbital'), e('boson_carrier', 0.8, 'orbital')], 1, 'diamond'),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('higgs_field', 0.4), e('positron_mirror', 0.6, 'superposition'), e('gluon_chain', 0.8)], 1.5, 'stagger'),
            makeWave([e('neutrino_ghost', 0.2, 'wave_function'), e('boson_carrier', 0.4, 'orbital'), e('neutrino_ghost', 0.6, 'wave_function'), e('boson_carrier', 0.8, 'orbital')], 1.5, 'pincer'),
        ]
    },
    // Level 119
    {
        name: 'String Theory',
        description: 'Reality vibrates at its most fundamental level. One more push!',
        speedMult: 1.5,
        boss: null,
        miniboss: 13,
        waves: [
            makeWave([e('higgs_field', 0.2), e('positron_mirror', 0.4, 'superposition'), e('higgs_field', 0.6), e('positron_mirror', 0.8, 'superposition')], 1, 'cross'),
            makeWave([e('gluon_chain', 0.2), e('boson_carrier', 0.4, 'orbital'), e('quark_triplet', 0.6, 'quantum_tunnel'), e('neutrino_ghost', 0.8, 'wave_function')], 1.5, 'arrow'),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('positron_mirror', 0.4, 'superposition'), e('gluon_chain', 0.6), e('higgs_field', 0.8)], 1.5, 'vee'),
        ]
    },
    // ===== LEVEL 120: Boss - Grand Unified Theory =====
    {
        name: 'Grand Unified Theory',
        description: 'THE THEORY OF EVERYTHING. All four forces in one entity. End this!',
        speedMult: 1.55,
        boss: 24,
        miniboss: 14,
        waves: [
            makeWave([e('higgs_field', 0.3), e('boson_carrier', 0.5, 'orbital'), e('higgs_field', 0.7)], 1),
            makeWave([e('positron_mirror', 0.3, 'superposition'), e('gluon_chain', 0.5), e('positron_mirror', 0.7, 'superposition')], 1.5),
            makeWave([e('quark_triplet', 0.2, 'quantum_tunnel'), e('neutrino_ghost', 0.4, 'wave_function'), e('quark_triplet', 0.6, 'quantum_tunnel'), e('neutrino_ghost', 0.8, 'wave_function')], 1, 'diamond'),
        ]
    },
];

export { LEVEL_DATA , makeWave, e };