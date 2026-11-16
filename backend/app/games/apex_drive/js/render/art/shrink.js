import { makeCanvas } from '../canvas.js';

/**
 * Pixel art made smaller, at a fixed set of sizes (whole pixel widths), each
 * painted once and kept, so a sprite looks the same every frame it is drawn
 * at that size.
 *
 * Each new pixel is the average of the old pixels it covers, each weighed
 * by how much of it is covered. So one size is only a little different from
 * the next: a car coming closer grows smoothly instead of changing colours
 * and shape at every pixel it gains (picking one colour per block did that,
 * because the blocks fall differently at every size). A new pixel is solid
 * when at least `SOLID` of what it covers is; it is clear otherwise.
 */
const SOLID = 0.45;

/**
 * @param {Uint32Array} source width x height pixel words
 * @param {number} width @param {number} height the source's size
 * @param {number} newWidth @param {number} newHeight smaller or equal
 * @returns {Uint32Array}
 */
export function shrinkPixels(source, width, height, newWidth, newHeight) {
    const columns = spans(width, newWidth);
    const rows = spans(height, newHeight);
    const area = (width / newWidth) * (height / newHeight);
    const out = new Uint32Array(newWidth * newHeight);
    rows.forEach((rowSpan, y) => {
        columns.forEach((columnSpan, x) => {
            out[y * newWidth + x] = average(source, width, columnSpan, rowSpan, area);
        });
    });
    return out;
}

/** For each new pixel along one side: the old pixels it covers, and how much of each. */
function spans(size, newSize) {
    const step = size / newSize;
    return Array.from({ length: newSize }, (_, i) => {
        const from = i * step;
        const to = from + step;
        const covered = [];
        for (let old = Math.floor(from); old < to; old++) {
            const share = Math.min(to, old + 1) - Math.max(from, old);
            if (share > 1e-9) covered.push([old, share]);
        }
        return covered;
    });
}

/** The covered pixels' colour, weighed by coverage and opacity; clear if mostly clear. */
function average(source, width, columnSpan, rowSpan, area) {
    let r = 0;
    let g = 0;
    let b = 0;
    let opacity = 0;
    for (const [y, rowShare] of rowSpan) {
        for (const [x, columnShare] of columnSpan) {
            const pixel = source[y * width + x];
            const weight = rowShare * columnShare * ((pixel >>> 24) / 255);
            r += (pixel & 255) * weight;
            g += ((pixel >>> 8) & 255) * weight;
            b += ((pixel >>> 16) & 255) * weight;
            opacity += weight;
        }
    }
    if (opacity < SOLID * area) return 0;
    const channel = (sum) => Math.round(sum / opacity);
    return ((255 << 24) | (channel(b) << 16) | (channel(g) << 8) | channel(r)) >>> 0;
}

const shrunk = new WeakMap();

/** The image at a whole pixel width no larger than its own, painted once. */
export function atWidth(image, width) {
    if (width >= image.width) return image;
    let sizes = shrunk.get(image);
    if (!sizes) {
        const { ctx } = makeCanvas(image.width, image.height);
        ctx.drawImage(image, 0, 0);
        sizes = { pixels: new Uint32Array(ctx.getImageData(0, 0, image.width, image.height).data.buffer), byWidth: new Map() };
        shrunk.set(image, sizes);
    }
    if (!sizes.byWidth.has(width)) {
        const height = Math.max(1, Math.round((width * image.height) / image.width));
        const { canvas, ctx } = makeCanvas(width, height);
        const data = ctx.createImageData(width, height);
        new Uint32Array(data.data.buffer).set(shrinkPixels(sizes.pixels, image.width, image.height, width, height));
        ctx.putImageData(data, 0, 0);
        sizes.byWidth.set(width, canvas);
    }
    return sizes.byWidth.get(width);
}
