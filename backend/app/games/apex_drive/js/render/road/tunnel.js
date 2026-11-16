/**
 * Tunnels, painted over the road like the 16-bit racers did: each road strip
 * inside a tunnel gets a frame (ceiling above, walls at the sides) between
 * its near and far cross-section, drawn far to near, so the strips nearer
 * cover the farther ones and the far end of the tunnel stays open as a
 * lit hole. A tunnel mouth seen from outside gets a face round its opening
 * (the building the road dives into); from inside, the frame of the nearest
 * strip is closed all round.
 *
 * Every number is in half widths of road: walls `wall` out from the middle,
 * the ceiling `height` above the road, the face `face` above the ground.
 */
const SHAPE = { wall: 1.5, height: 1.25, lampEvery: 4, face: 2.2 };

/** The cross-section of the tunnel at a strip's edge, on screen. */
function section(edge) {
    return {
        l: Math.round(edge.x - SHAPE.wall * edge.w),
        r: Math.round(edge.x + SHAPE.wall * edge.w),
        t: Math.round(edge.y - SHAPE.height * edge.w),
        b: Math.round(edge.y),
    };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./project.js').Strip[]} strips near to far, `tunnel` set inside one
 * @param {{width: number}} size
 * @param {{wall: string[], ceiling: string[], lamp: string, face: string}} look a theme's `tunnel`
 * @param {number} bandSegments segments per light or dark band of road
 */
export function paintTunnels(ctx, strips, { width }, look, bandSegments) {
    for (let i = strips.length - 1; i >= 0; i--) {
        const strip = strips[i];
        if (!strip.tunnel) continue;
        const band = Math.floor(strip.index / bandSegments) % 2;
        const near = section(strip.near);
        frame(ctx, near, section(strip.far), look, band, strip.index % SHAPE.lampEvery === 0);
        const mouth = !strips[i - 1]?.tunnel;
        if (mouth && i === 0) surround(ctx, near, width, look.ceiling[band], 0);
        else if (mouth) {
            const roof = surround(ctx, near, width, look.face, near.t - Math.round(SHAPE.face * strip.near.w));
            ctx.fillStyle = look.wall[0];
            if (roof > 0) ctx.fillRect(0, roof, width, 1);
        }
    }
}

/** Ceiling and walls between two cross-sections; a lamp line on the ceiling now and then. */
function frame(ctx, near, far, look, band, lamp) {
    ctx.fillStyle = look.ceiling[band];
    ctx.fillRect(near.l, near.t, near.r - near.l, far.t - near.t);
    ctx.fillStyle = look.wall[band];
    ctx.fillRect(near.l, far.t, far.l - near.l, far.b - far.t);
    ctx.fillRect(far.r, far.t, near.r - far.r, far.b - far.t);
    if (lamp) {
        ctx.fillStyle = look.lamp;
        ctx.fillRect(far.l + Math.round((far.r - far.l) * 0.3), far.t, Math.max(1, Math.round((far.r - far.l) * 0.4)), 1);
    }
}

/**
 * Everything round an opening, above the road's level, from row `top` down:
 * the tunnel's face (a block `face` half widths tall), or its inside around the camera.
 */
function surround(ctx, opening, width, color, top) {
    const from = Math.max(0, top);
    ctx.fillStyle = color;
    ctx.fillRect(0, from, width, Math.max(0, opening.t - from));
    ctx.fillRect(0, opening.t, Math.max(0, opening.l), opening.b - opening.t);
    ctx.fillRect(opening.r, opening.t, Math.max(0, width - opening.r), opening.b - opening.t);
    return from;
}
