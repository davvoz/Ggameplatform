import { Ink } from '../../config/Palette.js';
import { Rng } from '../../core/Rng.js';

/**
 * The hand of the illustrator: lines that wander a little, and colour printed
 * slightly off the line, like an old children's book.
 */

const WOBBLE = 1.1;
const SEGMENT = 9;

/** Trace a line through points, wandering a little off the straight path. */
export function traceInk(ctx, points, { closed = false, seed = 1 } = {}) {
    const rng = new Rng(seed);
    const path = closed ? [...points, points[0]] : points;
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) {
        const [fromX, fromY] = path[i - 1];
        const [toX, toY] = path[i];
        const steps = Math.max(1, Math.round(Math.abs(toX - fromX + toY - fromY) / SEGMENT));
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const jitter = s === steps ? 0 : WOBBLE;
            ctx.lineTo(
                fromX + (toX - fromX) * t + rng.range(-jitter, jitter),
                fromY + (toY - fromY) * t + rng.range(-jitter, jitter)
            );
        }
    }
    if (closed) ctx.closePath();
}

/** A shape with its colour slightly misplaced under a hand-drawn outline. */
export function inkShape(ctx, points, color, seed = 1) {
    ctx.save();
    ctx.translate(1.8, 1.4);
    traceInk(ctx, points, { closed: true, seed: seed + 50 });
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    traceInk(ctx, points, { closed: true, seed });
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** A round shape in the same style. */
export function inkCircle(ctx, x, y, radius, color, seed = 1, sides = 16) {
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
    }
    inkShape(ctx, points, color, seed);
}

/** A loose hand-drawn stroke. */
export function inkStroke(ctx, points, seed = 1, width = 2) {
    traceInk(ctx, points, { seed });
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** A round lumpy outline, drawn with its ink edge behind the colour. */
export function inkLumps(ctx, lumps, color, lineWidth = 2.4) {
    ctx.beginPath();
    for (const [x, y, r] of lumps) {
        ctx.moveTo(x + r + lineWidth, y);
        ctx.arc(x, y, r + lineWidth, 0, Math.PI * 2);
    }
    ctx.fillStyle = Ink.line;
    ctx.fill();

    ctx.beginPath();
    for (const [x, y, r] of lumps) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = color;
    ctx.fill();
}
