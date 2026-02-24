/**
 * FontConfig — centralized font definitions for Space Shooter 2.
 *
 * THREE font families, each with a helper that builds a `ctx.font` string:
 *
 *   TITLE  – big cinematic text (game name, GAME OVER, LEVEL CLEAR, world names)
 *   UI     – interface text (HUD, descriptions, subtitles, skip hints, perk names)
 *   MONO   – data / technical text (stats, counters, labels, enemy names, warnings)
 *
 * Usage:
 *   import { title, ui, mono } from '../FontConfig.js';
 *   ctx.font = title(32);           // "900 32px 'Segoe UI', …"
 *   ctx.font = title(24, 600);      // "600 24px 'Segoe UI', …"
 *   ctx.font = ui(14);              // "400 14px 'Segoe UI', …"
 *   ctx.font = ui(14, 'bold');      // "bold 14px 'Segoe UI', …"
 *   ctx.font = mono(12);            // "700 12px Consolas, …"
 *   ctx.font = mono(10, 400);       // "400 10px Consolas, …"
 */

// ── Font-family stacks ──────────────────────────────────────────────
export const FAMILY_TITLE = "'Orbitron', 'Segoe UI', sans-serif";
export const FAMILY_UI    = "'Exo 2', 'Segoe UI', sans-serif";
export const FAMILY_MONO  = "'Space Mono', Consolas, monospace";

// ── CSS-compatible stacks (for style.css / inline styles) ───────────
export const CSS_TITLE = FAMILY_TITLE;
export const CSS_UI    = FAMILY_UI;
export const CSS_MONO  = FAMILY_MONO;

// ── Helpers ─────────────────────────────────────────────────────────
/**
 * Build a canvas font string.
 * @param {string} family  Font family stack
 * @param {number} size    Font size in px
 * @param {number|string} weight  CSS weight (400, 700, 900, 'bold', …)
 * @returns {string}  e.g. "900 32px 'Segoe UI', …"
 */
function buildFont(family, size, weight) {
    return `${weight} ${size}px ${family}`;
}

/** Title font — default weight 900 (black). */
export function title(size, weight = 900) {
    return buildFont(FAMILY_TITLE, size, weight);
}

/** UI font — default weight 400 (regular). */
export function ui(size, weight = 400) {
    return buildFont(FAMILY_UI, size, weight);
}

/** Mono font — default weight 700 (bold). */
export function mono(size, weight = 700) {
    return buildFont(FAMILY_MONO, size, weight);
}
