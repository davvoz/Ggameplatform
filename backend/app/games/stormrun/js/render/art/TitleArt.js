import { Ink, RAINBOW } from '../../config/Palette.js';
import { font, Weight } from '../../config/Typography.js';
import { Rng } from '../../core/Rng.js';
import { bake } from './Bake.js';

/**
 * The name of the game, lettered like a paper sticker. The start screen and the
 * cover both draw this, so there is only one logo.
 */

const WORDS = Object.freeze([
    { text: 'Rainbow', colors: RAINBOW },
    { text: ' ', colors: [Ink.line] },
    { text: 'Rush', colors: [Ink.eye] },
]);
const RIBBON_TEXT = 'Stormrun';
const RIBBON_COLOR = RAINBOW[0];

const INK_WIDTH = 0.118;
const STICKER_WIDTH = 0.2;
const SHADOW = Object.freeze([0.03, 0.05]);
const MISPRINT = 0.012;
const MAX_TILT = 0.075;
const MAX_BOUNCE = 0.045;
const RIBBON_SIZE = 0.4;
const RIBBON_TILT = -0.035;
const RIBBON_DROP = 0.62;
const RIBBON_SHIFT = 0.2;
const TITLE_TILT = -0.02;

const BAKED_SIZE = 100;
const BAKED_PADDING = 30;

function letters(ctx, size) {
    ctx.font = font(Weight.BOLD, size);
    const whole = WORDS.map((word) => word.text).join('');
    const rng = new Rng(21);
    const placed = [];
    let index = 0;
    for (const { text, colors } of WORDS) {
        [...text].forEach((char, i) => {
            const left = ctx.measureText(whole.slice(0, index)).width;
            const width = ctx.measureText(char).width;
            placed.push({
                char,
                color: colors[i % colors.length],
                x: left + width / 2,
                y: rng.range(-MAX_BOUNCE, MAX_BOUNCE) * size,
                tilt: rng.range(-MAX_TILT, MAX_TILT),
            });
            index++;
        });
    }
    return { placed, width: ctx.measureText(whole).width };
}

function eachLetter(ctx, placed, paint) {
    for (const letter of placed) {
        if (letter.char === ' ') continue;
        ctx.save();
        ctx.translate(letter.x, letter.y);
        ctx.rotate(letter.tilt);
        paint(letter);
        ctx.restore();
    }
}

function drawRibbon(ctx, size) {
    const textSize = size * RIBBON_SIZE;
    ctx.font = font(Weight.BOLD, textSize);
    const halfWidth = ctx.measureText(RIBBON_TEXT).width / 2 + textSize * 0.62;
    const halfHeight = textSize * 0.68;
    const notch = textSize * 0.32;
    const trace = () => {
        ctx.beginPath();
        ctx.moveTo(-halfWidth - notch, -halfHeight);
        ctx.lineTo(halfWidth + notch, -halfHeight - textSize * 0.04);
        ctx.lineTo(halfWidth, 0);
        ctx.lineTo(halfWidth + notch, halfHeight);
        ctx.lineTo(-halfWidth - notch, halfHeight + textSize * 0.04);
        ctx.lineTo(-halfWidth, 0);
        ctx.closePath();
    };

    ctx.save();
    ctx.rotate(RIBBON_TILT);
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.translate(size * SHADOW[0], size * SHADOW[1]);
    trace();
    ctx.fillStyle = Ink.line;
    ctx.fill();
    ctx.restore();
    trace();
    ctx.lineWidth = size * STICKER_WIDTH * 0.42;
    ctx.strokeStyle = Ink.edge;
    ctx.stroke();
    ctx.lineWidth = size * INK_WIDTH * 0.42;
    ctx.strokeStyle = Ink.line;
    ctx.stroke();
    ctx.fillStyle = RIBBON_COLOR;
    ctx.fill();

    ctx.fillStyle = Ink.edge;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(RIBBON_TEXT, 0, -textSize * 0.03);
    ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} centerX
 * @param {number} baseline
 * @param {number} size height of the letters
 */
export function drawTitle(ctx, centerX, baseline, size) {
    ctx.save();
    ctx.translate(centerX, baseline);
    ctx.rotate(TITLE_TILT);

    const { placed, width } = letters(ctx, size);
    ctx.save();
    ctx.translate(-width / 2, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';

    const outline = (lineWidth, color) => eachLetter(ctx, placed, ({ char }) => {
        ctx.lineWidth = size * lineWidth;
        ctx.strokeStyle = color;
        ctx.strokeText(char, 0, 0);
    });

    // each pass runs over all the letters, so they join into one sticker
    ctx.save();
    ctx.translate(size * SHADOW[0], size * SHADOW[1]);
    outline(STICKER_WIDTH, Ink.line);
    ctx.restore();
    outline(STICKER_WIDTH, Ink.edge);
    outline(INK_WIDTH, Ink.line);
    ctx.translate(size * MISPRINT, size * MISPRINT);
    eachLetter(ctx, placed, ({ char, color }) => {
        ctx.fillStyle = color;
        ctx.fillText(char, 0, 0);
    });
    ctx.restore();

    ctx.translate(width * RIBBON_SHIFT, size * RIBBON_DROP);
    drawRibbon(ctx, size);
    ctx.restore();
}

/** The logo as an image, for the HTML screens. @returns {import('./Bake.js').Sprite} */
export function bakeTitle() {
    const measuring = document.createElement('canvas').getContext('2d');
    const { width } = letters(measuring, BAKED_SIZE);
    const artWidth = Math.ceil(width) + BAKED_PADDING * 2;
    const artHeight = Math.ceil(BAKED_SIZE * 2.2);
    return bake(artWidth, artHeight, (ctx) => drawTitle(ctx, artWidth / 2, BAKED_SIZE + BAKED_PADDING * 0.3, BAKED_SIZE));
}
