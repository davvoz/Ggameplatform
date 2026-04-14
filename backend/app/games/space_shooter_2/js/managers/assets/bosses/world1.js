import {
    core1, turret1, arm1,
    core2, shield2, turret2, arm2,
    core3, orb3, arm3,
    core4, weak4, turret4, shield4, arm4,
    core5, orb5, arm5,
    core6, turret6, orb6, shield6, weak6, arm6
} from './utilities/world1_utils.js';

// ── BOSS 1: Crimson Vanguard (red, angular) ──
export function _genBoss1Sprites(sprites) {
    const color = '#dd2222', accent = '#ff6644', dark = '#881111';
    // Core (70x70, pad=10 → 90x90)
    core1(color, dark, sprites);
    // Turret (30x30, pad=6 → 42x42)
    turret1(accent, sprites);
    // Arm (35x45, pad=6 → 47x57)
    arm1(dark, color, sprites);
}

// ── BOSS 2: Iron Monolith (orange/gold, heavy) ──
export function _genBoss2Sprites(sprites) {
    const color = '#ee7700', accent = '#ffbb44', dark = '#884400';
    // Core (80x80, pad=10 → 100x100)
    core2(color, dark, sprites);
    // Shield (100x25, pad=4 → 108x33)
    shield2(sprites);
    // Turret (35x35, pad=6 → 47)
    turret2(accent, sprites);
    // Arm (40x55, pad=6 → 52x67)
    arm2(dark, color, sprites);
}

// ── BOSS 3: Void Leviathan (purple, ethereal orbs) ──
export function _genBoss3Sprites(sprites) {
    const color = '#7722dd', accent = '#bb77ff', dark = '#441188';
    // Core (75x75, pad=10 → 95)
    core3(color, accent, dark, sprites);
    // Orb (28x28, pad=6 → 40)
    orb3(accent, dark, sprites);
    // Arm (35x50, pad=6 → 47x62)
    arm3(dark, accent, sprites);
}

// ── BOSS 4: Omega Prime (magenta/gold, regal) ──
export function _genBoss4Sprites(sprites) {
    const color = '#dd1177', accent = '#ff77bb', dark = '#880044';
    // Core (85x85, pad=10 → 105)
    core4(color, dark, sprites);
    // Weakpoint (25x25, pad=6 → 37)
    weak4(sprites);
    // Turret (35x35, pad=6 → 47)
    turret4(accent, sprites);
    // Shield (40x20, pad=4 → 48x28)
    shield4(sprites);
    // Arm (40x60, pad=6 → 52x72)
    arm4(dark, color, sprites);
}

// ── BOSS 5: Nemesis (red/black, fast, many orbs) ──
export function _genBoss5Sprites(sprites) {
    const color = '#dd3355', accent = '#ff6688', dark = '#771133';
    // Core (70x70, pad=10 → 90)
    core5(color, dark, sprites);
    // Orb (25-30px, pad=6 → 42)
    orb5(accent, dark, sprites);
    // Arm (30x40, pad=6 → 42x52)
    arm5(dark, color, sprites);
}

// ── BOSS 6: Apocalypse (red/black/orange, final boss, massive) ──
export function _genBoss6Sprites(sprites) {
    const color = '#ff2200', accent = '#ff6633', dark = '#880000';
    // Core (90x90, pad=10 → 110)
    core6(color, dark, sprites);
    // Turret (35x35, pad=6 → 47)
    turret6(accent, sprites);
    // Orb (28x28, pad=6 → 40)
    orb6(accent, dark, sprites);
    // Shield (120x25, pad=4 → 128x33)
    shield6(sprites);
    // Weakpoint (22x22, pad=6 → 34)
    weak6(sprites);
    // Arm (45x65, pad=6 → 57x77)
    arm6(dark, accent, color, sprites);
}


