// ═══════════════════════════════════════════════
//  Shared rendering helper functions for BgFx
// ═══════════════════════════════════════════════

/**
 * Draw a smooth rounded blob shape using quadratic curves.
 * Used by canopy trees, ice sheets, snow drifts, etc.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ox - center X offset
 * @param {number} oy - center Y offset
 * @param {number} radius - base radius
 * @param {number} scale - scale multiplier
 * @param {number[]} shape - array of per-vertex radius multipliers
 * @param {number} [elongY=1] - vertical squash factor (1 = circle)
 */
export function drawBlob(ctx, ox, oy, radius, scale, shape, elongY = 1) {
    const n = shape.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const a0 = (Math.PI * 2 / n) * i;
        const a1 = (Math.PI * 2 / n) * ((i + 1) % n);
        const r0x = radius * scale * shape[i];
        const r0y = r0x * elongY;
        const r1x = radius * scale * shape[(i + 1) % n];
        const r1y = r1x * elongY;
        const px = ox + Math.cos(a0) * r0x;
        const py = oy + Math.sin(a0) * r0y;
        if (i === 0) ctx.moveTo(px, py);
        const aMid = (a0 + a1) * 0.5;
        ctx.quadraticCurveTo(
            ox + Math.cos(aMid) * (r0x + r1x) * 0.55,
            oy + Math.sin(aMid) * (r0y + r1y) * 0.55,
            ox + Math.cos(a1) * r1x,
            oy + Math.sin(a1) * r1y
        );
    }
    ctx.closePath();
}

/**
 * Draw an angular polygon (for rocks, crystals, obsidian, boulders).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ox - center X offset
 * @param {number} oy - center Y offset
 * @param {number} radius - base radius
 * @param {number} scale - scale multiplier
 * @param {number[]} shape - array of per-vertex radius multipliers
 */
export function drawPolygon(ctx, ox, oy, radius, scale, shape) {
    const n = shape.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i;
        const r = radius * scale * shape[i];
        const px = ox + Math.cos(a) * r;
        const py = oy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

/**
 * Draw a rounded rectangle path (for cactus trunk/arms).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w - width
 * @param {number} h - height
 * @param {number} r - corner radius
 */
export function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

/**
 * Generate a random shape array (array of radius multipliers).
 * @param {number} n - number of vertices
 * @param {number} min - minimum multiplier
 * @param {number} range - random range added to min
 * @param {boolean} [alternate=false] - alternate between two ranges (for crystal spikes)
 * @param {number} [altMin=0.25] - alternate minimum
 * @param {number} [altRange=0.3] - alternate range
 * @returns {number[]}
 */
export function generateShape(n, min, range, alternate = false, altMin = 0.25, altRange = 0.3) {
    const shape = [];
    for (let i = 0; i < n; i++) {
        if (alternate && i % 2 !== 0) {
            shape.push(altMin + Math.random() * altRange);
        } else {
            shape.push(min + Math.random() * range);
        }
    }
    return shape;
}

/**
 * Pick a random color from a weighted palette.
 * Each entry: { weight, hue: [base, range], sat: [base, range], light: [base, range, nearMul?] }
 * @param {Array} palette - color entries
 * @param {number} [near=0] - depth layer influence
 * @returns {{ hue: number, sat: number, lightness: number }}
 */
export function pickColor(palette, near = 0) {
    const roll = Math.random();
    let cumulative = 0;
    for (const entry of palette) {
        cumulative += entry.weight;
        if (roll < cumulative) {
            return {
                hue: entry.hue[0] + Math.random() * entry.hue[1],
                sat: entry.sat[0] + Math.random() * entry.sat[1],
                lightness: entry.light[0] + near * (entry.light[2] || 0) + Math.random() * entry.light[1]
            };
        }
    }
    // Fallback to last
    const last = palette[palette.length - 1];
    return {
        hue: last.hue[0] + Math.random() * last.hue[1],
        sat: last.sat[0] + Math.random() * last.sat[1],
        lightness: last.light[0] + near * (last.light[2] || 0) + Math.random() * last.light[1]
    };
}

/**
 * Standard cartoon render pipeline for blob/polygon shapes:
 * shadow → body → depth → highlight → specular
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} opts
 */
export function cartoonRender(ctx, opts) {
    const {
        alpha, hue, sat, lightness, size,
        shadowOx = 4, shadowOy = 4,
        shadowColor = 'rgba(8,5,2,0.7)',
        drawShape, // function(ox, oy, scale)
        depthScale = 0.55, depthOx = 0.06, depthOy = 0.08,
        highlightRx = 0.35, highlightRy = 0.28,
        specularR = 0.12,
        extraRender // optional function for additional details
    } = opts;

    const R = size;

    // 1) Shadow
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = shadowColor;
    drawShape(shadowOx, shadowOy, 0.95);
    ctx.fill();

    // 2) Main body
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue},${sat}%,${lightness}%)`;
    drawShape(0, 0, 1);
    ctx.fill();

    // 3) Darker inner depth
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = `hsl(${hue + 5},${sat}%,${Math.max(6, lightness - 5)}%)`;
    drawShape(R * depthOx, R * depthOy, depthScale);
    ctx.fill();

    // 4) Top highlight
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = `hsl(${hue - 5},${sat + 8}%,${lightness + 12}%)`;
    ctx.beginPath();
    ctx.ellipse(-R * 0.15, -R * 0.15, R * highlightRx, R * highlightRy, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 5) Specular dot
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = `hsl(${hue},${sat + 10}%,${lightness + 22}%)`;
    ctx.beginPath();
    ctx.arc(-R * 0.12, -R * 0.18, R * specularR, 0, Math.PI * 2);
    ctx.fill();

    // 6) Extra rendering
    if (extraRender) extraRender();
}
