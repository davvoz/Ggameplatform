import { makeCanvas } from '../canvas.js';

/**
 * Pixel art written as rows of letters, one letter per pixel ('.' is
 * transparent), painted once into a canvas.
 *
 * @param {string[]} rows all the same length
 * @param {Record<string, string>} colors letter -> css colour
 * @param {number} [scale] pixels per letter
 */
export function paintRows(rows, colors, scale = 1) {
    const width = rows[0].length;
    const { canvas, ctx } = makeCanvas(width * scale, rows.length * scale);
    rows.forEach((row, y) => {
        if (row.length !== width) throw new Error(`Pixel row ${y} is ${row.length} wide, expected ${width}: ${row}`);
        [...row].forEach((letter, x) => {
            if (letter === '.') return;
            const color = colors[letter];
            if (!color) throw new Error(`No colour for "${letter}"`);
            ctx.fillStyle = color;
            ctx.fillRect(x * scale, y * scale, scale, scale);
        });
    });
    return canvas;
}

/** A copy of an image flipped left to right. */
export function mirror(image) {
    const { canvas, ctx } = makeCanvas(image.width, image.height);
    ctx.scale(-1, 1);
    ctx.drawImage(image, -image.width, 0);
    return canvas;
}
