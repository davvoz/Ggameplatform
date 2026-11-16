import { makeCanvas } from '../canvas.js';
import { drawText, LINE, textWidth } from '../PixelFont.js';
import { UI } from './widgets.js';

/**
 * The game's name in big pixel letters: an ink outline, bands of gold to
 * red, leaning forward like a fast car's badge, with a light that sweeps
 * across it every few seconds. Painted once; the sweep is drawn each frame.
 */
const BANDS = ['#fff3b0', '#ffd34a', '#ffaa3a', '#ff7a2a', '#e8303c'];
const SWEEP = { every: 3.2, lasts: 0.6, width: 10 };

function paintWord(text, scale) {
    const pad = 2 + scale;
    const w = textWidth(text, scale) + pad * 2;
    const h = LINE * scale + pad * 2;
    // the bands first, then kept only where the letters are, in one go:
    // `source-in` clears whatever its own drawing does not cover
    const bands = makeCanvas(w, h);
    const band = Math.ceil((LINE * scale) / BANDS.length);
    bands.ctx.fillStyle = BANDS.at(-1);
    bands.ctx.fillRect(0, 0, w, h);
    BANDS.forEach((color, i) => {
        bands.ctx.fillStyle = color;
        bands.ctx.fillRect(0, i === 0 ? 0 : pad + i * band, w, i === 0 ? pad + band : band);
    });
    const fill = makeCanvas(w, h);
    drawText(fill.ctx, text, pad, pad, { color: '#ffffff', scale });
    fill.ctx.globalCompositeOperation = 'source-in';
    fill.ctx.drawImage(bands.canvas, 0, 0);
    // a thick outline: the letters in ink shifted all round
    const word = makeCanvas(w, h);
    const outline = makeCanvas(w, h);
    drawText(outline.ctx, text, pad, pad, { color: UI.ink, scale });
    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 3; dy++) word.ctx.drawImage(outline.canvas, dx, dy);
    }
    word.ctx.drawImage(fill.canvas, 0, 0);
    return word.canvas;
}

/** The word leaning forward: each row slides right a little more than the one below. */
function lean(image) {
    const slant = Math.ceil(image.height / 4);
    const { canvas, ctx } = makeCanvas(image.width + slant, image.height);
    for (let y = 0; y < image.height; y++) {
        const shift = Math.round((image.height - y) / 4);
        ctx.drawImage(image, 0, y, image.width, 1, shift, y, image.width, 1);
    }
    return canvas;
}

export class Logo {
    #image;
    #sweep;

    /** @param {string} big first line @param {string} small second line */
    constructor(big, small) {
        const top = lean(paintWord(big, 4));
        const bottom = lean(paintWord(small, 2));
        const { canvas, ctx } = makeCanvas(Math.max(top.width, bottom.width), top.height + bottom.height - 4);
        ctx.drawImage(top, Math.round((canvas.width - top.width) / 2), 0);
        ctx.drawImage(bottom, Math.round((canvas.width - bottom.width) / 2), top.height - 4);
        this.#image = canvas;
        this.#sweep = makeCanvas(canvas.width, canvas.height);
    }

    get width() {
        return this.#image.width;
    }

    get height() {
        return this.#image.height;
    }

    draw(ctx, x, y, time) {
        ctx.drawImage(this.#image, Math.round(x), Math.round(y));
        const t = (time % SWEEP.every) / SWEEP.lasts;
        if (t >= 1) return;
        // the light: a slanted white band, kept to the letters
        const { canvas, ctx: s } = this.#sweep;
        s.globalCompositeOperation = 'source-over';
        s.clearRect(0, 0, canvas.width, canvas.height);
        s.drawImage(this.#image, 0, 0);
        s.globalCompositeOperation = 'source-atop';
        s.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const at = -SWEEP.width * 2 + t * (canvas.width + SWEEP.width * 4);
        for (let row = 0; row < canvas.height; row++) s.fillRect(Math.round(at + (canvas.height - row) / 2), row, SWEEP.width, 1);
        s.globalCompositeOperation = 'destination-in';
        s.drawImage(this.#image, 0, 0);
        ctx.drawImage(canvas, Math.round(x), Math.round(y));
    }
}
