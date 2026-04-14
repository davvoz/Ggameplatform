
import { //importa tutte le funzioni di utilità per i mini-boss del mondo 4
    createMiniBossCore,
    createMiniBossOrb,
    generateMiniBossCore,
    createMiniBossShield,
    createMiniBossArm,
    generateMiniBossCore2,
    createMiniBossShield2,
    createTurret2,
    createMiniBossAura,
    createMiniBossPod,
    createMiniBossTurret3,
} from './utils/world_mini4_utils.js';
// ═══════════════════════════════════════════════════════════════
//  WORLD 4 — QUANTUM REALM  (Mini-bosses 13-16)
//  Aesthetic: elegant particle-physics motifs — quark faces,
//  wave-particle duality, Feynman vertices, probability clouds.
// ═══════════════════════════════════════════════════════════════

// ── MINI-BOSS 13: Charm Quark — fast, color-phase cycling ──
export function _genMiniBoss13Sprites(sprites) {
    const color = '#ff5588', accent = '#ff88aa', dark = '#993355';
    // Core (55x55 → 71x71) — Charm quark face with playful malice
    createMiniBossCore(color, accent, dark, sprites);
    // Orb — orbiting charm-phase node
    createMiniBossOrb(accent, dark, sprites);
}


// ── MINI-BOSS 14: Strange Oscillator — 3-state form shifter ──
export function _genMiniBoss14Sprites(sprites) {
    const color = '#55ddff', accent = '#88eeff', dark = '#226688';
    // Core (58x58 → 74x74) — Pulsating strange-quark face with oscillation patterns
    generateMiniBossCore(color, dark, accent, sprites);
    // Shield — oscillation barrier
    createMiniBossShield(dark, accent, sprites);
    // Arm — phase-shifting appendage
    createMiniBossArm(dark, accent, sprites);
}


// ── MINI-BOSS 15: Top Resonance — heavy, rotating shield ──
export function _genMiniBoss15Sprites(sprites) {
    const color = '#ffcc33', accent = '#ffee77', dark = '#886600';
    // Core (50x50 → 66x66) — Resonant face with harmonic patterns
    generateMiniBossCore2(color, dark, accent, sprites);
    // Shield — orbiting resonance plate
    createMiniBossShield2(dark, accent, sprites);
    // Turret — resonance emitter
    createTurret2(accent, dark, sprites);
}


// ── MINI-BOSS 16: Bottom Decayer — splits when destroyed ──
export function _genMiniBoss16Sprites(sprites) {
    const color = '#88ff55', accent = '#bbff88', dark = '#448822';
    // Core (55x55 → 71x71) — Unstable, cracked face about to split
    createMiniBossAura(color, accent, dark, sprites);
    // Pod arm — decay product pod (what splits off)
    createMiniBossPod(dark, accent, sprites);
    // Turret — decay emitter
    createMiniBossTurret3(accent, dark, sprites);
}

