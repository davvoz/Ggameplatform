// ============================================================
//  BOSS DEFINITIONS — 6 unique boss configurations
// ============================================================
const BOSS_DEFS = {
    // Boss 1 (Level 5): Crimson Vanguard — classic, simple
    1: {
        name: 'Crimson Vanguard',
        totalWidth: 160, totalHeight: 150,
        baseHP: 40,
        score: 800,
        speed: 35,
        movePattern: 'sweep',
        color: '#dd2222',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 70, height: 70, health: 40,
                spriteKey: 'boss1_core', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 120
            },
            {
                role: 'turret', offsetX: -55, offsetY: -10, width: 30, height: 30, health: 12,
                spriteKey: 'boss1_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 55, offsetY: -10, width: 30, height: 30, health: 12,
                spriteKey: 'boss1_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'arm', offsetX: -40, offsetY: 20, width: 35, height: 45, health: 15,
                spriteKey: 'boss1_arm', bobAmplitude: 5, bobSpeed: 2
            },
            {
                role: 'arm', offsetX: 40, offsetY: 20, width: 35, height: 45, health: 15,
                spriteKey: 'boss1_arm', bobAmplitude: 5, bobSpeed: 2
            },
        ]
    },
    // Boss 2 (Level 10): Iron Monolith — heavy tank, shielded
    2: {
        name: 'Iron Monolith',
        totalWidth: 190, totalHeight: 170,
        baseHP: 60,
        score: 1200,
        speed: 25,
        movePattern: 'slowSweep',
        color: '#ee7700',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 60,
                spriteKey: 'boss2_core', canShoot: true, shootRate: 3, shootPattern: 'radial', bulletCount: 10, bulletSpeed: 100
            },
            {
                role: 'shield', offsetX: 0, offsetY: -50, width: 100, height: 25, health: 25,
                spriteKey: 'boss2_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'turret', offsetX: -65, offsetY: -25, width: 35, height: 35, health: 18,
                spriteKey: 'boss2_turret', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3
            },
            {
                role: 'turret', offsetX: 65, offsetY: -25, width: 35, height: 35, health: 18,
                spriteKey: 'boss2_turret', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3
            },
            {
                role: 'arm', offsetX: -50, offsetY: 30, width: 40, height: 55, health: 20,
                spriteKey: 'boss2_arm', bobAmplitude: 4, bobSpeed: 1.8
            },
            {
                role: 'arm', offsetX: 50, offsetY: 30, width: 40, height: 55, health: 20,
                spriteKey: 'boss2_arm', bobAmplitude: 4, bobSpeed: 1.8
            },
        ]
    },
    // Boss 3 (Level 15): Void Leviathan — phasing, orbiting parts
    3: {
        name: 'Void Leviathan',
        totalWidth: 200, totalHeight: 190,
        baseHP: 75,
        score: 1800,
        speed: 40,
        movePattern: 'weave',
        color: '#7722dd',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 75, height: 75, health: 75,
                spriteKey: 'boss3_core', canShoot: true, shootRate: 2, shootPattern: 'spiral', bulletCount: 5, bulletSpeed: 110
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
                spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: 0, orbitSpeed: 1.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
                spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: Math.PI, orbitSpeed: 1.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
                spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: Math.PI / 2, orbitSpeed: 1.5,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150
            },
            {
                role: 'arm', offsetX: -55, offsetY: 25, width: 35, height: 50, health: 20,
                spriteKey: 'boss3_arm', rotationSpeed: 0.5
            },
            {
                role: 'arm', offsetX: 55, offsetY: 25, width: 35, height: 50, health: 20,
                spriteKey: 'boss3_arm', rotationSpeed: -0.5
            },
        ]
    },
    // Boss 4 (Level 20): Omega Prime — double core, massive
    4: {
        name: 'Omega Prime',
        totalWidth: 220, totalHeight: 200,
        baseHP: 95,
        score: 2500,
        speed: 30,
        movePattern: 'figure8',
        color: '#dd1177',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: -15, width: 85, height: 85, health: 95,
                spriteKey: 'boss4_core', canShoot: true, shootRate: 1.5, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 120
            },
            {
                role: 'weakpoint', offsetX: 0, offsetY: 45, width: 25, height: 25, health: 20,
                spriteKey: 'boss4_weak', score: 200
            },
            {
                role: 'turret', offsetX: -75, offsetY: -30, width: 35, height: 35, health: 20,
                spriteKey: 'boss4_turret', canShoot: true, shootRate: 1.2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 140
            },
            {
                role: 'turret', offsetX: 75, offsetY: -30, width: 35, height: 35, health: 20,
                spriteKey: 'boss4_turret', canShoot: true, shootRate: 1.2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 140
            },
            {
                role: 'shield', offsetX: -45, offsetY: -55, width: 40, height: 20, health: 18,
                spriteKey: 'boss4_shield', bobAmplitude: 4, bobSpeed: 2
            },
            {
                role: 'shield', offsetX: 45, offsetY: -55, width: 40, height: 20, health: 18,
                spriteKey: 'boss4_shield', bobAmplitude: 4, bobSpeed: 2
            },
            {
                role: 'arm', offsetX: -60, offsetY: 35, width: 40, height: 60, health: 22,
                spriteKey: 'boss4_arm', bobAmplitude: 6, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 60, offsetY: 35, width: 40, height: 60, health: 22,
                spriteKey: 'boss4_arm', bobAmplitude: 6, bobSpeed: 1.5
            },
        ]
    },
    // Boss 5 (Level 25): Nemesis — fast, many orbiting weapons
    5: {
        name: 'Nemesis',
        totalWidth: 200, totalHeight: 200,
        baseHP: 110,
        score: 3200,
        speed: 50,
        movePattern: 'chase',
        color: '#dd3355',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 70, height: 70, health: 110,
                spriteKey: 'boss5_core', canShoot: true, shootRate: 1.5, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
                spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: 0, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
                spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
                spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 14,
                spriteKey: 'boss5_orb', orbitRadius: 85, orbitAngle: Math.PI / 3, orbitSpeed: -1.8,
                canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 14,
                spriteKey: 'boss5_orb', orbitRadius: 85, orbitAngle: Math.PI, orbitSpeed: -1.8,
                canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140
            },
            {
                role: 'arm', offsetX: -45, offsetY: 40, width: 30, height: 40, health: 15,
                spriteKey: 'boss5_arm'
            },
            {
                role: 'arm', offsetX: 45, offsetY: 40, width: 30, height: 40, health: 15,
                spriteKey: 'boss5_arm'
            },
        ]
    },
    // Boss 6 (Level 30): Apocalypse — final boss, multi-phase, devastating
    6: {
        name: 'Apocalypse',
        totalWidth: 240, totalHeight: 220,
        baseHP: 150,
        score: 5000,
        speed: 35,
        movePattern: 'erratic',
        color: '#ff2200',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 150,
                spriteKey: 'boss6_core', canShoot: true, shootRate: 1.2, shootPattern: 'radial', bulletCount: 16, bulletSpeed: 110
            },
            {
                role: 'turret', offsetX: -80, offsetY: -35, width: 35, height: 35, health: 22,
                spriteKey: 'boss6_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 190, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 80, offsetY: -35, width: 35, height: 35, health: 22,
                spriteKey: 'boss6_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 190, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
                spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: 0, orbitSpeed: 2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
                spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI / 2, orbitSpeed: 2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
                spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI, orbitSpeed: 2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
                spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'shield', offsetX: 0, offsetY: -65, width: 120, height: 25, health: 30,
                spriteKey: 'boss6_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'weakpoint', offsetX: -35, offsetY: 50, width: 22, height: 22, health: 15,
                spriteKey: 'boss6_weak', score: 300
            },
            {
                role: 'weakpoint', offsetX: 35, offsetY: 50, width: 22, height: 22, health: 15,
                spriteKey: 'boss6_weak', score: 300
            },
            {
                role: 'arm', offsetX: -70, offsetY: 40, width: 45, height: 65, health: 28,
                spriteKey: 'boss6_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 70, offsetY: 40, width: 45, height: 65, health: 28,
                spriteKey: 'boss6_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },

    // ═══════════════════════════════════════════
    //  WORLD 2 BOSSES — 6 planetary guardians
    // ═══════════════════════════════════════════
    // Boss 7 (Level 35): Titanus Rex — Alien Jungle guardian
    7: {
        name: 'Titanus Rex',
        totalWidth: 200, totalHeight: 190,
        baseHP: 110,
        score: 5500,
        speed: 38,
        movePattern: 'chase',
        color: '#22cc44',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 110,
                spriteKey: 'boss7_core', canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: -65, offsetY: -30, width: 32, height: 32, health: 16,
                spriteKey: 'boss7_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 65, offsetY: -30, width: 32, height: 32, health: 16,
                spriteKey: 'boss7_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'arm', offsetX: -50, offsetY: 35, width: 40, height: 55, health: 18,
                spriteKey: 'boss7_arm', bobAmplitude: 6, bobSpeed: 1.8
            },
            {
                role: 'arm', offsetX: 50, offsetY: 35, width: 40, height: 55, health: 18,
                spriteKey: 'boss7_arm', bobAmplitude: 6, bobSpeed: 1.8
            },
            {
                role: 'shield', offsetX: 0, offsetY: -55, width: 90, height: 22, health: 14,
                spriteKey: 'boss7_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
        ]
    },
    // Boss 8 (Level 40): Magma Colossus — Volcanic guardian
    8: {
        name: 'Magma Colossus',
        totalWidth: 220, totalHeight: 200,
        baseHP: 160,
        score: 6000,
        speed: 28,
        movePattern: 'figure8',
        color: '#ff5500',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 160,
                spriteKey: 'boss8_core', canShoot: true, shootRate: 1.5, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 120
            },
            {
                role: 'turret', offsetX: -75, offsetY: -30, width: 35, height: 35, health: 25,
                spriteKey: 'boss8_turret', canShoot: true, shootRate: 1.3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 75, offsetY: -30, width: 35, height: 35, health: 25,
                spriteKey: 'boss8_turret', canShoot: true, shootRate: 1.3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 150
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss8_orb', orbitRadius: 80, orbitAngle: 0, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss8_orb', orbitRadius: 80, orbitAngle: Math.PI, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'arm', offsetX: -60, offsetY: 40, width: 45, height: 60, health: 28,
                spriteKey: 'boss8_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
            {
                role: 'arm', offsetX: 60, offsetY: 40, width: 45, height: 60, health: 28,
                spriteKey: 'boss8_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
            {
                role: 'shield', offsetX: 0, offsetY: -65, width: 110, height: 25, health: 28,
                spriteKey: 'boss8_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
        ]
    },
    // Boss 9 (Level 45): Frost Sovereign — Frozen guardian
    9: {
        name: 'Frost Sovereign',
        totalWidth: 210, totalHeight: 200,
        baseHP: 210,
        score: 7500,
        speed: 42,
        movePattern: 'weave',
        color: '#44bbff',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 210,
                spriteKey: 'boss9_core', canShoot: true, shootRate: 1.8, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 125
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
                spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: 0, orbitSpeed: 2,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
                spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
                spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165
            },
            {
                role: 'shield', offsetX: -40, offsetY: -50, width: 35, height: 18, health: 20,
                spriteKey: 'boss9_shield', bobAmplitude: 3, bobSpeed: 2
            },
            {
                role: 'shield', offsetX: 40, offsetY: -50, width: 35, height: 18, health: 20,
                spriteKey: 'boss9_shield', bobAmplitude: 3, bobSpeed: 2
            },
            {
                role: 'arm', offsetX: -55, offsetY: 30, width: 38, height: 50, health: 24,
                spriteKey: 'boss9_arm', rotationSpeed: 0.4
            },
            {
                role: 'arm', offsetX: 55, offsetY: 30, width: 38, height: 50, health: 24,
                spriteKey: 'boss9_arm', rotationSpeed: -0.4
            },
        ]
    },
    // Boss 10 (Level 50): Sandstorm Leviathan — Desert guardian
    10: {
        name: 'Sandstorm Leviathan',
        totalWidth: 230, totalHeight: 210,
        baseHP: 250,
        score: 8500,
        speed: 48,
        movePattern: 'erratic',
        color: '#ddaa33',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 250,
                spriteKey: 'boss10_core', canShoot: true, shootRate: 1.3, shootPattern: 'radial', bulletCount: 14, bulletSpeed: 125
            },
            {
                role: 'turret', offsetX: -80, offsetY: -35, width: 35, height: 35, health: 24,
                spriteKey: 'boss10_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3
            },
            {
                role: 'turret', offsetX: 80, offsetY: -35, width: 35, height: 35, health: 24,
                spriteKey: 'boss10_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 18,
                spriteKey: 'boss10_orb', orbitRadius: 85, orbitAngle: 0, orbitSpeed: -2,
                canShoot: true, shootRate: 1.8, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 155
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 18,
                spriteKey: 'boss10_orb', orbitRadius: 85, orbitAngle: Math.PI, orbitSpeed: -2,
                canShoot: true, shootRate: 1.8, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 155
            },
            {
                role: 'weakpoint', offsetX: 0, offsetY: 50, width: 24, height: 24, health: 18,
                spriteKey: 'boss10_weak', score: 350
            },
            {
                role: 'arm', offsetX: -65, offsetY: 40, width: 42, height: 60, health: 26,
                spriteKey: 'boss10_arm', bobAmplitude: 6, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 65, offsetY: 40, width: 42, height: 60, health: 26,
                spriteKey: 'boss10_arm', bobAmplitude: 6, bobSpeed: 1.5
            },
        ]
    },
    // Boss 11 (Level 55): Omega Construct — Mechanical guardian
    11: {
        name: 'Omega Construct',
        totalWidth: 240, totalHeight: 220,
        baseHP: 280,
        score: 9500,
        speed: 30,
        movePattern: 'slowSweep',
        color: '#7799bb',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 280,
                spriteKey: 'boss11_core', canShoot: true, shootRate: 1.2, shootPattern: 'spiral', bulletCount: 8, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: -85, offsetY: -30, width: 35, height: 35, health: 25,
                spriteKey: 'boss11_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 85, offsetY: -30, width: 35, height: 35, health: 25,
                spriteKey: 'boss11_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4
            },
            {
                role: 'turret', offsetX: -45, offsetY: -50, width: 28, height: 28, health: 18,
                spriteKey: 'boss11_turret2', canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175
            },
            {
                role: 'turret', offsetX: 45, offsetY: -50, width: 28, height: 28, health: 18,
                spriteKey: 'boss11_turret2', canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175
            },
            {
                role: 'shield', offsetX: 0, offsetY: -70, width: 130, height: 25, health: 35,
                spriteKey: 'boss11_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'shield', offsetX: -50, offsetY: -50, width: 30, height: 18, health: 18,
                spriteKey: 'boss11_shield2'
            },
            {
                role: 'shield', offsetX: 50, offsetY: -50, width: 30, height: 18, health: 18,
                spriteKey: 'boss11_shield2'
            },
            {
                role: 'arm', offsetX: -75, offsetY: 40, width: 45, height: 65, health: 30,
                spriteKey: 'boss11_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 75, offsetY: 40, width: 45, height: 65, health: 30,
                spriteKey: 'boss11_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },
    // Boss 12 (Level 60): Toxin Emperor — Toxic final guardian
    12: {
        name: 'Toxin Emperor',
        totalWidth: 250, totalHeight: 230,
        baseHP: 320,
        score: 12000,
        speed: 38,
        movePattern: 'erratic',
        color: '#88ee00',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 95, height: 95, health: 320,
                spriteKey: 'boss12_core', canShoot: true, shootRate: 1, shootPattern: 'radial', bulletCount: 18, bulletSpeed: 115
            },
            {
                role: 'turret', offsetX: -90, offsetY: -35, width: 38, height: 38, health: 28,
                spriteKey: 'boss12_turret', canShoot: true, shootRate: 0.9, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 90, offsetY: -35, width: 38, height: 38, health: 28,
                spriteKey: 'boss12_turret', canShoot: true, shootRate: 0.9, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: 0, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI / 2, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180
            },
            {
                role: 'shield', offsetX: 0, offsetY: -70, width: 130, height: 28, health: 35,
                spriteKey: 'boss12_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'weakpoint', offsetX: -40, offsetY: 55, width: 24, height: 24, health: 18,
                spriteKey: 'boss12_weak', score: 400
            },
            {
                role: 'weakpoint', offsetX: 40, offsetY: 55, width: 24, height: 24, health: 18,
                spriteKey: 'boss12_weak', score: 400
            },
            {
                role: 'arm', offsetX: -80, offsetY: 40, width: 48, height: 68, health: 32,
                spriteKey: 'boss12_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 80, offsetY: 40, width: 48, height: 68, health: 32,
                spriteKey: 'boss12_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
        ]
    },

    // ═══════════════════════════════════════════════
    //  WORLD 3 BOSSES — Simulation Break (13-18)
    // ═══════════════════════════════════════════════
    // Boss 13 (Level 65): Corrupted Compiler — first W3 boss, moderate
    13: {
        name: 'Corrupted Compiler',
        totalWidth: 180, totalHeight: 160,
        baseHP: 180,
        score: 6000,
        speed: 38,
        movePattern: 'sweep',
        color: '#00ddcc',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 75, height: 75, health: 180,
                spriteKey: 'boss13_core', canShoot: true, shootRate: 2.2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: -60, offsetY: -20, width: 32, height: 32, health: 18,
                spriteKey: 'boss13_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 165
            },
            {
                role: 'turret', offsetX: 60, offsetY: -20, width: 32, height: 32, health: 18,
                spriteKey: 'boss13_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 165
            },
            {
                role: 'shield', offsetX: 0, offsetY: -55, width: 100, height: 22, health: 22,
                spriteKey: 'boss13_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -50, offsetY: 25, width: 38, height: 50, health: 20,
                spriteKey: 'boss13_arm', bobAmplitude: 5, bobSpeed: 1.8
            },
            {
                role: 'arm', offsetX: 50, offsetY: 25, width: 38, height: 50, health: 20,
                spriteKey: 'boss13_arm', bobAmplitude: 5, bobSpeed: 1.8
            },
        ]
    },
    // Boss 14 (Level 70): Fragment King — heavy, many orbiting shards
    14: {
        name: 'Fragment King',
        totalWidth: 210, totalHeight: 190,
        baseHP: 220,
        score: 7500,
        speed: 30,
        movePattern: 'weave',
        color: '#ff3388',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 220,
                spriteKey: 'boss14_core', canShoot: true, shootRate: 1.8, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 110
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss14_orb', orbitRadius: 75, orbitAngle: 0, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss14_orb', orbitRadius: 75, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss14_orb', orbitRadius: 75, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 160
            },
            {
                role: 'arm', offsetX: -65, offsetY: 30, width: 40, height: 55, health: 22,
                spriteKey: 'boss14_arm', bobAmplitude: 4, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 65, offsetY: 30, width: 40, height: 55, health: 22,
                spriteKey: 'boss14_arm', bobAmplitude: 4, bobSpeed: 1.5
            },
            {
                role: 'shield', offsetX: 0, offsetY: -60, width: 110, height: 24, health: 28,
                spriteKey: 'boss14_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
        ]
    },
    // Boss 15 (Level 75): Mirror Engine — erratic, reflective shields
    15: {
        name: 'Mirror Engine',
        totalWidth: 220, totalHeight: 200,
        baseHP: 260,
        score: 9000,
        speed: 42,
        movePattern: 'erratic',
        color: '#ccccff',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 260,
                spriteKey: 'boss15_core', canShoot: true, shootRate: 1.5, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 120
            },
            {
                role: 'turret', offsetX: -75, offsetY: -30, width: 34, height: 34, health: 22,
                spriteKey: 'boss15_turret', canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 180, bulletCount: 3
            },
            {
                role: 'turret', offsetX: 75, offsetY: -30, width: 34, height: 34, health: 22,
                spriteKey: 'boss15_turret', canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 180, bulletCount: 3
            },
            {
                role: 'shield', offsetX: -45, offsetY: -55, width: 35, height: 20, health: 20,
                spriteKey: 'boss15_shield'
            },
            {
                role: 'shield', offsetX: 45, offsetY: -55, width: 35, height: 20, health: 20,
                spriteKey: 'boss15_shield'
            },
            {
                role: 'shield', offsetX: 0, offsetY: -65, width: 90, height: 22, health: 25,
                spriteKey: 'boss15_shield2', bobAmplitude: 3, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: -65, offsetY: 35, width: 42, height: 58, health: 25,
                spriteKey: 'boss15_arm', bobAmplitude: 5, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 65, offsetY: 35, width: 42, height: 58, health: 25,
                spriteKey: 'boss15_arm', bobAmplitude: 5, bobSpeed: 1.5
            },
        ]
    },
    // Boss 16 (Level 80): Chaos Generator — figure8 pattern, heavy fire
    16: {
        name: 'Chaos Generator',
        totalWidth: 230, totalHeight: 210,
        baseHP: 300,
        score: 10500,
        speed: 35,
        movePattern: 'figure8',
        color: '#ff8800',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 300,
                spriteKey: 'boss16_core', canShoot: true, shootRate: 1.2, shootPattern: 'radial', bulletCount: 14, bulletSpeed: 115
            },
            {
                role: 'turret', offsetX: -80, offsetY: -30, width: 36, height: 36, health: 24,
                spriteKey: 'boss16_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 80, offsetY: -30, width: 36, height: 36, health: 24,
                spriteKey: 'boss16_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss16_orb', orbitRadius: 85, orbitAngle: 0, orbitSpeed: 2,
                canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
                spriteKey: 'boss16_orb', orbitRadius: 85, orbitAngle: Math.PI, orbitSpeed: 2,
                canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'shield', offsetX: 0, offsetY: -65, width: 120, height: 25, health: 30,
                spriteKey: 'boss16_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -70, offsetY: 40, width: 44, height: 62, health: 28,
                spriteKey: 'boss16_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 70, offsetY: 40, width: 44, height: 62, health: 28,
                spriteKey: 'boss16_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },
    // Boss 17 (Level 85): Data Devourer — chase pattern, aggressive, weakpoints
    17: {
        name: 'Data Devourer',
        totalWidth: 240, totalHeight: 220,
        baseHP: 340,
        score: 11500,
        speed: 40,
        movePattern: 'chase',
        color: '#8844ff',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 92, height: 92, health: 340,
                spriteKey: 'boss17_core', canShoot: true, shootRate: 1, shootPattern: 'spiral', bulletCount: 8, bulletSpeed: 125
            },
            {
                role: 'turret', offsetX: -85, offsetY: -35, width: 38, height: 38, health: 26,
                spriteKey: 'boss17_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 85, offsetY: -35, width: 38, height: 38, health: 26,
                spriteKey: 'boss17_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss17_orb', orbitRadius: 90, orbitAngle: 0, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
                spriteKey: 'boss17_orb', orbitRadius: 90, orbitAngle: Math.PI, orbitSpeed: 2.2,
                canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175
            },
            {
                role: 'shield', offsetX: 0, offsetY: -68, width: 125, height: 24, health: 32,
                spriteKey: 'boss17_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'weakpoint', offsetX: -42, offsetY: 50, width: 24, height: 24, health: 16,
                spriteKey: 'boss17_weak', score: 450
            },
            {
                role: 'weakpoint', offsetX: 42, offsetY: 50, width: 24, height: 24, health: 16,
                spriteKey: 'boss17_weak', score: 450
            },
            {
                role: 'arm', offsetX: -75, offsetY: 40, width: 46, height: 65, health: 30,
                spriteKey: 'boss17_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 75, offsetY: 40, width: 46, height: 65, health: 30,
                spriteKey: 'boss17_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },
    // Boss 18 (Level 90): The Kernel — final W3 boss, maximum everything
    18: {
        name: 'The Kernel',
        totalWidth: 260, totalHeight: 240,
        baseHP: 400,
        score: 14000,
        speed: 38,
        movePattern: 'erratic',
        color: '#ff0044',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 100, height: 100, health: 400,
                spriteKey: 'boss18_core', canShoot: true, shootRate: 0.9, shootPattern: 'radial', bulletCount: 20, bulletSpeed: 120
            },
            {
                role: 'turret', offsetX: -95, offsetY: -40, width: 40, height: 40, health: 30,
                spriteKey: 'boss18_turret', canShoot: true, shootRate: 0.8, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 5
            },
            {
                role: 'turret', offsetX: 95, offsetY: -40, width: 40, height: 40, health: 30,
                spriteKey: 'boss18_turret', canShoot: true, shootRate: 0.8, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 5
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 22,
                spriteKey: 'boss18_orb', orbitRadius: 100, orbitAngle: 0, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.2, shootPattern: 'aimed', bulletSpeed: 185
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 22,
                spriteKey: 'boss18_orb', orbitRadius: 100, orbitAngle: Math.PI / 2, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.2, shootPattern: 'aimed', bulletSpeed: 185
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 22,
                spriteKey: 'boss18_orb', orbitRadius: 100, orbitAngle: Math.PI, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.2, shootPattern: 'aimed', bulletSpeed: 185
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 22,
                spriteKey: 'boss18_orb', orbitRadius: 100, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 2.5,
                canShoot: true, shootRate: 1.2, shootPattern: 'aimed', bulletSpeed: 185
            },
            {
                role: 'shield', offsetX: 0, offsetY: -75, width: 140, height: 28, health: 38,
                spriteKey: 'boss18_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'shield', offsetX: -55, offsetY: -55, width: 32, height: 18, health: 20,
                spriteKey: 'boss18_shield2'
            },
            {
                role: 'shield', offsetX: 55, offsetY: -55, width: 32, height: 18, health: 20,
                spriteKey: 'boss18_shield2'
            },
            {
                role: 'weakpoint', offsetX: -45, offsetY: 58, width: 26, height: 26, health: 18,
                spriteKey: 'boss18_weak', score: 500
            },
            {
                role: 'weakpoint', offsetX: 45, offsetY: 58, width: 26, height: 26, health: 18,
                spriteKey: 'boss18_weak', score: 500
            },
            {
                role: 'arm', offsetX: -85, offsetY: 45, width: 50, height: 70, health: 35,
                spriteKey: 'boss18_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 85, offsetY: 45, width: 50, height: 70, health: 35,
                spriteKey: 'boss18_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
        ]
    },

    // ═══════════════════════════════════════════════════════
    //  WORLD 4 BOSSES — Quantum Realm (bossId 19-24)
    //  Levels 95, 100, 105, 110, 115, 120
    //  Each has a unique quantum-physics mechanic (see _updateW4BossAbility)
    // ═══════════════════════════════════════════════════════
    // Boss 19 (Level 95): Proton Crusher — 3 quark cores must all be destroyed within 5s window
    19: {
        name: 'Proton Crusher',
        totalWidth: 200, totalHeight: 180,
        baseHP: 180,
        score: 8000,
        speed: 32,
        movePattern: 'weave',
        color: '#ff3366',
        w4ability: 'quarkConfinement',
        parts: [
            // Three quark cores — must all die within 5s or surviving ones regenerate
            {
                role: 'core', offsetX: -40, offsetY: -10, width: 45, height: 45, health: 60,
                spriteKey: 'boss19_core_r', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 145, quarkColor: 'red'
            },
            {
                role: 'core', offsetX: 40, offsetY: -10, width: 45, height: 45, health: 60,
                spriteKey: 'boss19_core_g', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 145, quarkColor: 'green'
            },
            {
                role: 'core', offsetX: 0, offsetY: 25, width: 45, height: 45, health: 60,
                spriteKey: 'boss19_core_b', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 145, quarkColor: 'blue'
            },
            // Gluon turrets orbiting between quarks
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 22, height: 22, health: 15,
                spriteKey: 'boss19_gluon', orbitRadius: 65, orbitAngle: 0, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 22, height: 22, health: 15,
                spriteKey: 'boss19_gluon', orbitRadius: 65, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 130
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 22, height: 22, health: 15,
                spriteKey: 'boss19_gluon', orbitRadius: 65, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 1.8,
                canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 130
            },
            {
                role: 'arm', offsetX: -70, offsetY: 30, width: 38, height: 55, health: 20,
                spriteKey: 'boss19_arm', bobAmplitude: 4, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: 70, offsetY: 30, width: 38, height: 55, health: 20,
                spriteKey: 'boss19_arm', bobAmplitude: 4, bobSpeed: 1.5
            },
        ]
    },

    // Boss 20 (Level 100): Electroweak Unifier — alternates EM phase (fast aimed shots) and Weak phase (slow AOE)
    20: {
        name: 'Electroweak Unifier',
        totalWidth: 220, totalHeight: 200,
        baseHP: 240,
        score: 10000,
        speed: 35,
        movePattern: 'sweep',
        color: '#ffaa22',
        w4ability: 'electroweakPhase',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 240,
                spriteKey: 'boss20_core', canShoot: true, shootRate: 2, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 110
            },
            // EM turrets — active in EM phase
            {
                role: 'turret', offsetX: -70, offsetY: -30, width: 30, height: 30, health: 22,
                spriteKey: 'boss20_em', canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3, phase: 'em'
            },
            {
                role: 'turret', offsetX: 70, offsetY: -30, width: 30, height: 30, health: 22,
                spriteKey: 'boss20_em', canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3, phase: 'em'
            },
            // Weak turrets — active in Weak phase (slow but big spread)
            {
                role: 'turret', offsetX: -50, offsetY: 30, width: 32, height: 32, health: 22,
                spriteKey: 'boss20_weak', canShoot: true, shootRate: 3, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 90, phase: 'weak'
            },
            {
                role: 'turret', offsetX: 50, offsetY: 30, width: 32, height: 32, health: 22,
                spriteKey: 'boss20_weak', canShoot: true, shootRate: 3, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 90, phase: 'weak'
            },
            {
                role: 'shield', offsetX: 0, offsetY: -60, width: 110, height: 22, health: 30,
                spriteKey: 'boss20_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -80, offsetY: 40, width: 42, height: 60, health: 25,
                spriteKey: 'boss20_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 80, offsetY: 40, width: 42, height: 60, health: 25,
                spriteKey: 'boss20_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },

    // Boss 21 (Level 105): Gluon Overlord — 8 color-charge turrets; pairs share damage resist
    21: {
        name: 'Gluon Overlord',
        totalWidth: 230, totalHeight: 210,
        baseHP: 280,
        score: 11000,
        speed: 30,
        movePattern: 'slowSweep',
        color: '#33ff88',
        w4ability: 'colorCharge',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 280,
                spriteKey: 'boss21_core', canShoot: true, shootRate: 2.2, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 115
            },
            // 8 color-charge turrets orbiting — paired by color
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 80, orbitAngle: 0, orbitSpeed: 1.4,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 0
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 80, orbitAngle: Math.PI, orbitSpeed: 1.4,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 0
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 80, orbitAngle: Math.PI / 2, orbitSpeed: 1.4,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 1
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 80, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 1.4,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 1
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 55, orbitAngle: Math.PI / 4, orbitSpeed: -1.2,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 2
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 55, orbitAngle: Math.PI * 5 / 4, orbitSpeed: -1.2,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 2
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 55, orbitAngle: Math.PI * 3 / 4, orbitSpeed: -1.2,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 3
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 24, height: 24, health: 18,
                spriteKey: 'boss21_charge', orbitRadius: 55, orbitAngle: Math.PI * 7 / 4, orbitSpeed: -1.2,
                canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150, chargeColor: 3
            },
            {
                role: 'arm', offsetX: -85, offsetY: 40, width: 44, height: 65, health: 28,
                spriteKey: 'boss21_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
            {
                role: 'arm', offsetX: 85, offsetY: 40, width: 44, height: 65, health: 28,
                spriteKey: 'boss21_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
        ]
    },

    // Boss 22 (Level 110): Higgs Manifestation — mass field wells pull player + bullets, weakpoints exposed when fields active
    22: {
        name: 'Higgs Manifestation',
        totalWidth: 240, totalHeight: 220,
        baseHP: 320,
        score: 12000,
        speed: 22,
        movePattern: 'slowSweep',
        color: '#ffd700',
        w4ability: 'massWell',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 320,
                spriteKey: 'boss22_core', canShoot: true, shootRate: 2.5, shootPattern: 'radial', bulletCount: 14, bulletSpeed: 100
            },
            // Two mass wells — generate gravity zones that pull player
            {
                role: 'turret', offsetX: -65, offsetY: -20, width: 34, height: 34, health: 25,
                spriteKey: 'boss22_well', canShoot: true, shootRate: 3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 110, isWell: true
            },
            {
                role: 'turret', offsetX: 65, offsetY: -20, width: 34, height: 34, health: 25,
                spriteKey: 'boss22_well', canShoot: true, shootRate: 3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 110, isWell: true
            },
            // Weakpoints only exposed during mass field phase
            {
                role: 'weakpoint', offsetX: -45, offsetY: 55, width: 26, height: 26, health: 18,
                spriteKey: 'boss22_weak', score: 600
            },
            {
                role: 'weakpoint', offsetX: 45, offsetY: 55, width: 26, height: 26, health: 18,
                spriteKey: 'boss22_weak', score: 600
            },
            {
                role: 'shield', offsetX: 0, offsetY: -70, width: 120, height: 24, health: 32,
                spriteKey: 'boss22_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -90, offsetY: 45, width: 48, height: 68, health: 30,
                spriteKey: 'boss22_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 90, offsetY: 45, width: 48, height: 68, health: 30,
                spriteKey: 'boss22_arm', bobAmplitude: 5, bobSpeed: 1.2
            },
        ]
    },

    // Boss 23 (Level 115): Antimatter Sovereign — mirror boss; left half and right half, damage one → other heals unless hit together
    23: {
        name: 'Antimatter Sovereign',
        totalWidth: 250, totalHeight: 210,
        baseHP: 360,
        score: 13000,
        speed: 34,
        movePattern: 'erratic',
        color: '#cc44ff',
        w4ability: 'antimatterMirror',
        parts: [
            // Matter core (left)
            {
                role: 'core', offsetX: -45, offsetY: 0, width: 60, height: 60, health: 180,
                spriteKey: 'boss23_matter', canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 140, half: 'matter'
            },
            // Antimatter core (right)
            {
                role: 'core', offsetX: 45, offsetY: 0, width: 60, height: 60, health: 180,
                spriteKey: 'boss23_anti', canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 140, half: 'anti'
            },
            // Left turrets
            {
                role: 'turret', offsetX: -85, offsetY: -30, width: 28, height: 28, health: 20,
                spriteKey: 'boss23_turret_m', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 165, half: 'matter'
            },
            {
                role: 'turret', offsetX: -60, offsetY: 40, width: 28, height: 28, health: 20,
                spriteKey: 'boss23_turret_m', canShoot: true, shootRate: 2.2, shootPattern: 'rapid', bulletSpeed: 160, bulletCount: 2, half: 'matter'
            },
            // Right turrets
            {
                role: 'turret', offsetX: 85, offsetY: -30, width: 28, height: 28, health: 20,
                spriteKey: 'boss23_turret_a', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 165, half: 'anti'
            },
            {
                role: 'turret', offsetX: 60, offsetY: 40, width: 28, height: 28, health: 20,
                spriteKey: 'boss23_turret_a', canShoot: true, shootRate: 2.2, shootPattern: 'rapid', bulletSpeed: 160, bulletCount: 2, half: 'anti'
            },
            // Central shield
            {
                role: 'shield', offsetX: 0, offsetY: -65, width: 130, height: 24, health: 35,
                spriteKey: 'boss23_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'arm', offsetX: -95, offsetY: 42, width: 46, height: 65, health: 28,
                spriteKey: 'boss23_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
            {
                role: 'arm', offsetX: 95, offsetY: 42, width: 46, height: 65, health: 28,
                spriteKey: 'boss23_arm', bobAmplitude: 5, bobSpeed: 1.3
            },
        ]
    },

    // Boss 24 (Level 120): Grand Unified Theory — final W4 boss, cycles through 4 fundamental forces
    24: {
        name: 'Grand Unified Theory',
        totalWidth: 270, totalHeight: 250,
        baseHP: 450,
        score: 16000,
        speed: 36,
        movePattern: 'erratic',
        color: '#ffffff',
        w4ability: 'grandUnification',
        parts: [
            {
                role: 'core', offsetX: 0, offsetY: 0, width: 100, height: 100, health: 450,
                spriteKey: 'boss24_core', canShoot: true, shootRate: 1.2, shootPattern: 'radial', bulletCount: 16, bulletSpeed: 125
            },
            // 4 force turrets — each represents a fundamental force
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 28,
                spriteKey: 'boss24_gravity', orbitRadius: 95, orbitAngle: 0, orbitSpeed: 1.6,
                canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160, force: 'gravity'
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 28,
                spriteKey: 'boss24_em', orbitRadius: 95, orbitAngle: Math.PI / 2, orbitSpeed: 1.6,
                canShoot: true, shootRate: 1.5, shootPattern: 'rapid', bulletSpeed: 190, bulletCount: 3, force: 'em'
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 28,
                spriteKey: 'boss24_weak', orbitRadius: 95, orbitAngle: Math.PI, orbitSpeed: 1.6,
                canShoot: true, shootRate: 3, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 95, force: 'weak'
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 32, height: 32, health: 28,
                spriteKey: 'boss24_strong', orbitRadius: 95, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 1.6,
                canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 140, force: 'strong'
            },
            // Inner orbit ring
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 20,
                spriteKey: 'boss24_inner', orbitRadius: 60, orbitAngle: Math.PI / 4, orbitSpeed: -2,
                canShoot: true, shootRate: 2.2, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 20,
                spriteKey: 'boss24_inner', orbitRadius: 60, orbitAngle: Math.PI * 3 / 4, orbitSpeed: -2,
                canShoot: true, shootRate: 2.2, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 20,
                spriteKey: 'boss24_inner', orbitRadius: 60, orbitAngle: Math.PI * 5 / 4, orbitSpeed: -2,
                canShoot: true, shootRate: 2.2, shootPattern: 'aimed', bulletSpeed: 170
            },
            {
                role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 20,
                spriteKey: 'boss24_inner', orbitRadius: 60, orbitAngle: Math.PI * 7 / 4, orbitSpeed: -2,
                canShoot: true, shootRate: 2.2, shootPattern: 'aimed', bulletSpeed: 170
            },
            // Shields — front and flanks
            {
                role: 'shield', offsetX: 0, offsetY: -80, width: 140, height: 26, health: 40,
                spriteKey: 'boss24_shield', bobAmplitude: 3, bobSpeed: 1.5
            },
            {
                role: 'shield', offsetX: -65, offsetY: -60, width: 36, height: 20, health: 22,
                spriteKey: 'boss24_shield2'
            },
            {
                role: 'shield', offsetX: 65, offsetY: -60, width: 36, height: 20, health: 22,
                spriteKey: 'boss24_shield2'
            },
            // Weakpoints
            {
                role: 'weakpoint', offsetX: -50, offsetY: 60, width: 28, height: 28, health: 20,
                spriteKey: 'boss24_weak', score: 600
            },
            {
                role: 'weakpoint', offsetX: 50, offsetY: 60, width: 28, height: 28, health: 20,
                spriteKey: 'boss24_weak', score: 600
            },
            {
                role: 'arm', offsetX: -100, offsetY: 48, width: 52, height: 72, health: 38,
                spriteKey: 'boss24_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
            {
                role: 'arm', offsetX: 100, offsetY: 48, width: 52, height: 72, health: 38,
                spriteKey: 'boss24_arm', bobAmplitude: 6, bobSpeed: 1.2
            },
        ]
    }
};

export { BOSS_DEFS };