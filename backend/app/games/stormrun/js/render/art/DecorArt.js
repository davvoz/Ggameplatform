import { Ink, RAINBOW } from '../../config/Palette.js';
import { font, Weight } from '../../config/Typography.js';
import { bake } from './Bake.js';

/** Small scenery sprites, paper tags and flags. */

const TAG_FONT = font(Weight.BOLD, 15);

function drawTuft(ctx) {
    ctx.strokeStyle = Ink.leaf;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [x, tip] of [[12, -5], [18, 0], [24, 6]]) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.quadraticCurveTo(x, 12, x + tip, 4);
        ctx.stroke();
    }
}

function drawFlower(ctx, color) {
    ctx.strokeStyle = Ink.leaf;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, 30);
    ctx.quadraticCurveTo(12, 20, 14, 12);
    ctx.stroke();
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(14 + Math.cos(angle) * 5, 10 + Math.sin(angle) * 5, 3.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = Ink.edge;
    ctx.beginPath();
    ctx.arc(14, 10, 2.6, 0, Math.PI * 2);
    ctx.fill();
}

function drawPebble(ctx) {
    ctx.fillStyle = Ink.edge;
    ctx.beginPath();
    ctx.ellipse(16, 12, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Ink.grumpyLight;
    ctx.beginPath();
    ctx.ellipse(16, 12, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
}

/** @returns {import('./Bake.js').Sprite[]} sprites anchored to the ground */
export function bakeDecor() {
    return [
        bake(36, 24, drawTuft, { anchorX: 18, anchorY: 22 }),
        bake(28, 32, (ctx) => drawFlower(ctx, RAINBOW[0]), { anchorX: 14, anchorY: 30 }),
        bake(36, 24, drawTuft, { anchorX: 18, anchorY: 22 }),
        bake(28, 32, (ctx) => drawFlower(ctx, RAINBOW[2]), { anchorX: 14, anchorY: 30 }),
        bake(32, 24, drawPebble, { anchorX: 16, anchorY: 16 }),
        bake(28, 32, (ctx) => drawFlower(ctx, RAINBOW[6]), { anchorX: 14, anchorY: 30 }),
    ];
}

function measure(text, font) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = font;
    return ctx.measureText(text).width;
}

/** A small paper label. @returns {import('./Bake.js').Sprite} */
export function bakeTag(text, background = Ink.edge, color = Ink.line) {
    const width = Math.ceil(measure(text, TAG_FONT)) + 24;
    const height = 32;
    return bake(width, height, (ctx) => {
        ctx.fillStyle = Ink.shadow;
        ctx.fillRect(4, 6, width - 6, height - 8);
        ctx.fillStyle = background;
        ctx.fillRect(2, 2, width - 6, height - 8);
        ctx.fillStyle = color;
        ctx.font = TAG_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2 - 1, height / 2 - 2);
    });
}

/** A paper flag planted in the ground. @returns {import('./Bake.js').Sprite} */
export function bakeFlag(label, metres, color) {
    const text = `${label}  ${metres} m`;
    const pennant = Math.max(84, Math.ceil(measure(text, TAG_FONT)) + 22);
    const width = pennant + 12;
    const height = 92;

    return bake(width, height, (ctx) => {
        ctx.fillStyle = Ink.line;
        ctx.fillRect(4, 4, 4, height - 6);

        ctx.fillStyle = Ink.edge;
        ctx.fillRect(6, 6, pennant + 2, 32);
        ctx.fillStyle = color;
        ctx.fillRect(8, 8, pennant - 2, 28);
        ctx.fillStyle = Ink.eye;
        ctx.font = TAG_FONT;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 15, 23);
    }, { anchorX: 6, anchorY: height - 2 });
}

/** Static speckles, printed over everything: the paper of the whole picture. */
export function bakeGrain() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    let seed = 12345;
    const next = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
    for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = next() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,50,40,0.05)';
        ctx.fillRect(next() * size, next() * size, 1 + next() * 1.4, 1 + next() * 1.4);
    }
    return canvas;
}
