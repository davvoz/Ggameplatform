import { Ink } from '../../config/Palette.js';
import { drawSprite } from '../art/Bake.js';

/** The ground in stacked sheets of paper, and what grows on it. */

const SAMPLE_PIXELS = 7;
const MAX_POINTS = 512;
const SHEETS = Object.freeze([
    { colorKey: 'ground', drop: 0.12 },
    { colorKey: 'ground2', drop: 1.7 },
    { colorKey: 'ground3', drop: 4.2 },
]);
const LINE_WOBBLE = 0.08;
const HATCH_SPACING = 1.9;
const HATCH_DEPTH = 0.55;

export class TerrainLayer {
    #xs = new Float32Array(MAX_POINTS);
    #ys = new Float32Array(MAX_POINTS);
    #count = 0;

    update({ sim, camera }) {
        const { terrain } = sim.course;
        const step = Math.max(SAMPLE_PIXELS, (camera.width + 4) / (MAX_POINTS - 2));
        let count = 0;
        for (let px = -2; px <= camera.width + step + 2; px += step) {
            const x = camera.left + px / camera.scale;
            // the line wanders a little, tied to the world so it does not shimmer
            const wobble = Math.sin(x * 1.3) * LINE_WOBBLE + Math.sin(x * 0.47) * LINE_WOBBLE;
            this.#xs[count] = px;
            this.#ys[count] = camera.sy(terrain.heightAt(x) + wobble);
            count++;
        }
        this.#count = count;
    }

    draw(ctx, { sim, camera, colors }) {
        const lastX = this.#xs[this.#count - 1];

        for (const sheet of SHEETS) {
            const drop = sheet.drop * camera.scale;
            ctx.fillStyle = colors[sheet.colorKey];
            ctx.beginPath();
            ctx.moveTo(this.#xs[0], camera.height);
            this.#traceTop(ctx, drop);
            ctx.lineTo(lastX, camera.height);
            ctx.closePath();
            ctx.fill();
        }

        ctx.strokeStyle = Ink.line;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, camera.scale * 0.2);
        ctx.beginPath();
        ctx.moveTo(this.#xs[0], this.#ys[0]);
        this.#traceTop(ctx, 0);
        ctx.stroke();

        this.#hatch(ctx, sim, camera);
    }

    #traceTop(ctx, drop) {
        for (let i = 0; i < this.#count; i++) ctx.lineTo(this.#xs[i], this.#ys[i] + drop);
    }

    // Short pen strokes under the line, the way a child draws grass.
    #hatch(ctx, sim, camera) {
        const { terrain } = sim.course;
        ctx.lineWidth = Math.max(1, camera.scale * 0.09);
        ctx.beginPath();
        const first = Math.floor(camera.left / HATCH_SPACING);
        const last = Math.ceil(camera.right / HATCH_SPACING);
        for (let i = first; i <= last; i++) {
            const x = i * HATCH_SPACING;
            const top = terrain.heightAt(x) - 0.25 - (Math.abs(i) % 3) * 0.3;
            ctx.moveTo(camera.sx(x), camera.sy(top));
            ctx.lineTo(camera.sx(x - 0.25), camera.sy(top - HATCH_DEPTH));
        }
        ctx.stroke();
    }
}

const SPACING = 6;
const DECOR_SCALE = 0.05;

// The decor comes from a plain hash of its slot: it is scenery, not simulation.
function slotHash(slot) {
    return (Math.imul(slot, 2654435761) >>> 0) / 4294967296;
}

export class DecorLayer {
    #sprites;

    /** @param {import('../art/Bake.js').Sprite[]} sprites */
    constructor(sprites) {
        this.#sprites = sprites;
    }

    draw(ctx, { sim, camera }) {
        const { terrain } = sim.course;
        const first = Math.floor(camera.left / SPACING);
        const last = Math.ceil(camera.right / SPACING);
        const artScale = camera.scale * DECOR_SCALE;

        for (let slot = first; slot <= last; slot++) {
            const hash = slotHash(slot);
            if (hash > 0.6) continue;
            const x = slot * SPACING + hash * SPACING;
            const sprite = this.#sprites[Math.floor(hash * 10) % this.#sprites.length];
            drawSprite(ctx, sprite, camera.sx(x), camera.sy(terrain.heightAt(x)), artScale);
        }
    }
}
