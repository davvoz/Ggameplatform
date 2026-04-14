import {
    core1,
    turret1,
    shield1,
    arm1,
    core2,
    turret2,
    orb2,
    arm2,
    shield2,
    core3,
    turret3,
    orb3,
    weak3,
    arm3,
    core4,
    turret4,
    turret4b,
    shield4,
    shield4b,
    arm4,
    core5,
    turret5,
    orb5,
    shield5,
    weak5,
    arm5,
    core6,
    orb6,
    shield6,
    arm6
} from './utilities/world2_utils.js';
// ═══════════════════════════════════════════════════════════════
//  WORLD 2 BOSSES — 6 planetary guardians (Bosses 7–12)
// ═══════════════════════════════════════════════════════════════

// ── BOSS 7: Titanus Rex (green, organic, jungle guardian) ──
export function _genBoss7Sprites(sprites) {
    const color = '#22cc44', accent = '#55ee77', dark = '#117722';
    // Core (85x85 → pad=10 → 105)
    core1(color, dark, sprites);
    // Turret (32x32 → 44)
    turret1(accent, sprites);
    // Arm (40x55 → 52x67)
    arm1(dark, accent, color, sprites);
    // Shield (90x22 → 102x34)
    shield1(sprites);
}

// ── BOSS 8: Magma Colossus (orange/red, volcanic, massive) ──
export function _genBoss8Sprites(sprites) {
    const color = '#ff5500', accent = '#ff8833', dark = '#992200';
    // Core (90x90 → 110)
    core2(color, dark, sprites);
    // Turret (35x35 → 47)
    turret2(accent, sprites);
    // Orb (28x28 → 40) — orbiting magma ball
    orb2(dark, sprites);
    // Arm (45x60 → 57x72)
    arm2(dark, sprites);
    // Shield (110x25 → 122x37)
    shield2(sprites);
}

// ── BOSS 9: Frost Sovereign (ice blue, crystalline, regal) ──
export function _genBoss9Sprites(sprites) {
    const color = '#44bbff', accent = '#88ddff', dark = '#2266aa';
    // Core (80x80 → 100)
    core6(color, sprites);
    // Orb (26x26 → 38) — orbiting ice crystal
    orb6(accent, dark, sprites);
    // Shield (35x18 → 47x30)
    shield6(sprites);
    // Arm (38x50 → 50x62)
    arm6(dark, accent, sprites);
}

// ── BOSS 10: Sandstorm Leviathan (gold/sand, desert titan) ──
export function _genBoss10Sprites(sprites) {
    const color = '#ddaa33', accent = '#eedd88', dark = '#886622';
    // Core (85x85 → 105)
    core3(color, dark, sprites);
    // Turret (35x35 → 47)
    turret3(accent, sprites);
    // Orb (30x30 → 42)
    orb3(accent, dark, sprites);
    // Weakpoint (24x24 → 36)
    weak3(sprites);
    // Arm (42x60 → 54x72)
    arm3(dark, color, sprites);
}

// ── BOSS 11: Omega Construct (metallic blue-grey, mechanical titan) ──
export function _genBoss11Sprites(sprites) {
    const color = '#7799bb', accent = '#aaccdd', dark = '#445566';
    // Core (90x90 → 110)
    core4(color, dark, sprites);
    // Turret (35x35 → 47)
    turret4(accent, sprites);
    // Turret2 (28x28 → 40) — smaller secondary
    turret4b(dark, sprites);
    // Shield (130x25 → 142x37)
    shield4(sprites);
    // Shield2 (30x18 → 42x30) — mini side shields
    shield4b(sprites);
    // Arm (45x65 → 57x77)
    arm4(dark, color, sprites);
}

// ── BOSS 12: Toxin Emperor (toxic green, final W2 boss, massive) ──
export function _genBoss12Sprites(sprites) {
    const color = '#88ee00', accent = '#bbff44', dark = '#449911';
    // Core (95x95 → 115)
    core5(color, sprites);
    // Turret (38x38 → 50)
    turret5(accent, sprites);
    // Orb (30x30 → 42) — orbiting toxic sphere
    orb5(accent, dark, sprites);
    // Shield (130x28 → 142x40)
    shield5(sprites);
    // Weakpoint (24x24 → 36)
    weak5(sprites);
    // Arm (48x68 → 60x80)
    arm5(dark, accent, color, sprites);
}
