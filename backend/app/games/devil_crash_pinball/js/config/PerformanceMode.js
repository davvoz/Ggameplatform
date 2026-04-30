/**
 * Global render-quality flag.
 *
 * SRP: owns a single boolean (`lowPerf`) and exposes a toggle. The Renderer
 * (and HUD) read it; nobody writes except the user via the HUD PERF button.
 *
 * Persisted to localStorage so the user's choice survives reloads. Default is
 * HIGH performance (lowPerf=false) — full visual fidelity, "as is".
 *
 * When lowPerf is on, the Renderer skips:
 *   - all `shadowBlur` glow (intercepted via ctx setter override)
 *   - parallax stars, flipper ambient wash, scanlines+vignette overlay
 *   - ball trail loop and speed streaks
 */
const STORAGE_KEY = 'devilcrash:lowPerf';

function _readInitial() {
    try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
    } catch (err) {
        console.warn('[PerformanceMode] localStorage read failed; defaulting to high-perf', err);
        return false;
    }
}

function _persist(on) {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, on ? '1' : '0'); }
    catch (err) { console.warn('[PerformanceMode] localStorage write failed; toggle is session-only', err); }
}

export const PerformanceMode = {
    /** @type {boolean} */
    lowPerf: _readInitial(),

    /** Flip the flag and persist it. Returns the new value. */
    toggle() {
        this.lowPerf = !this.lowPerf;
        _persist(this.lowPerf);
        return this.lowPerf;
    },
};
