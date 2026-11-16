import { drawText, LINE, textWidth } from '../PixelFont.js';

/**
 * The pixel UI's building blocks, drawn at the frame's low resolution:
 * panels with cut corners, buttons (focus, press, appear animations),
 * segmented bars and centred text. Every screen is made of these, so the
 * whole game keeps one look.
 *
 * @typedef {{id: string, x: number, y: number, w: number, h: number, label?: string, icon?: string,
 *   kind?: 'primary'|'normal'|'danger', disabled?: boolean}} Button
 */

/** Game pixels kept free in the top right corner for the page's full screen button (index.html). */
export const CORNER = 18;

export const UI = {
    ink: '#140c1c',
    cream: '#f2eef6',
    panel: '#24164a',
    panelLight: '#36246a',
    edge: '#5a46a0',
    gold: '#ffd34a',
    goldDark: '#b8801c',
    red: '#e8303c',
    green: '#3ccf6a',
    cyan: '#5ad8ff',
    dim: '#8a7ab0',
    shade: 'rgba(10, 6, 24, 0.72)',
};

const BUTTON_COLORS = {
    primary: { fill: UI.gold, edge: UI.goldDark, text: UI.ink },
    normal: { fill: UI.panelLight, edge: UI.edge, text: UI.cream },
    danger: { fill: '#8a1c3a', edge: UI.red, text: UI.cream },
    disabled: { fill: '#2a2440', edge: '#3a3258', text: '#6a5e8a' },
};

/** A box with cut corners: ink outline, a lighter edge, a fill. */
export function panel(ctx, x, y, w, h, { fill = UI.panel, edge = UI.edge } = {}) {
    [x, y, w, h] = [x, y, w, h].map(Math.round);
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = edge;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

export function textCentered(ctx, text, cx, y, style) {
    drawText(ctx, text, Math.round(cx - textWidth(text, style.scale ?? 1) / 2), Math.round(y), style);
}

export function textRight(ctx, text, right, y, style) {
    drawText(ctx, text, Math.round(right - textWidth(text, style.scale ?? 1)), Math.round(y), style);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Button} button
 * @param {{focused: boolean, pressed: boolean, appear: number, time: number, icons?: object}} state
 *   appear 0..1: the button rises into place
 */
export function drawButton(ctx, button, { focused, pressed, appear, time, icons }) {
    if (appear <= 0) return;
    const colors = BUTTON_COLORS[button.disabled ? 'disabled' : button.kind ?? 'normal'];
    const rise = Math.round((1 - appear) * 10);
    const sink = pressed ? 1 : 0;
    const bob = focused && !pressed && Math.sin(time * 7) > 0.6 ? -1 : 0;
    const x = button.x;
    const y = button.y + rise + sink + bob;
    if (!pressed) {
        ctx.fillStyle = 'rgba(10, 6, 24, 0.5)';
        ctx.fillRect(x + 1, y + button.h, button.w - 2, 2);
    }
    panel(ctx, x, y, button.w, button.h, { fill: focused ? lighten(colors.fill) : colors.fill, edge: focused ? UI.cream : colors.edge });
    const iconImage = button.icon && icons?.[button.icon]?.[1];
    const label = button.label ?? '';
    const labelWidth = textWidth(label) + (iconImage ? iconImage.width + 3 : 0);
    let left = Math.round(x + (button.w - labelWidth) / 2);
    const middle = y + Math.round((button.h - LINE) / 2);
    if (iconImage) {
        ctx.drawImage(iconImage, left, middle - 1);
        left += iconImage.width + 3;
    }
    drawText(ctx, label, left, middle, { color: colors.text });
    if (focused && Math.floor(time * 3) % 2 === 0) arrow(ctx, x - 5, y + Math.round(button.h / 2) - 3, UI.cream);
}

/** A small arrow pointing right, 3 x 5. */
export function arrow(ctx, x, y, color, facing = 1) {
    ctx.fillStyle = color;
    for (let row = 0; row < 5; row++) {
        const reach = row < 3 ? row : 4 - row;
        const left = facing > 0 ? x : x + 2 - reach;
        ctx.fillRect(left, y + row, reach + 1, 1);
    }
}

/** The fill a focused button gets: the same colour, a step lighter. */
function lighten(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    const channel = (shift) => Math.min(255, ((value >> shift) & 255) + 28);
    return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * A segmented bar: `fill` lit segments of `count`, `preview` more blinking
 * green (what an upgrade would add) or red (what it would take).
 */
export function segmentBar(ctx, x, y, w, { fill, preview = fill, count = 10, time = 0, color = UI.gold }) {
    const step = Math.floor(w / count);
    const lit = Math.round(fill * count);
    const after = Math.round(preview * count);
    const flash = Math.floor(time * 4) % 2 === 0;
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(x + i * step, y, step - 1, 5);
        ctx.fillStyle = segmentColor(i, lit, after, flash, color);
        ctx.fillRect(x + i * step + 1, y + 1, step - 3, 3);
    }
}

function segmentColor(i, lit, after, flash, color) {
    if (i < Math.min(lit, after)) return color;
    if (i < after) return flash ? UI.green : '#1e6a3a';
    if (i < lit) return flash ? UI.red : '#6a1c2a';
    return '#2e2448';
}

/** Whether a point is inside a button. */
export function hits(button, x, y) {
    return x >= button.x && x < button.x + button.w && y >= button.y && y < button.y + button.h;
}
