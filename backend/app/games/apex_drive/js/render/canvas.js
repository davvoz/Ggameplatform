/** A fresh offscreen canvas and its 2D context, drawn with square pixels. */
export function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
}

/**
 * Draws `image` repeated sideways across `width`, shifted left by `offset`
 * pixels: a backdrop layer that wraps around the world.
 */
export function drawWrapped(ctx, image, offset, y, width) {
    const tile = image.width;
    let x = -(((Math.round(offset) % tile) + tile) % tile);
    while (x < width) {
        ctx.drawImage(image, x, y);
        x += tile;
    }
}
