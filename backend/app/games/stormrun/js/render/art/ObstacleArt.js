import { Ink } from '../../config/Palette.js';
import { bake, paperEdge } from './Bake.js';

/** Obstacle drawings, keyed by the ids of sim/ObstacleTypes.js. */

function sleepyEyes(ctx, x, y, spread, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.5;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * spread - size, y);
        ctx.lineTo(x + side * spread + size, y + size * 0.22 * side);
        ctx.stroke();
    }
}

function drawStump(ctx) {
    const trace = (grow) => {
        ctx.beginPath();
        ctx.moveTo(14 - grow, 14);
        ctx.quadraticCurveTo(13 - grow, 40, 9 - grow, 62 + grow);
        ctx.lineTo(71 + grow, 62 + grow);
        ctx.quadraticCurveTo(67 + grow, 40, 66 + grow, 14);
        ctx.ellipse(40, 14, 26 + grow, 9 + grow, 0, 0, Math.PI, true);
        ctx.closePath();
    };
    paperEdge(ctx, () => trace(3), Ink.shadow, Ink.edge, 3);
    trace(0);
    ctx.fillStyle = Ink.wood;
    ctx.fill();
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = Ink.woodLight;
    ctx.beginPath();
    ctx.ellipse(40, 14, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = Ink.woodDark;
    ctx.lineWidth = 2;
    for (const [rx, ry] of [[16, 5], [8, 2.6]]) {
        ctx.beginPath();
        ctx.ellipse(40, 14, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    sleepyEyes(ctx, 40, 38, 11, 5, Ink.line);
}

function traceCloud(ctx, grow) {
    ctx.beginPath();
    for (const [x, y, r] of [[34, 44, 22], [64, 32, 28], [98, 40, 24], [124, 48, 18]]) {
        ctx.moveTo(x + r + grow, y);
        ctx.arc(x, y, r + grow, 0, Math.PI * 2);
    }
    ctx.rect(26 - grow, 44, 108 + grow * 2, 22 + grow);
}

function drawCloud(ctx) {
    ctx.save();
    ctx.translate(1.5, 3);
    traceCloud(ctx, 3);
    ctx.fillStyle = Ink.shadow;
    ctx.fill();
    ctx.restore();
    traceCloud(ctx, 3);
    ctx.fillStyle = Ink.edge;
    ctx.fill();
    traceCloud(ctx, 0);
    ctx.fillStyle = Ink.grumpy;
    ctx.fill();

    ctx.fillStyle = Ink.grumpyLight;
    ctx.beginPath();
    ctx.ellipse(56, 24, 15, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    sleepyEyes(ctx, 74, 42, 15, 6, Ink.line);
    ctx.strokeStyle = Ink.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(74, 58, 6, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
}

function drawPuddle(ctx) {
    const trace = (grow) => {
        ctx.beginPath();
        ctx.ellipse(90, 16, 84 + grow, 12 + grow, 0, 0, Math.PI * 2);
    };
    trace(3);
    ctx.fillStyle = Ink.edge;
    ctx.fill();
    trace(0);
    ctx.fillStyle = Ink.water;
    ctx.fill();
    ctx.strokeStyle = Ink.waterLight;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (const [x, y, length] of [[44, 13, 22], [86, 18, 30], [128, 12, 18]]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + length / 2, y - 3, x + length, y);
        ctx.stroke();
    }
}

/** Art size of each obstacle and the metres it covers on the ground. */
export const OBSTACLE_ART = Object.freeze({
    stump: { width: 80, height: 70, draw: drawStump, worldWidth: 3.4 },
    cloud: { width: 160, height: 80, draw: drawCloud, worldWidth: 8.2 },
    puddle: { width: 180, height: 32, draw: drawPuddle, worldWidth: 8.6 },
});

/** @returns {Object<string, import('./Bake.js').Sprite>} sprites by obstacle id */
export function bakeObstacles() {
    const sprites = {};
    for (const [id, art] of Object.entries(OBSTACLE_ART)) {
        sprites[id] = bake(art.width, art.height, art.draw);
    }
    return sprites;
}
