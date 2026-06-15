/**
 * Progress — STORY mode unlocks + per-map best scores, persisted in
 * localStorage (per device). When the ranked backend lands, this will sync
 * to the server so progress follows the account.
 *
 * Model: maps [0 .. unlocked-1] are playable in STORY; finishing map i
 * unlocks map i+1. RANKED ignores unlocks entirely (open to everyone).
 */
const KEY = 'stunt_hill_progress_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* sandboxed iframe → in-session only */ }
}

export const Progress = {
  /** How many maps are unlocked (always ≥ 1: the first map). */
  unlockedCount(total) {
    const p = load();
    return Math.min(Math.max(1, p.unlocked || 1), total);
  },

  isUnlocked(i, total) { return i < this.unlockedCount(total); },

  best(i) {
    const p = load();
    return (p.best && p.best[i]) || 0;
  },

  /** Record a score for map i; returns true if it's a new personal best. */
  setBest(i, score) {
    const p = load();
    p.best = p.best || {};
    if (score > (p.best[i] || 0)) { p.best[i] = score; save(p); return true; }
    return false;
  },

  /**
   * STORY finish on map i → make sure map i+1 is unlocked.
   * Returns the newly unlocked map index, or -1 if nothing new.
   */
  onStoryFinish(i, total) {
    const p = load();
    const cur = Math.max(1, p.unlocked || 1);
    const want = Math.min(total, i + 2);
    if (want > cur) { p.unlocked = want; save(p); return want - 1; }
    return -1;
  },
};
