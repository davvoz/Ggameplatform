import { drawText } from '../render/PixelFont.js';
import { CORNER, panel, textRight, UI } from '../render/ui/widgets.js';

/**
 * What the menus share: a moving background (a dusk sky over a grid that
 * rushes towards the viewer, like a road at speed) and the header bar with
 * the screen's title and the player's credits.
 */
const SKY = ['#120c2a', '#1b1440', '#2a1a5e', '#3e2278', '#5a2a86', '#7a3486'];
const GRID = { color: '#ff4ab0', dim: '#7a2a7a', lines: 9, rays: 16, speed: 0.6 };
const HEADER = 16;

export function menuBackground(ctx, { width, height }, time) {
    const horizon = Math.round(height * 0.5);
    const band = Math.ceil(horizon / SKY.length);
    SKY.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * band, width, band);
    });
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(0, horizon, width, height - horizon);
    // rows of the grid come closer and spread apart, forever
    const depth = height - horizon;
    for (let i = 0; i < GRID.lines; i++) {
        const t = (i + ((time * GRID.speed) % 1)) / GRID.lines;
        const y = horizon + Math.round(depth * t * t);
        ctx.fillStyle = t < 0.3 ? GRID.dim : GRID.color;
        ctx.fillRect(0, y, width, 1);
    }
    for (let i = -GRID.rays; i <= GRID.rays; i++) {
        const spread = (i / GRID.rays) * width * 1.6;
        for (let y = horizon; y < height; y += 2) {
            const t = (y - horizon) / depth;
            ctx.fillStyle = t < 0.3 ? GRID.dim : GRID.color;
            ctx.fillRect(Math.round(width / 2 + spread * t), y, 1, 2);
        }
    }
    ctx.fillStyle = '#ffaa5e';
    ctx.fillRect(0, horizon, width, 1);
}

/** The bar at the top: title on the left, coins on the right (left of the full screen button's corner). */
export function header(ctx, { width }, title, credits, icons) {
    panel(ctx, -2, -2, width + 4, HEADER + 2, { fill: UI.panel, edge: UI.edge });
    drawText(ctx, title, 6, 5, { color: UI.gold, outline: UI.ink });
    const text = String(credits);
    const right = width - CORNER - 4;
    textRight(ctx, text, right, 5, { color: UI.cream, outline: UI.ink });
    ctx.drawImage(icons.coin[1], right - text.length * 6 - 11, 4);
}

export const HEADER_HEIGHT = HEADER;
