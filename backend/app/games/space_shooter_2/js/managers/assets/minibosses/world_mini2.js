import {
    generateCore5,
    generateVineSprite,
    drawMiniBossStructure,
    drawMiniBossClaw,
    renderTurretSprite,
    drawMiniBossCore,
    createMiniBossOrb,
    generateMiniBossBase,
    createMiniBossShield,
    createMiniBossTurretSprite
} from './utils/world_mini2_utils.js';

// ═══════════════════════════════════════════════════
//  WORLD 2 MINI-BOSSES — 4 unique planetary types
// ═══════════════════════════════════════════════════

// ── MINI-BOSS 5: Vine Sentinel (green, organic, jungle) ──
export function _genMiniBoss5Sprites(sprites) {
    const color = '#33aa55', accent = '#66dd88', dark = '#117733';
    // Core (55x55, pad=8 → 71x71)
    generateCore5(color, dark, accent, sprites);
    // Vine (22x35, pad=5 → 32x45) — whip tendril
    generateVineSprite(dark, accent, sprites);
}
// ── MINI-BOSS 8: Rust Hulk (rusty brown, mechanical junk titan) ──
export function _genMiniBoss8Sprites(sprites) {
    const color = '#99775a', accent = '#ccaa88', dark = '#664433';
    // Core (55x55, pad=8 → 71x71)
    drawMiniBossStructure(color, dark, sprites);
    // Claw (24x32, pad=5 → 34x42) — scrap claw arm
    drawMiniBossClaw(dark, accent, color, sprites);
    // Turret (22x22, pad=5 → 32x32)
    renderTurretSprite(accent, sprites);
}
// ── MINI-BOSS 6: Magma Sprite (orange, fiery, fast) ──
export function _genMiniBoss6Sprites(sprites) {
    const color = '#ff6600', accent = '#ff9944', dark = '#aa3300';
    // Core (50x50, pad=8 → 66x66)
    drawMiniBossCore(color, sprites);
    // Orb (20x20, pad=5 → 30x30) — orbiting fire ball
    createMiniBossOrb(accent, dark, sprites);
}
// ── MINI-BOSS 7: Cryo Colossus (ice blue, slow, fortified) ──
export function _genMiniBoss7Sprites(sprites) {
    const color = '#55ccff', accent = '#88eeff';
    // Core (60x60, pad=8 → 76x76)
    generateMiniBossBase(color, sprites);
    // Shield (65x18, pad=4 → 73x26)
    createMiniBossShield(sprites);
    // Turret (24x24, pad=5 → 34x34)
    createMiniBossTurretSprite(accent, sprites);
}
