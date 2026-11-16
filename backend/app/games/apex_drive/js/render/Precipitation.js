import { Rng } from '../core/Rng.js';

/**
 * What falls from the sky, drawn over the race in the frame's pixels: each
 * kind of config/Weather.js `particles` is a class here. Drops start from a
 * seeded generator and move with the time between frames, so a paused race
 * (whose clock stops) shows still rain.
 *
 * A new kind: a class with `draw(ctx, size, clock, motion)` (a Falling one
 * moves for free) and its name in KINDS.
 *
 * @typedef {{speed: number, horizon: number}} Motion
 *   speed 0..1 of the car; horizon: the horizon row (where the road comes from)
 */
const SEED = 9137;
/** Longest frame gap moved in one go (a stall should not fling the rain). */
const MAX_STEP = 0.1;

/**
 * Particles moving as the 16-bit racers showed rain and snow: standing still
 * they fall, slanted by the wind; driving, they stream out from the point
 * the road comes from, faster the faster one goes, so the weather and the
 * road move the same way and the eye has one motion to follow. A kind
 * draws them its own way (and may sway them: `sway`).
 */
class Falling {
    config;
    #rng = new Rng(SEED);
    #drops = [];
    #clock = null;
    #size = null;

    constructor(config) {
        this.config = config;
    }

    /**
     * Moves every particle by the time since the last frame and hands the
     * ones on screen to `each(drop, vx, vy)` (pixels a second).
     * @param {{width: number, height: number}} size @param {number} clock @param {Motion} motion
     */
    move(size, clock, { speed, horizon }, each) {
        if (this.#size?.width !== size.width || this.#size?.height !== size.height) this.#scatter(size);
        const dt = this.#clock === null ? 0 : Math.min(MAX_STEP, Math.max(0, clock - this.#clock));
        this.#clock = clock;
        const { width, height } = size;
        const from = { x: width / 2, y: horizon };
        for (const drop of this.#drops) {
            const [vx, vy] = this.#velocity(drop, from, height, speed, clock);
            drop.x += vx * dt;
            drop.y += vy * dt;
            if (drop.x < -8 || drop.x > width + 8 || drop.y > height + 8) this.#respawn(drop, size, from, speed);
            else each(drop, vx, vy);
        }
    }

    /** Pixels a second: falling (the wind, a sway), plus the flow away from the road's far end. */
    #velocity(drop, from, height, speed, clock) {
        const { fall, slant, flow, sway = 0, swayRate = 0 } = this.config;
        const down = fall * height * drop.near;
        const away = flow * speed * drop.near;
        const swing = sway ? Math.sin(clock * swayRate + drop.phase) * sway * height * drop.near : 0;
        return [(drop.x - from.x) * away + down * slant + swing, down + (drop.y - from.y) * away];
    }

    #scatter(size) {
        this.#size = { ...size };
        this.#drops = Array.from({ length: this.config.count }, (_, i) => ({
            x: this.#rng.next() * size.width,
            y: this.#rng.next() * size.height,
            near: this.#rng.range(0.55, 1),
            phase: i * 1.7,
        }));
    }

    /** A new drop: from the top standing still, more and more from round the road's far end at speed. */
    #respawn(drop, { width, height }, from, speed) {
        const rng = this.#rng;
        if (rng.chance(speed * 0.8)) {
            drop.x = from.x + rng.range(-0.5, 0.5) * width;
            drop.y = from.y + rng.range(-0.6, 0.4) * height * 0.5;
        } else {
            drop.x = rng.next() * width;
            drop.y = -rng.range(0, 10);
        }
        drop.near = rng.range(0.55, 1);
    }
}

