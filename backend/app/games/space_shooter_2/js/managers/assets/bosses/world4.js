import { //importa tutte le funzioni di utilità per i boss del mondo 4
    generateQuarkCoreSprites,
    createGluonSprite,
    createBoss19ArmSprite,
    createBossCoreSprites,
    generateBoss20EMEffect,
    generateBoss20WeakTurret,
    createBoss20Shield,
    createBossArmCanvas,
    generateBossCrownSprite,
    createGravitationalLens,
    drawHiggsFieldNode,
    drawShieldIndicator,
    drawBossArmWithEffects,
    createBossAura,
    createBossChargeOrb,
    createBossArm,
    generateMatterBossSprites,
    generateAntimatterBossBody,
    generateBoss23TurretMiddle,
    generateBoss23TurretA,
    generateBoss23Shield,
    generateBoss23ArmGraphics,
    generateBoss24CoreSprite,
    generateBoss24GravitySprite,
    generateBoss24EMSprite,
    generateWeakTurretSprite,
    generateBoss24GluonSprite,
    generateBoss24InnerSprite,
    generateBoss24ShieldSpriteLarge,
    generateBoss24ShieldSprite,
    generateBoss24WeakpointSprite,
    generateBoss24ArmSprite,
} from './utilities/world4_utils.js';

import { C_GOLD } from "../../../entities/LevelsThemes.js";

// ═══════════════════════════════════════════════════════════════
//  WORLD 4 — QUANTUM REALM  (Bosses 19-24)
//  Aesthetic: elegant quantum-physics motifs — wave export functions,
//  probability clouds, chromodynamic color, Feynman-diagram lines,
//  concentric orbital shells, iridescent gradients.
// ═══════════════════════════════════════════════════════════════

// ── BOSS 19: Proton Crusher — 3 quark cores (R/G/B) + gluon orbiters ──
export function _genBoss19Sprites(sprites) {
    // Helper to draw a single quark-core face with unique expression per color
    generateQuarkCoreSprites(sprites);
    // Gluon turret — small swirling energy knot
    createGluonSprite(sprites);
    // Arm — curved containment wing with Feynman-diagram lines
    createBoss19ArmSprite(sprites);
}


// ── BOSS 20: Electroweak Unifier — EM/Weak phase duality ──
export function _genBoss20Sprites(sprites) {
    const { accent, dark } = createBossCoreSprites(sprites);
    // EM turret — crackling lightning node
    generateBoss20EMEffect(sprites);
    // Weak turret — soft glowing neutrino-like orb
    generateBoss20WeakTurret(sprites);
    // Shield — phase-transition barrier
    createBoss20Shield(accent, sprites);
    // Arm — force-carrier column with photon/W-boson wiggles
    createBossArmCanvas(dark, accent, sprites);
}

// ── BOSS 21: Gluon Overlord — massive strong-force entity ──
export function _genBoss21Sprites(sprites) {
    const color = '#33ff88', accent = '#88ffbb', dark = '#117744';
    // Core (85x85 → 105x105) — Majestic chromodynamic face
    createBossAura(color, dark, sprites);
    // Charge turret — color-charge orbs
    createBossChargeOrb(accent, color, dark, sprites);
    // Arm — strong-force flux tube
    createBossArm(dark, sprites);
}


// ── BOSS 22: Higgs Manifestation — golden, massive, gravity-well boss ──
export function _genBoss22Sprites(sprites) {
    const color = C_GOLD, accent = '#ffee88', dark = '#886600';
    // Core (90x90 → 110x110) — Regal Higgs face with golden crown-like structure
    generateBossCrownSprite(color, dark, sprites);
    // Mass well turret — gravity distortion node
    createGravitationalLens(color, accent, sprites);
    // Weakpoint — exposed Higgs field node
    drawHiggsFieldNode(accent, color, dark, sprites);
    // Shield — massive gold barrier
    drawShieldIndicator(dark, accent, color, sprites);
    // Arm — massive pillar with gravitational distortion bands
    drawBossArmWithEffects(dark, color, sprites);
}



// ── BOSS 23: Antimatter Sovereign — duality boss, matter vs antimatter ──
export function _genBoss23Sprites(sprites) {
    // Matter core (left) — warm, structured, ordered face
    generateMatterBossSprites(sprites);
    // Antimatter core (right) — chaotic, inverted, distorted face
    generateAntimatterBossBody(sprites);
    // Matter turret — orderly angular
    generateBoss23TurretMiddle(sprites);
    // Antimatter turret — chaotic spiky
    generateBoss23TurretA(sprites);
    // Shield — matter/antimatter barrier
    generateBoss23Shield(sprites);
    // Arm — matter/antimatter hybrid column
    generateBoss23ArmGraphics(sprites);
}



// ── BOSS 24: Grand Unified Theory — the ultimate W4 boss ──
export function _genBoss24Sprites(sprites) {
    // Core (100x100 → 120x120) — Majestic unified-field entity with 4-force mandala face
    generateBoss24CoreSprite(sprites);
    // Gravity turret — dark mass node
    generateBoss24GravitySprite(sprites);
    // EM turret — electric spark node
    generateBoss24EMSprite(sprites);
    // Weak turret — soft purple decay node
    generateWeakTurretSprite(sprites);
    // Strong turret — green flux tube node
    generateBoss24GluonSprite(sprites);
    // Inner orbit turret
    generateBoss24InnerSprite(sprites);
    // Shield large — prismatic barrier
    generateBoss24ShieldSpriteLarge(sprites);
    // Shield small — mini force node
    generateBoss24ShieldSprite(sprites);
    // Weakpoint — unified field crack
    generateBoss24WeakpointSprite(sprites);
    // Arm — universal force pillar with all 4 force bands
    generateBoss24ArmSprite(sprites);
}



