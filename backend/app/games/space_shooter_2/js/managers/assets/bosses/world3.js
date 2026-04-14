import {
    core1,
    turret1,
    shield1,
    arm1,
    core2,
    orb2,
    shield2,
    arm2,
    core3,
    turret3,
    shieldSmall,
    shieldLarge,
    arm3,
    core4,
    turret4,
    orb4,
    shield4,
    arm4,
    core5,
    turret5,
    orb5,
    shield5,
    weakPoint,
    arm5,
    core6,
    turret6,
    orb6,
    shieldLarge6,
    shieldSmall6,
    weakPoint6,
    arm6,
} from './utilities/world3_utils.js';

import { C_HOT_PINK } from '../../../entities/LevelsThemes.js';

// ═══════════════════════════════════════════════
//  WORLD 3 BOSSES — Simulation Break
//  Theme: corrupted digital, glitch blocks, neon outlines, scanlines
// ═══════════════════════════════════════════════



// ── BOSS 13: Corrupted Compiler (teal, crashed computer) ──
export function _genBoss13Sprites(sprites) {
    const color = '#00ccbb', accent = '#44ffee', dark = '#006655';
    // Core (75x75 → 95x95) — Cartoon crashed monitor with angry face
    core1(color, accent, dark, sprites);
    // Turret (32x32 → 44x44) — Error popup window with ⚠ warning icon
    turret1(dark, accent, sprites);
    // Shield (100x22 → 112x34) — Hazard stripe error barrier
    shield1(dark, accent, sprites);
    // Arm (38x50 → 50x62) — Keyboard bracket key { }
    arm1(color, dark, accent, sprites);
}


// ── BOSS 14: Fragment King (magenta/pink, jagged crystal crown) ──
export function _genBoss14Sprites(sprites) {
    const color = '#ee2266', accent = '#ff5599', dark = '#881133';
    // Core (80x80 → 100x100) — Jagged crystal crown with menacing face
    core2(color, accent, dark, sprites);
    // Orb (28x28 → 40x40) — Faceted diamond crystal shard
    orb2(accent, color, dark, sprites);
    // Shield (110x24 → 122x36) — Segmented crystal wall with spikes
    shield2(accent, color, dark, sprites);
    // Arm (40x55 → 52x67) — Sharp crystal blade with facet glow
    arm2(accent, color, dark, sprites);
}


// ── BOSS 15: Mirror Engine (silver/blue, reflective prism) ──
export function _genBoss15Sprites(sprites) {
    const color = '#aaaaee', accent = '#ddddff';
    // Core (85x85 → 105x105) — Mirror heptagonal with prismatic stripe
    core3(color, sprites);
    // Turret (34x34 → 46x46) — Prismatic lens with rainbow iris ring
    turret3(accent, color, sprites);
    // Shield small (35x20 → 47x32) — Hexagonal mirror medallion
    shieldSmall(color, sprites);
    // Shield large (90x22 → 102x34) — Long reflective plate with prismatic line
    shieldLarge(color, sprites);
    // Arm (42x58 → 54x70) — Triangular prism with rainbow bottom edge
    arm3(color, accent, sprites);
}


// ── BOSS 16: Chaos Generator (orange, fiery chaotic) ──
export function _genBoss16Sprites(sprites) {
    const color = '#ee7700', accent = '#ffaa44', dark = '#884400';
    // Core (90x90 → 110x110) — Octagonal with chaos rune symbols
    core4(color, dark, accent, sprites);
    // Turret (36x36 → 48x48) — Gear/cog shape with fire-eye center
    turret4(accent, color, dark, sprites);
    // Orb (28x28 → 40x40) — Chaos fire star
    orb4(accent, color, sprites);
    // Shield (120x25 → 132x37) — Zigzag sawtooth energy wall
    shield4(dark, accent, sprites);
    // Arm (44x62 → 56x74) — Flame tentacle with ember glow
    arm4(accent, dark, sprites);
}


// ── BOSS 17: Data Devourer (purple, menacing digital maw) ──
export function _genBoss17Sprites(sprites) {
    const color = '#7733ee', accent = '#aa66ff', dark = '#441199';
    // Core (92x92 → 112x112) — Digital maw with pixel teeth
    core5(color, dark, accent, sprites);
    // Turret (38x38 → 50x50) — Fang/jaw turret with teeth
    turret5(accent, color, dark, sprites);
    // Orb (30x30 → 42x42) — Data packet cube with binary grid
    orb5(color, accent, dark, sprites);
    // Shield (125x24 → 137x36) — Pixel teeth barrier
    shield5(dark, accent, sprites);
    // Weakpoint (24x24 → 36x36) — Spiral hunger vortex core
    weakPoint(color, dark, accent, sprites);
    // Arm (46x65 → 58x77) — Segmented tentacle with suction rings
    arm5(color, dark, accent, sprites);
}


// ── BOSS 18: The Kernel (red/crimson, ultimate simulation boss) ──
export function _genBoss18Sprites(sprites) {
    const color = '#dd0033', accent = C_HOT_PINK, dark = '#880022';
    // Core (100x100 → 120x120) — Ultimate star boss with multi-eyed face
    core6(color, dark, accent, sprites);
    // Turret (40x40 → 52x52) — Crown spike with embedded ruby gem
    turret6(accent, color, dark, sprites);
    // Orb (32x32 → 44x44) — Command sigil orb with rune marks
    orb6(color, dark, accent, sprites);
    // Shield large (140x28 → 152x40) — Command terminal bar
    shieldLarge6(accent, sprites);
    // Shield small (32x18 → 44x30) — Power conduit hexagonal node
    shieldSmall6(dark, accent, sprites);
    // Weakpoint (26x26 → 38x38) — Critical error core with crosshair
    weakPoint6(dark, sprites);
    // Arm (50x70 → 62x82) — Royal pillar with energy ring bands
    arm6(dark, accent, color, sprites);
}


