import { atWidth } from '../art/shrink.js';

/**
 * Where something standing on the road lands on screen: a rival, a pickup,
 * a prop. It is placed on the strip of its segment, between the strip's
 * near and far edge, `x` half widths from the middle; its `scale` is the
 * road's half width there over the half width at the player's car, so art
 * drawn at the size it has next to the player's car shrinks with distance.
 *
 * placeOnRoad is pure: numbers in, numbers out.
 *
 * @typedef {{x: number, y: number, scale: number, clip: number, depth: number}} Placement
 *   y: the screen row it stands on; clip: rows from here down are hidden by nearer road;
 *   depth: world units from the camera (to draw far to near)
 */

/**
 * @param {Map<number, import('./project.js').Strip>} stripOf strips by segment index
 * @param {number} segment index of the segment it stands on
 * @param {number} t how far into the segment, 0..1
 * @param {number} x half widths from the middle
 * @param {number} referenceWidth the road's half width (pixels) at the player's car
 * @param {number} segmentLength
 * @returns {Placement|null} null when the segment is not in view
 */
export function placeOnRoad(stripOf, segment, t, x, referenceWidth, segmentLength) {
    const strip = stripOf.get(segment);
    if (strip?.clip === undefined) return null;
    const { near, far } = strip;
    const middle = near.x + (far.x - near.x) * t;
    const half = near.w + (far.w - near.w) * t;
    return {
        x: middle + x * half,
        y: near.y + (far.y - near.y) * t,
        scale: half / referenceWidth,
        clip: strip.clip,
        depth: (strip.n + t) * segmentLength,
    };
}

/** The whole pixel width an image takes at a placement. */
export function widthAt(image, place, scale = 1) {
    return Math.max(1, Math.round(image.width * place.scale * scale));
}

/**
 * Draws an image standing at a placement, its bottom on `y`, cut at the clip
 * row. Its size is a whole pixel width (`width`, or the placement's scale),
 * its height always in the image's own proportion: smaller than the art it
 * is a shrunk copy painted once (render/art/shrink.js), so it looks the same
 * every frame; larger, it is blown up with square pixels. `lift` raises it
 * (in the image's own pixels, scaled too).
 */
export function drawStanding(ctx, image, place, { width = widthAt(image, place), lift = 0 } = {}) {
    const sprite = atWidth(image, width);
    const height = sprite === image ? Math.max(1, Math.round((width * image.height) / image.width)) : sprite.height;
    const left = Math.round(place.x - width / 2);
    const top = Math.round(place.y - height - (lift * width) / image.width);
    const rows = Math.min(height, Math.round(place.clip) - top);
    if (rows <= 0 || left > ctx.canvas.width || left + width < 0) return;
    // the rows hidden by nearer road are cut from the sprite, never squeezed
    const sourceRows = Math.max(1, Math.round((rows * sprite.height) / height));
    ctx.drawImage(sprite, 0, 0, sprite.width, sourceRows, left, top, width, rows);
}
