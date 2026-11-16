import { makeCanvas } from '../canvas.js';
import { drawText, textWidth } from '../PixelFont.js';
import { UI } from './widgets.js';

/**
 * The weekly challenge's postcard for the world select, beside the worlds'
 * own (WorldCard.js): a night of gold rays over a podium, a chequered
 * flag along its foot. The trophy over the first step is drawn live, by
 * the screen, so it can shine.
 */
const SKY = ['#1a0f3a', '#2a1450', '#3c1a62', '#562070'];
const RAYS = { count: 14, color: 'rgba(255, 211, 74, 0.13)' };
const STEPS = [
    { place: 2, color: '#b8c0d8', shade: '#7a809a', height: 0.2 },
    { place: 1, color: UI.gold, shade: UI.goldDark, height: 0.3 },
    { place: 3, color: '#d88a4a', shade: '#9a5a2a', height: 0.17 },
];
const FLAG = 4;

/**
 * @returns {{canvas: HTMLCanvasElement, top: {x: number, y: number}}} the card,
 *   and the middle of the first step's top (where the trophy stands)
 */
export function paintChallengeCard(width, height) {
    const { canvas, ctx } = makeCanvas(width, height);
    const band = height / SKY.length;
    SKY.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, Math.round(i * band), width, Math.ceil(band) + 1);
    });
    const ground = height - FLAG * 2;
    rays(ctx, width / 2, ground - height * 0.3, Math.hypot(width, height));
    const top = podium(ctx, width, ground, height);
    flag(ctx, width, ground);
    return { canvas, top };
}

/** Wedges of light turning around (cx, cy). */
function rays(ctx, cx, cy, reach) {
    ctx.fillStyle = RAYS.color;
    const step = (Math.PI * 2) / RAYS.count;
    for (let i = 0; i < RAYS.count; i++) {
        const from = i * step;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(from) * reach, cy + Math.sin(from) * reach);
        ctx.lineTo(cx + Math.cos(from + step / 2) * reach, cy + Math.sin(from + step / 2) * reach);
        ctx.fill();
    }
}

/** Three steps, the first in the middle; returns where the trophy stands. */
function podium(ctx, width, ground, height) {
    const stepWidth = Math.round(width * 0.22);
    const left = Math.round(width / 2 - (stepWidth * 3) / 2);
    let top = null;
    STEPS.forEach((step, i) => {
        const x = left + i * stepWidth;
        const h = Math.round(height * step.height);
        const y = ground - h;
        ctx.fillStyle = UI.ink;
        ctx.fillRect(x - 1, y - 1, stepWidth + 2, h + 1);
        ctx.fillStyle = step.shade;
        ctx.fillRect(x, y, stepWidth, h);
        ctx.fillStyle = step.color;
        ctx.fillRect(x, y, stepWidth - 2, h - 2);
        const number = String(step.place);
        drawText(ctx, number, Math.round(x + stepWidth / 2 - textWidth(number) / 2), y + 2, { color: UI.ink });
        if (step.place === 1) top = { x: x + stepWidth / 2, y };
    });
    return top;
}

/** A chequered band under the podium. */
function flag(ctx, width, ground) {
    for (let row = 0; row < 2; row++) {
        for (let x = 0; x < width; x += FLAG) {
            ctx.fillStyle = (x / FLAG + row) % 2 === 0 ? UI.cream : UI.ink;
            ctx.fillRect(x, ground + row * FLAG, FLAG, FLAG);
        }
    }
}
