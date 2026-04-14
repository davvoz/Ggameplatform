import {
    generateMiniBossCore,
    generateBladeSprite,
    generateCoreSprite,
    generatePodSprite,
    createMiniBossCoreSprite,
    createMiniBossShieldSprite,
    generateMiniBossTurret,
    drawMiniBossDiamond,
    renderOrbWithGlow,
    renderMiniBossStreaks
} from './utils/world_mini1_utils.js';

// ── MINI-BOSS 1: Scarab Drone (teal, insectoid, agile) ──
export function _genMiniBoss1Sprites(sprites) {
    const color = '#22bbaa', accent = '#44ddcc', dark = '#117766';
    // Core (50x50, pad=8 → 66x66)
    generateMiniBossCore(color, dark, sprites);
    // Blade (20x40, pad=6 → 32x52) — rotating wing
    generateBladeSprite(accent, sprites);
}
// ── MINI-BOSS 4: Inferno Striker (crimson, aggressive) ──
export function _genMiniBoss4Sprites(sprites) {
    const color = '#cc2233', accent = '#ff5544', dark = '#881122';
    // Core (50x50, pad=8 → 66x66)
    generateCoreSprite(color, accent, sprites);
    // Side Pod (22x30, pad=5 → 32x40) — weapon nacelle
    generatePodSprite(dark, sprites);
}
// ── MINI-BOSS 2: Garrison Turret (bronze, fortified, slow) ──
export function _genMiniBoss2Sprites(sprites) {
    const color = '#cc8833', accent = '#eebb55', dark = '#885522';
    // Core (55x55, pad=8 → 71x71)
    createMiniBossCoreSprite(color, dark, sprites);
    // Shield (60x16, pad=4 → 68x24)
    createMiniBossShieldSprite(sprites);
    // Turret (22x22, pad=5 → 32x32)
    generateMiniBossTurret(accent, sprites);
}
// ── MINI-BOSS 3: Phantom Wraith (purple, ethereal, orbiting) ──
export function _genMiniBoss3Sprites(sprites) {
    const color = '#8833cc', accent = '#bb66ff', dark = '#551199';
    // Core (50x50, pad=8 → 66x66)
    drawMiniBossDiamond(color, sprites);
    // Orb (18x18, pad=5 → 28x28) — orbiting will-o-wisp
    renderOrbWithGlow(accent, sprites);
    // Tail (25x35, pad=5 → 35x45) — wispy tendril
    renderMiniBossStreaks(dark, accent, sprites);
}
