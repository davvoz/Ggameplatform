/**
 * Art is drawn from code once, at load, then reused as sprites: the frame only
 * copies finished images, which is what keeps the game fast on a phone.
 */

export class Sprite {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} width art units
     * @param {number} height art units
     * @param {number} anchorX art units, the point placed on the target
     * @param {number} anchorY
     */
    constructor(canvas, width, height, anchorX, anchorY) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
    }
}

/**
 * @param {number} width art units
 * @param {number} height art units
 * @param {(ctx: CanvasRenderingContext2D) => void} draw
 * @param {{anchorX?: number, anchorY?: number, resolution?: number}} [options]
 * @returns {Sprite}
 */
export function bake(width, height, draw, { anchorX = width / 2, anchorY = height / 2, resolution = 2 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * resolution);
    canvas.height = Math.ceil(height * resolution);
    const ctx = canvas.getContext('2d');
    ctx.scale(resolution, resolution);
    draw(ctx);
    return new Sprite(canvas, width, height, anchorX, anchorY);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Sprite} sprite
 * @param {number} x screen position of the anchor
 * @param {number} y
 * @param {number} scale screen pixels per art unit
 */
export function drawSprite(ctx, sprite, x, y, scale) {
    ctx.drawImage(
        sprite.canvas,
        x - sprite.anchorX * scale,
        y - sprite.anchorY * scale,
        sprite.width * scale,
        sprite.height * scale
    );
}

/** A closed smooth outline through evenly spaced points on a polar shape. */
export function traceBlob(ctx, radiusAt, radius, points = 72) {
    const xs = new Float32Array(points);
    const ys = new Float32Array(points);
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const r = radiusAt(angle) * radius;
        xs[i] = Math.cos(angle) * r;
        ys[i] = Math.sin(angle) * r;
    }
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
        const next = (i + 1) % points;
        const midX = (xs[i] + xs[next]) / 2;
        const midY = (ys[i] + ys[next]) / 2;
        if (i === 0) ctx.moveTo(midX, midY);
        else ctx.quadraticCurveTo(xs[i], ys[i], midX, midY);
    }
    ctx.closePath();
}

/** The cut-paper look: a soft offset shadow, then a pale sticker edge. */
export function paperEdge(ctx, trace, underColor, edgeColor, offset) {
    ctx.save();
    ctx.translate(offset * 0.5, offset);
    trace();
    ctx.fillStyle = underColor;
    ctx.fill();
    ctx.restore();
    trace();
    ctx.fillStyle = edgeColor;
    ctx.fill();
}
