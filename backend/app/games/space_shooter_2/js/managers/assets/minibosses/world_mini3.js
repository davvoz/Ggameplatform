import {
    generateMiniBossCore,
    createSerratedBladeSprite,
    createMiniBossTurretSprite,
    createMiniBossCoreSprite,
    generateShieldSprite,
    createTurretSprite,
    createHexagonalCrystal,
    createDiamondShard,
    generateMiniBossBody,
    createMiniBossBlade,
    drawMiniBossShield
} from "./utils/world_mini3_utils.js";
// ═══════════════════════════════════════════════
//  WORLD 3 MINI-BOSSES — Simulation Break
// ═══════════════════════════════════════════════

// ── MINI-BOSS 9: Glitch Core (cyan, fast digital insectoid) ──
export function _genMiniBoss9Sprites(sprites) {
    const color = '#00ccbb', accent = '#44ffee', dark = '#006655';
    // Core (55x55 → 71x71) — Cute angry digital bug face with antennae
    generateMiniBossCore(accent, color, dark, sprites);
    // Blade (22x35 → 32x45) — Serrated glitch blade with energy edge
    createSerratedBladeSprite(accent, color, dark, sprites);
    // Turret (20x20 → 30x30) — Mini terminal dot screen
    createMiniBossTurretSprite(accent, sprites);
}

// ── MINI-BOSS 10: Broken Renderer (purple, heavy shielded GPU) ──
export function _genMiniBoss10Sprites(sprites) {
    const color = '#7733ee', accent = '#aa66ff', dark = '#441199';
    // Core (60x60 → 76x76) — Broken GPU/monitor with cracked screen and dizzy face
    createMiniBossCoreSprite(color, accent, sprites);
    // Shield (70x18 → 82x30) — Firewall shield with lock icon
    generateShieldSprite(dark, accent, sprites);
    // Turret (24x24 → 34x34) — Pixel cannon with crosshair
    createTurretSprite(accent, dark, sprites);
}


// ── MINI-BOSS 11: Fragment Swarm (magenta, orbiting crystal mother) ──
export function _genMiniBoss11Sprites(sprites) {
    const color = '#ee2266', accent = '#ff5599', dark = '#881133';
    // Core (50x50 → 66x66) — Cracked crystal face with angry expression
    createHexagonalCrystal(color, accent, dark, sprites);
    // Orb (20x20 → 30x30) — Orbiting crystal shard with faceted glow
    createDiamondShard(accent, color, dark, sprites);
}


// ── MINI-BOSS 12: Mirror Guardian (silver, aggressive reflective sentinel) ──
export function _genMiniBoss12Sprites(sprites) {
    const color = '#aaaaee', accent = '#ddddff', dark = '#555588';
    // Core (55x55 → 71x71) — Mirror sentinel with single imposing eye
    generateMiniBossBody(color, dark, sprites);
    // Arm (24x34 → 34x44) — Mirror blade arm with reflective edge
    createMiniBossBlade(dark, accent, sprites);
    // Shield (60x16 → 72x28) — Mirror plate with shimmer
    drawMiniBossShield(color, sprites);
}