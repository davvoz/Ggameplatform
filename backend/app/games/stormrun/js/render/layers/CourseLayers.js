import { Ink } from '../../config/Palette.js';
import { SimConfig } from '../../config/SimConfig.js';
import { drawSprite } from '../art/Bake.js';
import { OBSTACLE_ART } from '../art/ObstacleArt.js';
import { DROP_ART_HEIGHT } from '../art/PickupArt.js';
import { bakeFlag } from '../art/DecorArt.js';

/** Things placed on the course: drops, obstacles, flags. */

const DROP_WORLD_HEIGHT = 2.7;
const BOB_HEIGHT = 0.18;

export class DropLayer {
    #sprites;

    /** @param {import('../art/Bake.js').Sprite[]} sprites one per rainbow colour */
    constructor(sprites) {
        this.#sprites = sprites;
    }

    draw(ctx, { sim, camera, time }) {
        const { drops } = sim.course;
        const sprite = this.#sprites[Math.min(sim.tank.bands, this.#sprites.length - 1)];
        const artScale = (camera.scale * DROP_WORLD_HEIGHT) / DROP_ART_HEIGHT;
        const left = camera.left - 2;
        const right = camera.right + 2;

        for (const drop of drops) {
            if (drop.x < left || drop.taken) continue;
            if (drop.x > right) break;
            const bob = Math.sin(time * 4 + drop.x * 0.6) * BOB_HEIGHT;
            drawSprite(ctx, sprite, camera.sx(drop.x), camera.sy(drop.y + bob), artScale);
        }
    }
}

export class ObstacleLayer {
    #sprites;

    /** @param {Object<string, import('../art/Bake.js').Sprite>} sprites by obstacle id */
    constructor(sprites) {
        this.#sprites = sprites;
    }

    draw(ctx, { sim, camera }) {
        const left = camera.left - 6;
        const right = camera.right + 6;

        for (const obstacle of sim.course.obstacles) {
            if (obstacle.x < left) continue;
            if (obstacle.x > right) break;
            const { id } = obstacle.type;
            const artScale = (camera.scale * OBSTACLE_ART[id].worldWidth) / OBSTACLE_ART[id].width;
            drawSprite(ctx, this.#sprites[id], camera.sx(obstacle.x), camera.sy(obstacle.y), artScale);
        }
    }
}

const FLAG_ART_SCALE = 0.052;

/** Paper flags on the course: your record and the best of the week. */
export class FlagLayer {
    #flags = [];

    /** @param {{label: string, metres: number, color: string}[]} flags */
    setFlags(flags) {
        const startX = SimConfig.runner.startX;
        this.#flags = flags.map(({ label, metres, color }) => ({
            x: startX + metres,
            sprite: bakeFlag(label, metres, color),
        }));
    }

    draw(ctx, { sim, camera }) {
        const { terrain } = sim.course;
        const artScale = camera.scale * FLAG_ART_SCALE;
        for (const { x, sprite } of this.#flags) {
            if (x < camera.left - 6 || x > camera.right + 2) continue;
            drawSprite(ctx, sprite, camera.sx(x), camera.sy(terrain.heightAt(x)), artScale);
        }
    }
}

const TRAIL_POINTS = 120;
const TRAIL_SPACING = 0.7;
const TRAIL_BAND_WIDTH = 0.3;

/** The paint the blob leaves behind: one stripe for each band it carries. */
export class TrailLayer {
    #rainbow;
    #xs = new Float32Array(TRAIL_POINTS);
    #ys = new Float32Array(TRAIL_POINTS);
    #head = 0;
    #count = 0;

    /** @param {string[]} rainbow */
    constructor(rainbow) {
        this.#rainbow = rainbow;
    }

    reset() {
        this.#count = 0;
        this.#head = 0;
    }

    update({ runnerX, runnerY }) {
        if (this.#count > 0) {
            const last = (this.#head + TRAIL_POINTS - 1) % TRAIL_POINTS;
            if (runnerX - this.#xs[last] < TRAIL_SPACING) return;
        }
        this.#xs[this.#head] = runnerX;
        this.#ys[this.#head] = runnerY + 0.5;
        this.#head = (this.#head + 1) % TRAIL_POINTS;
        this.#count = Math.min(TRAIL_POINTS, this.#count + 1);
    }

    draw(ctx, { sim, camera }) {
        if (this.#count < 2) return;
        const bands = sim.tank.bands;
        const stripes = Math.max(1, bands);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1.5, camera.scale * TRAIL_BAND_WIDTH);
        for (let stripe = 0; stripe < stripes; stripe++) {
            ctx.strokeStyle = bands === 0 ? Ink.body : this.#rainbow[stripe];
            this.#stroke(ctx, camera, (stripe - (stripes - 1) / 2) * TRAIL_BAND_WIDTH);
        }
    }

    #stroke(ctx, camera, offset) {
        ctx.beginPath();
        const start = (this.#head + TRAIL_POINTS - this.#count) % TRAIL_POINTS;
        for (let i = 0; i < this.#count; i++) {
            const index = (start + i) % TRAIL_POINTS;
            const x = camera.sx(this.#xs[index]);
            const y = camera.sy(this.#ys[index] - offset);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}
