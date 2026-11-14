import { paintGrid, ringCells } from './pixels.js';

/**
 * The storm's looks, shared by the HUD, the effects and the title demo: the
 * button (a tile with a cloud whose cells fill with the hits) and the
 * lightning (a zigzag of square cells from the sky).
 */
export const STORM_VIOLET = '#b48cff';
const PX = 5;
const HALF = 38;
const DIAL = 33;
const CELLS = 20;
const CLOUD = {
    grid: [
        '0000011110000000', '0001144441100000', '0014433334411100', '0143333333344410',
        '1433333333333341', '1333333333333331', '1233333333333321', '0122222222222210',
        '0011111111111100', '0000000565000000', '0000005650000000', '0000056555600000',
        '0000000065000000', '0000000650000000', '0000006500000000', '0000000000000000',
    ],
    colors: ['#1a0f2e', '#4b3d7a', '#8f7fd0', '#d6ccff', '#ffffff', '#c9a6ff'],
};

/** Paints the storm cloud once (48 x 48). */
export function paintCloud() {
    return paintGrid(CLOUD, 3);
}

/**
 * The storm button centred on (x, y).
 * @param {{cloud: HTMLCanvasElement, font: object, fill: number, ready: boolean, time: number, label?: string}} look
 *   `label` is written under it (the key, or TAP!); `ready` makes it blink and bob
 * @returns {{x: number, y: number, w: number, h: number}} the area it takes
 */
export function drawStormButton(ctx, x, y, { cloud, font, fill, ready, time, label }) {
    ctx.fillStyle = 'rgba(12,6,24,0.78)';
    ctx.fillRect(x - HALF + 6, y - HALF, HALF * 2 - 12, HALF * 2);
    ctx.fillRect(x - HALF, y - HALF + 6, HALF * 2, HALF * 2 - 12);
    const lit = Math.floor(fill * CELLS);
    const blink = ready && Math.floor(time * 4) % 2 === 0;
    const litColor = blink ? '#ffffff' : STORM_VIOLET;
    ringCells(x, y, DIAL, DIAL, 1, CELLS).forEach((cell, i) => {
        ctx.fillStyle = i < lit ? litColor : '#2a2140';
        ctx.fillRect(Math.round(cell.x) - 3, Math.round(cell.y) - 3, 6, 6);
    });
    ctx.globalAlpha = ready ? 1 : 0.35;
    const bob = ready ? Math.round(Math.sin(time * 6) * 2) : 0;
    ctx.drawImage(cloud, x - 24, y - 24 + bob, 48, 48);
    ctx.globalAlpha = ready ? 1 : 0.6;
    if (label) font.draw(ctx, label, x, y + HALF + 4, { size: 16, align: 'center', color: STORM_VIOLET });
    ctx.globalAlpha = 1;
    return { x: x - HALF, y: y - HALF, w: HALF * 2, h: HALF * 2 };
}

/**
 * The points of a lightning from above the arena down to (x, y).
 * @param {(min: number, max: number) => number} wobble where the randomness comes from
 */
export function lightningPath(x, y, wobble) {
    const points = [];
    let px = x + wobble(-60, 60);
    for (let py = -20; py < y; py += 26) {
        points.push({ x: Math.round(px / PX) * PX, y: py });
        px += wobble(-18, 18) + (x - px) * 0.25;
    }
    points.push({ x, y });
    return points;
}

/** A line of square cells between two points. */
function segment(ctx, a, b, size) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / PX));
    for (let k = 0; k <= steps; k++) {
        const x = Math.round((a.x + ((b.x - a.x) * k) / steps) / PX) * PX;
        const y = Math.round((a.y + ((b.y - a.y) * k) / steps) / PX) * PX;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
}

/** A lightning `age` seconds old: violet around, white inside, flickering after the first moment. */
export function drawLightning(ctx, path, age) {
    if (age > 0.1 && Math.floor(age * 40) % 2 === 1) return;
    for (const [size, color] of [[PX * 3, '#7a3cff'], [PX, '#ffffff']]) {
        ctx.fillStyle = color;
        for (let i = 1; i < path.length; i++) segment(ctx, path[i - 1], path[i], size);
    }
}
