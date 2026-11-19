import { NitroFlame } from './art/NitroFlame.js';
import { posesOf } from './art/poses.js';
import { makeCanvas } from './canvas.js';

/**
 * Turns a car of config/Cars.js into ready sprites: every pose (straight,
 * and each turning one drawn by hand, both ways) x tread frame x tail
 * lights (off, brake), painted once, in the car's own colours or a rival's
 * (`colors` replaces letters). The poses' rows come from art/poses.js; which
 * one to draw is the caller's (art/lean.js follows the steering).
 * Later the sprites will be painted from the build (parts and mods).
 */

const TREAD_FRAMES = 2;
/** World units of road per tread frame. */
const TREAD_STEP = 90;
const SHADOW = 'rgba(10, 6, 20, 0.45)';
const FLAME = ['#ffd34a', '#ff7a2a'];
const SHIELD = ['#5ad8ff', '#f2eef6'];

/** The letter shown on a wheel's tread column: the grey stripes move one row each frame. */
function tread(letter, row, frame) {
    if (letter !== 'w' && letter !== 'W') return letter;
    return (row + frame) % 2 === 0 ? 'W' : 'w';
}

/** A pose's rows in a palette, the treads at a frame. */
function paint({ rows, treads }, colors, frame) {
    const { canvas, ctx } = makeCanvas(rows[0].length, rows.length);
    rows.forEach((row, y) => {
        [...row].forEach((letter, x) => {
            const shown = treads.includes(x) ? tread(letter, y, frame) : letter;
            if (shown === '.') return;
            ctx.fillStyle = colors[shown];
            ctx.fillRect(x, y, 1, 1);
        });
    });
    return canvas;
}

function key(pose, frame, brake) {
    return `${pose}:${frame}:${brake}`;
}

export class CarArt {
    #sprites = new Map();
    #poses;
    #nitro = new NitroFlame();
    width;
    height;
    /** Turning poses each side: poses go from -steps (fullest left) to steps. */
    steps;

    /** @param {typeof import('../config/Cars.js').CARS.comet} car @param {Record<string, string>} [colors] */
    constructor(car, colors = {}) {
        const { width, height, steps, poses } = posesOf(car);
        const own = { ...car.colors, ...colors };
        const lights = [own, { ...own, ...car.brakeColors }];
        for (const pose of Object.keys(poses).map(Number)) {
            for (let frame = 0; frame < TREAD_FRAMES; frame++) {
                lights.forEach((palette, brake) => this.#sprites.set(key(pose, frame, brake), paint(poses[pose], palette, frame)));
            }
        }
        this.#poses = poses;
        this.width = width;
        this.height = height;
        this.steps = steps;
    }

    /**
     * The sprite for a car's state.
     * @param {{z: number, braking: boolean}} car
     * @param {{pose?: number, near?: boolean}} [how] pose -steps..steps; near false, far away:
     *   the treads stand still and the car does not turn (a pixel of either, shrunk, would only flicker)
     */
    spriteFor(car, { pose = 0, near = true } = {}) {
        const frame = near ? Math.floor(Math.abs(car.z) / TREAD_STEP) % TREAD_FRAMES : 0;
        return this.#sprites.get(key(near ? pose : 0, frame, car.braking ? 1 : 0));
    }

    /**
     * The car at its native size, centred on cx, wheels on `bottom` (the player's).
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../sim/Car.js').Car} car
     * @param {number} clock seconds, for flickers
     * @param {number} [pose] -steps..steps
     * @param {number|null} [ground] the row its shadow lies on (under a car in the air), null for none
     */
    draw(ctx, cx, bottom, car, clock, pose = 0, ground = bottom) {
        const left = Math.round(cx - this.width / 2);
        const top = Math.round(bottom - this.height);
        if (ground !== null) {
            ctx.fillStyle = SHADOW;
            ctx.fillRect(left + 2, Math.round(ground) - 2, this.width - 4, 3);
        }
        ctx.drawImage(this.spriteFor(car, { pose }), left, top);
        this.#flame(ctx, left, top, car, clock, this.#poses[pose].exhaust);
        if (car.shielded) this.#shield(ctx, left, top, car, clock);
    }

    /** The exhaust: a flicker on the throttle; on nitro, flames (render/art/NitroFlame.js). */
    #flame(ctx, left, top, car, clock, pipes) {
        if (car.boosting) {
            this.#nitro.draw(ctx, { left, top, width: this.width, height: this.height }, pipes, clock);
            return;
        }
        if (!(car.throttle && car.speed > 200)) return;
        const long = 1 + (Math.floor(clock * 30) % 2);
        for (const pipe of pipes) {
            for (let i = 0; i < long; i++) {
                ctx.fillStyle = FLAME[i];
                ctx.fillRect(left + pipe.x, top + pipe.y + 1 + i, 1, 1);
            }
        }
    }

    /** A blinking frame of light around the car; it blinks faster as it runs out. */
    #shield(ctx, left, top, car, clock) {
        const rate = car.shieldTime < 1.2 ? 16 : 6;
        if (Math.floor(clock * rate) % 3 === 0) return;
        ctx.fillStyle = SHIELD[Math.floor(clock * 12) % 2];
        const [x, y, w, h] = [left - 3, top - 3, this.width + 6, this.height + 5];
        ctx.fillRect(x + 2, y, w - 4, 1);
        ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
        ctx.fillRect(x, y + 2, 1, h - 4);
        ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    }
}
