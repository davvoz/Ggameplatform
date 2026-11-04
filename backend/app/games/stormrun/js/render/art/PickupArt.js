import { Ink, RAINBOW } from '../../config/Palette.js';
import { bake, paperEdge } from './Bake.js';

/** The colour drops, one sprite per rainbow colour. */

const WIDTH = 44;
const HEIGHT = 58;

function traceDrop(ctx, scale) {
    const w = 15 * scale;
    const h = 21 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -h * 1.05);
    ctx.bezierCurveTo(w * 0.35, -h * 0.5, w, -h * 0.05, w, h * 0.32);
    ctx.bezierCurveTo(w, h * 0.8, w * 0.5, h, 0, h);
    ctx.bezierCurveTo(-w * 0.5, h, -w, h * 0.8, -w, h * 0.32);
    ctx.bezierCurveTo(-w, -h * 0.05, -w * 0.35, -h * 0.5, 0, -h * 1.05);
    ctx.closePath();
}

function drawDrop(ctx, color) {
    ctx.translate(WIDTH / 2, HEIGHT / 2 + 2);
    paperEdge(ctx, () => traceDrop(ctx, 1.2), Ink.shadow, Ink.edge, 2.5);
    traceDrop(ctx, 1);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.ellipse(-5, 5, 3, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
}

export const DROP_ART_HEIGHT = HEIGHT;

/** @returns {import('./Bake.js').Sprite[]} one sprite per rainbow colour */
export function bakeDrops() {
    return RAINBOW.map((color) => bake(WIDTH, HEIGHT, (ctx) => drawDrop(ctx, color)));
}
