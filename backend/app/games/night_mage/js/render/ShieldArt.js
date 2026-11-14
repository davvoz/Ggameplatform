import { ringCells, stepped } from './pixels.js';

const TAU = Math.PI * 2;
const RADIUS = 92;
const CELL = 6;
const RIM = '#e6f8ff';
const BAND = '#5cc4ff';
const FILL = 'rgba(120,210,255,0.1)';
const GLINT = 'rgba(200,240,255,0.45)';
const SHINE = 'rgba(255,255,255,0.75)';
/** Cells of the ring at the feet, lit one by one as the shield recharges. */
const RING_CELLS = 28;

/** The colour of one cell of the bubble, or null (pure, for the tests too). */
export function bubbleCell(dx, dy, i, j) {
    const d = Math.hypot(dx, dy);
    if (d > RADIUS + CELL * 0.5) return null;
    if (d > RADIUS - CELL * 0.5) return RIM;
    if (d > RADIUS - CELL * 1.6) return BAND;
    const angle = Math.atan2(dy, dx);
    const shine = d > RADIUS * 0.55 && d < RADIUS * 0.72 && Math.abs(angle + Math.PI * 0.75) < 0.32;
    if (shine) return SHINE;
    return (i * 7 + j * 13) % 23 === 0 ? GLINT : FILL; // a faint inside with a few scattered glints
}

/** Paints the shield bubble once: a rim, a band, a faint inside with glints, and a shine. */
export function paintBubble() {
    const cells = Math.ceil((RADIUS * 2 + CELL * 2) / CELL);
    const canvas = document.createElement('canvas');
    canvas.width = cells * CELL;
    canvas.height = cells * CELL;
    const ctx = canvas.getContext('2d');
    const half = (cells * CELL) / 2;
    for (let j = 0; j < cells; j++) {
        for (let i = 0; i < cells; i++) {
            const color = bubbleCell((i + 0.5) * CELL - half, (j + 0.5) * CELL - half, i, j);
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(i * CELL, j * CELL, CELL, CELL);
        }
    }
    return canvas;
}

/**
 * The bubble around the mage, with three sparks running round its rim.
 * `fade` from 0 to 1 (steps, not smooth); it blinks when `ending`.
 */
export function drawBubble(ctx, bubble, x, y, { fade = 1, time = 0, ending = false }) {
    if (ending && Math.floor(time * 16) % 2 === 0) return;
    const left = Math.round(x - bubble.width / 2);
    const top = Math.round(y - bubble.height / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = stepped(fade);
    ctx.drawImage(bubble, left, top);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {
        const angle = time * 4 + (TAU / 3) * k;
        const sx = Math.round((x + Math.cos(angle) * RADIUS) / CELL) * CELL;
        const sy = Math.round((y + Math.sin(angle) * RADIUS) / CELL) * CELL;
        ctx.fillRect(sx - CELL, sy - CELL / 2, CELL * 2, CELL);
        ctx.fillRect(sx - CELL / 2, sy - CELL, CELL, CELL * 2);
    }
    ctx.restore();
}

/**
 * The ring of cells at the mage's feet: it lights up cell by cell while the
 * shield recharges (`done` from 0 to 1) and pulses once it is ready.
 */
export function drawShieldRing(ctx, x, y, done, time) {
    const cells = ringCells(x, y, 44, 10, 4, RING_CELLS);
    const ready = done >= 1;
    const lit = Math.floor(done * cells.length);
    ctx.save();
    cells.forEach((cell, i) => {
        if (ready) ctx.globalAlpha = Math.floor(time * 4) % 2 === 0 ? 0.85 : 0.45;
        else ctx.globalAlpha = i < lit ? 0.8 : 0.5;
        ctx.fillStyle = ready || i < lit ? '#7ad7ff' : '#26324a';
        ctx.fillRect(cell.x, cell.y, 4, 4);
    });
    ctx.restore();
}
