/**
 * Glass tubes under the sea, drawn over the road (like render/road/tunnel.js)
 * but seen through: the sea and the city stay in sight. Each strip inside a
 * tube draws the glass's highlights from its far cross-section to its near
 * one, long lines along the tube that catch the light; every few segments a
 * ring of metal holds the glass; where the road dives into a tube, a thick
 * collar marks the mouth. Drawn far to near, so nearer rings cover farther ones.
 * Inside, the glass tints the whole view a little.
 *
 * Every number is in half widths of road: the tube `wide` from the middle
 * and `tall` above the road, an arch over it (its lower half is buried).
 *
 * @typedef {{ring: string, ringLight: string, shine: string, glass: string, collar: string}} TubeLook a theme's `tube`
 */
const SHAPE = { wide: 1.45, tall: 1.4, ringEvery: 6, ring: 0.05, collar: 0.14 };
/** Highlights are drawn from this many strips away: nearer, one strip spans the screen and its line would be a long bar. */
const SHINE_FROM = 3;
/** Where the highlights run along the glass: angles over the arch, as shares of a half turn from the right. */
const SHINE = [0.18, 0.42, 0.5, 0.83];
/** Steps round an arch, per pixel of its width. */
const ARC_STEP = 0.6;

/** A point of the arch at a strip's edge: `share` of a half turn from its right foot. */
function onArch(edge, share) {
    const angle = Math.PI * share;
    return { x: edge.x + Math.cos(angle) * SHAPE.wide * edge.w, y: edge.y - Math.sin(angle) * SHAPE.tall * edge.w };
}

/** The arch at an edge, `thick` pixels thick, from its right foot over to its left one. */
function arch(ctx, edge, thick, color) {
    const steps = Math.max(8, Math.round(SHAPE.wide * edge.w * ARC_STEP * 4));
    ctx.fillStyle = color;
    for (let k = 0; k <= steps; k++) {
        const { x, y } = onArch(edge, k / steps);
        ctx.fillRect(Math.round(x - thick / 2), Math.round(y - thick / 2), thick, thick);
    }
}

/** A highlight along the glass, from the far edge to the near one. */
function shine(ctx, far, near, share) {
    const a = onArch(far, share);
    const b = onArch(near, share);
    const steps = Math.max(1, Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
    for (let k = 0; k <= steps; k++) {
        ctx.fillRect(Math.round(a.x + ((b.x - a.x) * k) / steps), Math.round(a.y + ((b.y - a.y) * k) / steps), 1, 1);
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./project.js').Strip[]} strips near to far, `tube` set inside one
 * @param {{width: number, height: number}} size
 * @param {TubeLook} look
 */
export function paintTubes(ctx, strips, { width, height }, look) {
    for (let i = strips.length - 1; i >= 0; i--) {
        const strip = strips[i];
        if (!strip.tube) continue;
        ctx.fillStyle = look.shine;
        if (i >= SHINE_FROM) for (const share of SHINE) shine(ctx, strip.far, strip.near, share);
        const mouth = i > 0 && !strips[i - 1].tube;
        if (mouth) {
            arch(ctx, strip.near, Math.max(2, Math.round(strip.near.w * SHAPE.collar)), look.collar);
            arch(ctx, strip.near, Math.max(1, Math.round(strip.near.w * SHAPE.ring)), look.ringLight);
        } else if (strip.index % SHAPE.ringEvery === 0) {
            const thick = Math.max(1, Math.round(strip.near.w * SHAPE.ring));
            arch(ctx, strip.near, thick + 1, look.ring);
            arch(ctx, strip.near, Math.max(1, thick - 1), look.ringLight);
        }
    }
    if (strips[0]?.tube) {
        ctx.fillStyle = look.glass;
        ctx.fillRect(0, 0, width, height);
    }
}
