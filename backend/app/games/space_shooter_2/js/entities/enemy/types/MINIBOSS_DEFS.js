import { C_PERIWINKLE } from '../../LevelsThemes.js';
// ============================================================
//  MINI-BOSS DEFINITIONS — 4 unique mini-boss types
//  Smaller, fewer parts, no epic entrance. Cycle through levels.
// ============================================================
const MINIBOSS_DEFS = {
    // Mini-Boss 1: Scarab Drone — fast insectoid, rotating blades
    1: {
        name: 'Scarab Drone',
        totalWidth: 100, totalHeight: 90,
        baseHP: 18,
        score: 250,
        speed: 55,
        movePattern: 'zigzag',
        color: '#22bbaa',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 18,
                spriteKey: 'mboss1_core', canShoot: true, shootRate: 3, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 120
            },
            {
                role: 'arm', offsetX: -30, offsetY: 5, width: 20, height: 40, health: 8,
                spriteKey: 'mboss1_blade', rotationSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 30, offsetY: 5, width: 20, height: 40, health: 8,
                spriteKey: 'mboss1_blade', rotationSpeed: -1.5
            },
        ]
    },
    // Mini-Boss 2: Garrison Turret — heavy, shielded bunker
    2: {
        name: 'Garrison Turret',
        totalWidth: 120, totalHeight: 100,
        baseHP: 25,
        score: 300,
        speed: 20,
        movePattern: 'slowSweep',
        color: '#cc8833',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 25,
                spriteKey: 'mboss2_core', canShoot: true, shootRate: 2.5, shootPattern: 'radial', bulletCount: 6, bulletSpeed: 100
            },
            {
                role: 'shield', offsetX: 0, offsetY: -35, width: 60, height: 16, health: 12,
                spriteKey: 'mboss2_shield', bobAmplitude: 2, bobSpeed: 1.5
            },
            {
                role: 'turret', offsetX: -38, offsetY: -10, width: 22, height: 22, health: 8,
                spriteKey: 'mboss2_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 38, offsetY: -10, width: 22, height: 22, health: 8,
                spriteKey: 'mboss2_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 150
            },
        ]
    },
    // Mini-Boss 3: Phantom Wraith — orbiting will-o-wisps, weaving
    3: {
        name: 'Phantom Wraith',
        totalWidth: 110, totalHeight: 100,
        baseHP: 20,
        score: 280,
        speed: 40,
        movePattern: 'weave',
        color: '#8833cc',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 20,
                spriteKey: 'mboss3_core', canShoot: true, shootRate: 2.8, shootPattern: 'spiral', bulletCount: 3, bulletSpeed: 110
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 18, height: 18, health: 7,
                spriteKey: 'mboss3_orb', orbitRadius: 42, orbitAngle: 0, orbitSpeed: 2,
                canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 18, height: 18, health: 7,
                spriteKey: 'mboss3_orb', orbitRadius: 42, orbitAngle: Math.PI, orbitSpeed: 2,
                canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140
            },
            {
                role: 'arm', offsetX: 0, offsetY: 30, width: 25, height: 35, health: 6,
                spriteKey: 'mboss3_tail', bobAmplitude: 4, bobSpeed: 2
            },
        ]
    },
    // Mini-Boss 4: Inferno Striker — aggressive chaser, fast fire
    4: {
        name: 'Inferno Striker',
        totalWidth: 110, totalHeight: 90,
        baseHP: 22,
        score: 320,
        speed: 45,
        movePattern: 'chase',
        color: '#cc2233',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 22,
                spriteKey: 'mboss4_core', canShoot: true, shootRate: 2, shootPattern: 'rapid', bulletSpeed: 160, bulletCount: 2
            },
            {
                role: 'arm', offsetX: -32, offsetY: 10, width: 22, height: 30, health: 8,
                spriteKey: 'mboss4_pod', canShoot: true, shootRate: 3.5, shootPattern: 'aimed', bulletSpeed: 130
            },
            {
                role: 'arm', offsetX: 32, offsetY: 10, width: 22, height: 30, health: 8,
                spriteKey: 'mboss4_pod', canShoot: true, shootRate: 3.5, shootPattern: 'aimed', bulletSpeed: 130
            },
        ]
    },

    // ═══════ WORLD 2 MINI-BOSSES ═══════
    // Mini-Boss 5: Vine Sentinel — Jungle guardian
    5: {
        name: 'Vine Sentinel',
        totalWidth: 110, totalHeight: 100,
        baseHP: 30,
        score: 400,
        speed: 40,
        movePattern: 'weave',
        color: '#33aa55',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 30,
                spriteKey: 'mboss5_core', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 130
            },
            {
                role: 'arm', offsetX: -35, offsetY: 10, width: 22, height: 35, health: 10,
                spriteKey: 'mboss5_vine', rotationSpeed: 1, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140
            },
            {
                role: 'arm', offsetX: 35, offsetY: 10, width: 22, height: 35, health: 10,
                spriteKey: 'mboss5_vine', rotationSpeed: -1, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140
            },
        ]
    },
    // Mini-Boss 6: Magma Sprite — Volcanic fire mini
    6: {
        name: 'Magma Sprite',
        totalWidth: 100, totalHeight: 90,
        baseHP: 28,
        score: 380,
        speed: 50,
        movePattern: 'chase',
        color: '#ff6600',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 28,
                spriteKey: 'mboss6_core', canShoot: true, shootRate: 2, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 120
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
                spriteKey: 'mboss6_orb', orbitRadius: 38, orbitAngle: 0, orbitSpeed: 2.5,
                canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
                spriteKey: 'mboss6_orb', orbitRadius: 38, orbitAngle: Math.PI, orbitSpeed: 2.5,
                canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 150
            },
        ]
    },
    // Mini-Boss 7: Cryo Colossus — Ice frozen hulk
    7: {
        name: 'Cryo Colossus',
        totalWidth: 120, totalHeight: 110,
        baseHP: 35,
        score: 420,
        speed: 25,
        movePattern: 'slowSweep',
        color: '#55ccff',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 60, height: 60, health: 35,
                spriteKey: 'mboss7_core', canShoot: true, shootRate: 2.2, shootPattern: 'spiral', bulletCount: 5, bulletSpeed: 115
            },
            {
                role: 'shield', offsetX: 0, offsetY: -38, width: 65, height: 18, health: 15,
                spriteKey: 'mboss7_shield', bobAmplitude: 2, bobSpeed: 1.5
            },
            {
                role: 'turret', offsetX: -40, offsetY: -8, width: 24, height: 24, health: 10,
                spriteKey: 'mboss7_turret', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155
            },
            {
                role: 'turret', offsetX: 40, offsetY: -8, width: 24, height: 24, health: 10,
                spriteKey: 'mboss7_turret', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155
            },
        ]
    },
    // Mini-Boss 8: Rust Hulk — Mechanical scrap titan
    8: {
        name: 'Rust Hulk',
        totalWidth: 115, totalHeight: 100,
        baseHP: 32,
        score: 440,
        speed: 35,
        movePattern: 'zigzag',
        color: '#99775a',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 32,
                spriteKey: 'mboss8_core', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3
            },
            {
                role: 'arm', offsetX: -35, offsetY: 8, width: 24, height: 32, health: 10,
                spriteKey: 'mboss8_claw', bobAmplitude: 3, bobSpeed: 2
            },
            {
                role: 'arm', offsetX: 35, offsetY: 8, width: 24, height: 32, health: 10,
                spriteKey: 'mboss8_claw', bobAmplitude: 3, bobSpeed: 2
            },
            {
                role: 'turret', offsetX: 0, offsetY: -30, width: 22, height: 22, health: 8,
                spriteKey: 'mboss8_turret', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140
            },
        ]
    },

    // ═══════ WORLD 3 MINI-BOSSES — Simulation Break ═══════
    // Mini-Boss 9: Glitch Core — fast digital insectoid
    9: {
        name: 'Glitch Core',
        totalWidth: 110, totalHeight: 100,
        baseHP: 38,
        score: 500,
        speed: 50,
        movePattern: 'zigzag',
        color: '#00ddcc',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 38,
                spriteKey: 'mboss9_core', canShoot: true, shootRate: 2.2, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 140
            },
            {
                role: 'arm', offsetX: -35, offsetY: 8, width: 22, height: 35, health: 12,
                spriteKey: 'mboss9_blade', rotationSpeed: 2
            },
            {
                role: 'arm', offsetX: 35, offsetY: 8, width: 22, height: 35, health: 12,
                spriteKey: 'mboss9_blade', rotationSpeed: -2
            },
            {
                role: 'turret', offsetX: 0, offsetY: -32, width: 20, height: 20, health: 8,
                spriteKey: 'mboss9_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160
            },
        ]
    },
    // Mini-Boss 10: Broken Renderer — slow, shielded, heavy fire
    10: {
        name: 'Broken Renderer',
        totalWidth: 125, totalHeight: 110,
        baseHP: 42,
        score: 520,
        speed: 22,
        movePattern: 'slowSweep',
        color: '#8844ff',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 60, height: 60, health: 42,
                spriteKey: 'mboss10_core', canShoot: true, shootRate: 1.8, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 125
            },
            {
                role: 'shield', offsetX: 0, offsetY: -40, width: 70, height: 18, health: 18,
                spriteKey: 'mboss10_shield', bobAmplitude: 2, bobSpeed: 1.5
            },
            {
                role: 'turret', offsetX: -42, offsetY: -12, width: 24, height: 24, health: 10,
                spriteKey: 'mboss10_turret', canShoot: true, shootRate: 2, shootPattern: 'rapid', bulletSpeed: 165, bulletCount: 2
            },
            {
                role: 'turret', offsetX: 42, offsetY: -12, width: 24, height: 24, health: 10,
                spriteKey: 'mboss10_turret', canShoot: true, shootRate: 2, shootPattern: 'rapid', bulletSpeed: 165, bulletCount: 2
            },
        ]
    },
    // Mini-Boss 11: Fragment Swarm — orbiting shards, weave pattern
    11: {
        name: 'Fragment Swarm',
        totalWidth: 115, totalHeight: 110,
        baseHP: 36,
        score: 480,
        speed: 45,
        movePattern: 'weave',
        color: '#ff3388',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 36,
                spriteKey: 'mboss11_core', canShoot: true, shootRate: 2, shootPattern: 'spiral', bulletCount: 4, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
                spriteKey: 'mboss11_orb', orbitRadius: 44, orbitAngle: 0, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
                spriteKey: 'mboss11_orb', orbitRadius: 44, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
                spriteKey: 'mboss11_orb', orbitRadius: 44, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155
            },
        ]
    },
    // Mini-Boss 12: Mirror Guardian — aggressive chaser, reflective
    12: {
        name: 'Mirror Guardian',
        totalWidth: 115, totalHeight: 100,
        baseHP: 40,
        score: 540,
        speed: 48,
        movePattern: 'chase',
        color: C_PERIWINKLE,
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 40,
                spriteKey: 'mboss12_core', canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 175, bulletCount: 3
            },
            {
                role: 'arm', offsetX: -35, offsetY: 10, width: 24, height: 34, health: 11,
                spriteKey: 'mboss12_arm', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'arm', offsetX: 35, offsetY: 10, width: 24, height: 34, health: 11,
                spriteKey: 'mboss12_arm', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'shield', offsetX: 0, offsetY: -35, width: 60, height: 16, health: 14,
                spriteKey: 'mboss12_shield', bobAmplitude: 2, bobSpeed: 1.8
            },
        ]
    },

    // ═══════ WORLD 4 MINI-BOSSES — Quantum Realm ═══════
    // Mini-Boss 13: Charm Quark — fast, color-phase cycling; only vulnerable during matching color
    13: {
        name: 'Charm Quark',
        totalWidth: 110, totalHeight: 100,
        baseHP: 45,
        score: 600,
        speed: 52,
        movePattern: 'weave',
        color: '#ff5588',
        w4miniboss: 'charmPhase',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 45,
                spriteKey: 'mboss13_core', canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 10,
                spriteKey: 'mboss13_orb', orbitRadius: 45, orbitAngle: 0, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 10,
                spriteKey: 'mboss13_orb', orbitRadius: 45, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 10,
                spriteKey: 'mboss13_orb', orbitRadius: 45, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
        ]
    },

    // Mini-Boss 14: Strange Oscillator — state changes between 3 forms; timing-based vulnerability window
    14: {
        name: 'Strange Oscillator',
        totalWidth: 115, totalHeight: 105,
        baseHP: 48,
        score: 640,
        speed: 38,
        movePattern: 'zigzag',
        color: '#55ddff',
        w4miniboss: 'strangeOscillation',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 58, height: 58, health: 48,
                spriteKey: 'mboss14_core', canShoot: true, shootRate: 2.2, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 120
            },
            {
                role: 'shield', offsetX: 0, offsetY: -38, width: 65, height: 18, health: 16,
                spriteKey: 'mboss14_shield', bobAmplitude: 2, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -38, offsetY: 10, width: 24, height: 35, health: 12,
                spriteKey: 'mboss14_arm', rotationSpeed: 1.5, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 145
            },
            {
                role: 'arm', offsetX: 38, offsetY: 10, width: 24, height: 35, health: 12,
                spriteKey: 'mboss14_arm', rotationSpeed: -1.5, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 145
            },
        ]
    },

    // Mini-Boss 15: Top Resonance — heavy, rotating shield with 2 gaps; must shoot through gap to hit core
    15: {
        name: 'Top Resonance',
        totalWidth: 125, totalHeight: 115,
        baseHP: 55,
        score: 680,
        speed: 20,
        movePattern: 'slowSweep',
        color: '#ffcc33',
        w4miniboss: 'resonanceShield',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 55,
                spriteKey: 'mboss15_core', canShoot: true, shootRate: 2.5, shootPattern: 'spiral', bulletCount: 5, bulletSpeed: 115
            },
            // Orbiting shield segments with gaps
            {
                role: 'shield', offsetX: 0, offsetY: 0, width: 30, height: 16, health: 20,
                spriteKey: 'mboss15_shield', orbitRadius: 48, orbitAngle: 0, orbitSpeed: 0.8
            },
            {
                role: 'shield', offsetX: 0, offsetY: 0, width: 30, height: 16, health: 20,
                spriteKey: 'mboss15_shield', orbitRadius: 48, orbitAngle: Math.PI / 2, orbitSpeed: 0.8
            },
            {
                role: 'shield', offsetX: 0, offsetY: 0, width: 30, height: 16, health: 20,
                spriteKey: 'mboss15_shield', orbitRadius: 48, orbitAngle: Math.PI, orbitSpeed: 0.8
            },
            {
                role: 'turret', offsetX: -42, offsetY: -12, width: 22, height: 22, health: 10,
                spriteKey: 'mboss15_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 155
            },
            {
                role: 'turret', offsetX: 42, offsetY: -12, width: 22, height: 22, health: 10,
                spriteKey: 'mboss15_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 155
            },
        ]
    },

    // Mini-Boss 16: Bottom Decayer — when destroyed, splits into 2 smaller sub-bosses
    16: {
        name: 'Bottom Decayer',
        totalWidth: 120, totalHeight: 105,
        baseHP: 42,
        score: 720,
        speed: 42,
        movePattern: 'chase',
        color: '#88ff55',
        w4miniboss: 'decay',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 42,
                spriteKey: 'mboss16_core', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3
            },
            {
                role: 'arm', offsetX: -35, offsetY: 10, width: 24, height: 34, health: 12,
                spriteKey: 'mboss16_pod', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 145
            },
            {
                role: 'arm', offsetX: 35, offsetY: 10, width: 24, height: 34, health: 12,
                spriteKey: 'mboss16_pod', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 145
            },
            {
                role: 'turret', offsetX: 0, offsetY: -32, width: 20, height: 20, health: 8,
                spriteKey: 'mboss16_turret', canShoot: true, shootRate: 2.8, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 135
            },
        ]
    }
};

export { MINIBOSS_DEFS };