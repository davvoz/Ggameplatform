import { stepped } from './pixels.js';

const TAU = Math.PI * 2;
const RADIUS = 92;
const CELL = 6;
const RIM = '#e6f8ff';
const BAND = '#5cc4ff';
const FILL = 'rgba(120,210,255,0.1)';
const GLINT = 'rgba(200,240,255,0.45)';
const SHINE = 'rgba(255,255,255,0.75)';
/** The recharge bar over the mage's head, a small shield in front of it. */
const BAR = { width: 56, height: 6, border: 2, gap: 4, step: 2 };
const BAR_FRAME = '#0e1424';
const BAR_EMPTY = '#1f2b40';
const BAR_CHARGING = '#3b9be0';
const BAR_READY = '#a6ecff';
const BAR_FLASH = '#ffffff';
const ICON_PX = 2;
const ICON = ['11111', '12221', '12221', '01210', '00100'];
const ICON_SIZE = ICON.length * ICON_PX;

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

/** The colour of the bar's fill: white in the flash, bright when ready, blue while it charges. */
function fillColor(ready, flash) {
    if (flash > 0) return BAR_FLASH;
    return ready ? BAR_READY : BAR_CHARGING;
}

function drawIcon(ctx, x, y, color) {
    ICON.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell === '0') return;
        ctx.fillStyle = cell === '1' ? BAR_FRAME : color;
        ctx.fillRect(x + c * ICON_PX, y + r * ICON_PX, ICON_PX, ICON_PX);
    }));
}

/**
 * The shield's recharge bar, centred on `cx` with its bottom at `bottom`.
 * It fills left to right while the shield recharges (`done` from 0 to 1),
 * is bright and pulses once ready, and `flash` (1 down to 0, just after the
 * shield came back) turns it white for a moment.
 */
export function drawShieldBar(ctx, cx, bottom, { done, time, flash = 0 }) {
    const ready = done >= 1;
    const color = fillColor(ready, flash);
    const outer = BAR.height + BAR.border * 2;
    const left = Math.round(cx - (ICON_SIZE + BAR.gap + BAR.width + BAR.border * 2) / 2);
    const top = Math.round(bottom - outer);
    const barLeft = left + ICON_SIZE + BAR.gap;
    const filled = ready ? BAR.width : Math.floor((done * BAR.width) / BAR.step) * BAR.step;
    ctx.save();
    drawIcon(ctx, left, Math.round(top + (outer - ICON_SIZE) / 2), ready ? color : BAR_EMPTY);
    ctx.fillStyle = BAR_FRAME;
    ctx.fillRect(barLeft, top, BAR.width + BAR.border * 2, outer);
    ctx.fillStyle = BAR_EMPTY;
    ctx.fillRect(barLeft + BAR.border, top + BAR.border, BAR.width, BAR.height);
    if (ready && flash <= 0) ctx.globalAlpha = Math.floor(time * 3) % 2 === 0 ? 1 : 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(barLeft + BAR.border, top + BAR.border, filled, BAR.height);
    ctx.restore();
}