/** Rain: streaks, longer at speed, splashes on the road, and lightning in a storm. */
class Rain extends Falling {
    /** @param {CanvasRenderingContext2D} ctx @param {{width: number, height: number}} size @param {number} clock @param {Motion} motion */
    draw(ctx, size, clock, motion) {
        ctx.fillStyle = this.config.color;
        this.move(size, clock, motion, (drop, vx, vy) => streak(ctx, drop, vx, vy, this.#length(drop, motion.speed)));
        this.#splashes(ctx, size.width, size.height, clock, motion.horizon);
        if (this.config.lightning) lightning(ctx, size, clock, this.config.lightning);
    }

    #length(drop, speed) {
        const [still, fast] = this.config.length;
        return Math.max(2, Math.round((still + (fast - still) * speed) * drop.near));
    }

    /** Each splash shows for `splashTime`, then lands somewhere else on the ground. */
    #splashes(ctx, width, height, clock, horizon) {
        const { splashes, splashTime } = this.config;
        const ground = height - horizon;
        for (let i = 0; i < splashes; i++) {
            const cycle = Math.floor(clock / splashTime + i * 0.37);
            const rng = new Rng(cycle * 7919 + i * 104729 + 1);
            const depth = 0.3 + 0.65 * rng.next();
            const x = Math.round(width / 2 + (rng.next() - 0.5) * width * depth * 1.4);
            const y = Math.round(horizon + ground * depth);
            const wide = depth > 0.6 ? 2 : 1;
            ctx.fillRect(x - wide, y, wide * 2 + 1, 1);
            ctx.fillRect(x - wide - 1, y - 1, 1, 1);
            ctx.fillRect(x + wide + 1, y - 1, 1, 1);
        }
    }
}

/**
 * Snow: flakes swaying down, the nearest ones bigger and brighter; at speed
 * they stream past as short streaks. In a blizzard gusts whiten the screen.
 */
class Snow extends Falling {
    /** @param {CanvasRenderingContext2D} ctx @param {{width: number, height: number}} size @param {number} clock @param {Motion} motion */
    draw(ctx, size, clock, motion) {
        const { color, far, streak: longest } = this.config;
        this.move(size, clock, motion, (drop, vx, vy) => {
            const near = drop.near > 0.85;
            ctx.fillStyle = near ? color : far;
            const length = Math.round(motion.speed * longest * drop.near);
            if (length >= 2) streak(ctx, drop, vx, vy, length);
            else ctx.fillRect(Math.round(drop.x), Math.round(drop.y), near ? 2 : 1, near ? 2 : 1);
        });
        if (this.config.gust) gust(ctx, size, clock, this.config.gust);
    }
}

/** A gust every `every` seconds: white rising over everything and clearing again in `length` seconds. */
function gust(ctx, { width, height }, clock, { every, length, alpha, color }) {
    const t = clock % every;
    if (t >= length) return;
    const [r, g, b] = color;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * Math.sin((Math.PI * t) / length)).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
}

/** A double white flash at the start of every `every` seconds (a stopped clock holds it). */
function lightning(ctx, { width, height }, clock, { every, alpha }) {
    const t = clock % every;
    const lit = t < 0.07 || (t > 0.14 && t < 0.22);
    if (!lit) return;
    ctx.fillStyle = `rgba(235, 240, 255, ${alpha})`;
    ctx.fillRect(0, 0, width, height);
}

/** A drop as a line of single pixels, from where it is back along where it came from. */
function streak(ctx, drop, vx, vy, length) {
    const speed = Math.hypot(vx, vy) || 1;
    const [dx, dy] = [vx / speed, vy / speed];
    for (let i = 0; i < length; i++) ctx.fillRect(Math.round(drop.x - dx * i), Math.round(drop.y - dy * i), 1, 1);
}

const KINDS = { rain: Rain, snow: Snow };

/** @param {object|null} particles a weather's `particles` @returns {{draw: Function}|null} */
export function precipitationOf(particles) {
    if (!particles) return null;
    const Kind = KINDS[particles.kind];
    if (!Kind) throw new Error(`No precipitation called ${particles.kind}`);
    return new Kind(particles);
}
