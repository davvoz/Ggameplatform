/**
 * Global render-quality flag.
 *
 * SRP: owns a single boolean (`lowPerf`) and exposes a toggle. The Renderer
 * (and HUD) read it; nobody writes except the user via the HUD PERF button.
 *
 * In-memory only — the toggle resets to HIGH performance on every page load.
 * No localStorage / cookies / persistence: the game owns no client-side
 * storage. We also evict the legacy `devilcrash:lowPerf` key on first import
 * to clean up after older builds.
 *
 * When lowPerf is on, the Renderer skips:
 *   - all `shadowBlur` glow (intercepted via ctx setter override)
 *   - parallax stars, flipper ambient wash, scanlines+vignette overlay
 *   - ball trail loop and speed streaks
 */
const LEGACY_STORAGE_KEY = 'devilcrash:lowPerf';

// One-shot migration: drop any value left behind by older builds. Best-effort.
try { globalThis.localStorage?.removeItem(LEGACY_STORAGE_KEY); }
catch (err) { console.debug('[PerformanceMode] legacy localStorage cleanup skipped', err); }

export const PerformanceMode = {
    /** @type {boolean} */
    lowPerf: false,

    /** Flip the flag. Returns the new value. Not persisted. */
    toggle() {
        this.lowPerf = !this.lowPerf;
        return this.lowPerf;
    },
};
