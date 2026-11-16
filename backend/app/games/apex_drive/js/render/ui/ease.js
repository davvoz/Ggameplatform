/** Easing curves and timing helpers for the UI's animations: t in 0..1 -> 0..1. */

export const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** How far an animation that starts at `start` and lasts `duration` is at `time`, 0..1. */
export function progress(time, start, duration) {
    return clamp01((time - start) / duration);
}

export const ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - (1 - t) ** 3,
    inCubic: (t) => t ** 3,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    /** Overshoots a little, then settles: things landing. */
    outBack: (t) => {
        const c = 1.70158;
        return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
    },
    /** A springy landing. */
    outElastic: (t) => {
        if (t === 0 || t === 1) return t;
        return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
};

/** On for half of every period: blinking text. */
export function blink(time, period = 0.8) {
    return time % period < period / 2;
}

/** A value counted up from `from` to `to` over `duration` seconds from `start` (whole numbers). */
export function countUp(time, start, duration, from, to) {
    return Math.round(from + (to - from) * ease.outCubic(progress(time, start, duration)));
}
