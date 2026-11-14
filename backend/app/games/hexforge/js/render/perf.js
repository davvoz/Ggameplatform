/**
 * Performance mode: phones and tablets get a lighter renderer, desktops keep
 * the full one untouched. On by default on touch-only devices; `?perf=on`
 * or `?perf=off` in the address forces it either way (handy for testing).
 *
 * In this mode a frame watcher steps the quality down, never up, when the
 * device keeps missing frames: lower canvas resolution, fewer embers.
 */

const LEVELS = [
    { dpr: 1.5, embers: 30 },
    { dpr: 1.25, embers: 20 },
    { dpr: 1, embers: 12 },
];

export const perf = {
    on: false,
    level: 0,
    get dpr() { return LEVELS[this.level].dpr; },
    get embers() { return LEVELS[this.level].embers; },
    /** One step lower; false when already at the bottom. */
    lower() {
        if (this.level >= LEVELS.length - 1) return false;
        this.level += 1;
        return true;
    },
};

/** Whether this device should run in performance mode. */
export function detectPerf(search = globalThis.location?.search ?? '', media = globalThis.matchMedia) {
    const forced = new URLSearchParams(search).get('perf');
    if (forced === 'on' || forced === '1') return true;
    if (forced === 'off' || forced === '0') return false;
    if (typeof media !== 'function') return false;
    return media('(pointer: coarse)').matches && !media('(any-pointer: fine)').matches;
}

/**
 * Soft canvas glow (shadowBlur): full on desktop, skipped in performance mode,
 * where blurred shadows are among the slowest things a phone can draw. The
 * halos around each glowing part still carry the light.
 */
export function softGlow(ctx, color, blur) {
    if (perf.on) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
}

const LONG_MS = 25;       // a gap longer than this after a drawn frame: under 40 fps
const STALL_MS = 100;     // longer than this is a stall (tab switch, loading), not the renderer

/**
 * Watches the gap between a drawn frame and the next one. Over a window of
 * drawn frames, if too many ran long, it asks for a lower quality, at most
 * once per cooldown and never during the warm-up after boot.
 */
export class FrameWatch {
    constructor({ size = 60, longShare = 0.25, cooldown = 5000, warmup = 3000 } = {}) {
        this.size = size;
        this.longShare = longShare;
        this.cooldown = cooldown;
        this.quietUntil = warmup;
        this.long = 0;
        this.count = 0;
    }

    /** `gap` ms after a drawn frame, at time `now` (ms); true: step the quality down. */
    sample(gap, now) {
        if (now < this.quietUntil || gap > STALL_MS) {
            this.long = 0;
            this.count = 0;
            return false;
        }
        this.count += 1;
        if (gap > LONG_MS) this.long += 1;
        if (this.count < this.size) return false;
        const slow = this.long / this.count > this.longShare;
        this.long = 0;
        this.count = 0;
        if (!slow) return false;
        this.quietUntil = now + this.cooldown;
        return true;
    }
}
