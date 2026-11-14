import { IRON, BASALT, flame, gem, halo, onWall, prism, seam, smoke, wallRect, withAlpha } from './forgeArt.js';
import { toScreen } from './iso.js';
import { softGlow } from './perf.js';
import { BUILDING_INFO, HERO_INFO } from './labels.js';

/**
 * What a fusion looks like.
 *   building  a rune circle on the ground, turning, in the colours of its
 *             parts; the body bears the marks of what was fused into it: a
 *             band in each donor's colour and the donor's emblem on one side
 *             (the first donor on the left, the second on the right): a Rune
 *             Tower's brazier, a Lightning Tower's horn, a Frost Tower's ice,
 *             a Wall's spikes and armour, and so on. One gem per grade
 *             circles above.
 *   hero      a ring at its feet in the parts' colours, and it wears what
 *             its donors were known for (forgeArt.js: backMarks, headMarks),
 *             plus the gems.
 * `parts` are the server's fusion parts ([{type, path|form, power}]); the
 * first is the body.
 */

export function partColor(part) {
    return BUILDING_INFO[part.type]?.glow ?? HERO_INFO[part.type]?.color ?? '#ffb347';
}

export function fusionColors(parts) {
    return parts.map(partColor);
}

// ── buildings ───────────────────────────────────────────────────────────
export function drawFusionUnder(ctx, cam, b, time) {
    const colors = fusionColors(b.fusion.parts);
    const c = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, 0);
    const rx = (b.size * 32 + 14) * cam.scale;
    halo(ctx, c.x, c.y, rx * 1.1, colors[colors.length - 1], 0.35);
    runeRing(ctx, c, rx, rx / 2, colors, time * 0.6 + b.id, cam.scale);
}

export function drawFusionOver(ctx, cam, b, time) {
    const s = cam.scale;
    const parts = b.fusion.parts;
    const body = bodyOf(b);
    parts.slice(1, 3).forEach((part, i) => {
        const color = partColor(part);
        const z = body.z0 + (body.z1 - body.z0) * (i ? 0.78 : 0.22);
        seam(ctx, cam, body.x0, body.y0, body.w, body.w, z, withAlpha(color, 0.75 + 0.25 * Math.sin(time * 2.4 + i * 2)), 2.2);
        MARKS[part.type]?.(ctx, cam, markPlace(cam, body, i ? 'right' : 'left'), { time, s, seed: b.id * 1.7 + i, color });
    });
    const top = BUILDING_INFO[b.type]?.height ?? 40;
    const over = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, top * 0.8);
    gems(ctx, { x: over.x, y: over.y - (top * 0.45 + 18) * s }, b.fusion.grade, fusionColors(parts), time, s);
}

// ── where the marks go ──────────────────────────────────────────────────
const TOWER_BODIES = new Set(['rune_tower', 'lightning_tower', 'frost_tower']);
// the main box of the other bodies: [inset, width, bottom, top] in cells and pixels
const BOXES = {
    wall: [0.04, 0.92, 0, 18],
    rune_quarry: [0.1, 1.8, 0, 6],
    scrap_foundry: [0.2, 1.5, 0, 30],
    mana_well: [0.2, 1.6, 0, 14],
    data_node: [0.55, 0.9, 8, 46],
};

/** The body's shaft (x0, y0, w, z0..z1) and the two top corners an emblem stands on. */
function bodyOf(b) {
    const { x, y } = b;
    if (TOWER_BODIES.has(b.type)) {         // the shaft, and the front merlons of the crown
        return { x0: x + 0.5, y0: y + 0.5, w: 1.0, z0: 12, z1: 56, left: [x + 0.51, y + 1.49, 68], right: [x + 1.49, y + 0.51, 68] };
    }
    const [inset, w, z0, z1] = BOXES[b.type] ?? [0.2, b.size - 0.4, 0, 20];
    const x0 = x + inset;
    const y0 = y + inset;
    return { x0, y0, w, z0, z1, left: [x0 + 0.14, y0 + w - 0.14, z1], right: [x0 + w - 0.14, y0 + 0.14, z1] };
}

/**
 * One side of the body: `W(u, z)` draws on its face (u in pixels across, 0 at
 * the middle), `half` is half its width in u, `at` the top corner (screen),
 * `corner` the same in cells, `out` the screen step one cell away from the face.
 */
function markPlace(cam, body, side) {
    const { x0, y0, w, z0, z1 } = body;
    const W = side === 'left' ? onWall(cam, 'left', x0 + w / 2, y0 + w) : onWall(cam, 'right', x0 + w, y0 + w / 2);
    const corner = body[side];
    const at = toScreen(cam, ...corner);
    const step = side === 'left' ? toScreen(cam, x0, y0 + w + 1, 0) : toScreen(cam, x0 + w + 1, y0, 0);
    const from = side === 'left' ? toScreen(cam, x0, y0 + w, 0) : toScreen(cam, x0 + w, y0, 0);
    return { side, W, half: w * 16 * 0.8, z0, z1, at, corner, body, out: { x: step.x - from.x, y: step.y - from.y } };
}

// ── the marks: one per kind of donor ────────────────────────────────────
const MARKS = {
    /** A small iron brazier on the corner, its flame the Rune Tower's. */
    rune_tower(ctx, cam, m, { time, s, seed }) {
        const [cx, cy, cz] = m.corner;
        prism(ctx, cam, cx - 0.12, cy - 0.12, 0.24, 0.24, cz, 4, IRON);
        const top = toScreen(cam, cx, cy, cz + 4);
        halo(ctx, top.x, top.y - 4 * s, 18 * s, '#ff8a2a', 0.8);
        flame(ctx, top, 6 * s, time, seed, '#ffe08a', '#ff5a00');
    },

    /** A copper horn growing out of the corner, crackling. */
    lightning_tower(ctx, cam, m, { time, s, seed }) {
        const a = m.at;
        const dir = Math.sign(m.out.x) || 1;
        const tip = { x: a.x + dir * 9 * s, y: a.y - 22 * s };
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#6b4630';
        ctx.lineWidth = 3.2 * s;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(a.x + dir * 10 * s, a.y - 10 * s, tip.x, tip.y);
        ctx.stroke();
        if (Math.sin(time * 11 + seed) > -0.2) {
            softGlow(ctx, '#6fd3ff', 10 * s);
            ctx.strokeStyle = '#bff0ff';
            ctx.lineWidth = 1.3 * s;
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            for (let k = 1; k <= 4; k++) {
                ctx.lineTo(tip.x + dir * (k * 3 + Math.sin(time * 37 + k * 2.1 + seed) * 2) * s,
                    tip.y + (Math.sin(time * 41 + k * 1.7) * 4 - k * 1.5) * s);
            }
            ctx.stroke();
        }
        ctx.restore();
        halo(ctx, tip.x, tip.y, 16 * s, '#6fd3ff', 0.7);
    },

    /** Ice crystals grown on the corner. */
    frost_tower(ctx, cam, m, { time, s }) {
        const a = m.at;
        const dir = Math.sign(m.out.x) || 1;
        halo(ctx, a.x, a.y - 6 * s, 18 * s, '#9fe3ff', 0.6 + 0.2 * Math.sin(time * 2));
        for (const [dx, dy, r] of [[0, -7, 5.5], [dir * 6, -3, 4], [-dir * 4, -2, 3.2]]) {
            gem(ctx, { x: a.x + dx * s, y: a.y + dy * s }, r * s, '#f1fbff', '#7fcfff');
        }
    },

    /** The Wall's spite: the face turns to masonry, and white spikes stick out of it. */
    wall(ctx, cam, m, { s }) {
        const { z0, z1, half } = m;
        ctx.save();
        ctx.strokeStyle = 'rgba(11, 7, 5, 0.75)';
        ctx.lineWidth = Math.max(1, s * 0.9);
        for (let row = 0, z = z0 + 4; z < z1 - 2; row++, z += 7) {     // block joints, staggered
            const a = m.W(-half, z);
            const b = m.W(half, z);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            for (let u = -half + (row % 2 ? 4 : 9); u < half; u += 10) {
                const p = m.W(u, z);
                const q = m.W(u, Math.min(z + 7, z1));
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
        }
        ctx.lineWidth = Math.max(1, s * 0.8);
        ctx.strokeStyle = '#0b0705';
        for (const [k, f] of [[-0.55, 0.35], [0.05, 0.35], [0.6, 0.35], [-0.25, 0.68], [0.35, 0.68]]) {
            const z = z0 + (z1 - z0) * f;
            const u = k * half;
            const l = m.W(u - 3.5, z - 1);
            const r = m.W(u + 3.5, z - 1);
            const mid = m.W(u, z);
            const tip = { x: mid.x + m.out.x * 0.42, y: mid.y + m.out.y * 0.42 - 4 * s };
            ctx.fillStyle = '#ece6da';
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(tip.x, tip.y);
            ctx.lineTo(r.x, r.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    },

    /** The trap's rune, carved into the face and glowing. */
    rune_trap(ctx, cam, m, { time, s }) {
        const z = m.z0 + (m.z1 - m.z0) * 0.5;
        const glow = 0.6 + 0.4 * Math.sin(time * 3);
        ctx.save();
        ctx.strokeStyle = withAlpha('#ff9a5a', glow);
        softGlow(ctx, '#ff7a3d', 10 * s);
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
            const a = (Math.PI * 2 * i) / 24;
            const p = m.W(Math.cos(a) * 8, z + Math.sin(a) * 8);
            if (i) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
        }
        const [t, l, r, bl, br] = [m.W(0, z + 5), m.W(-4, z), m.W(4, z), m.W(-4, z - 5), m.W(4, z - 5)];
        ctx.moveTo(t.x, t.y); ctx.lineTo(r.x, r.y); ctx.lineTo(bl.x, bl.y);
        ctx.moveTo(t.x, t.y); ctx.lineTo(l.x, l.y); ctx.lineTo(br.x, br.y);
        ctx.stroke();
        ctx.restore();
    },

    /** Amber stone breaking out of the corner, as in the quarry. */
    rune_quarry(ctx, cam, m, { time, s }) {
        const a = m.at;
        halo(ctx, a.x, a.y - 4 * s, 14 * s, '#ffb547', 0.6 + 0.3 * Math.sin(time * 3));
        gem(ctx, { x: a.x, y: a.y - 5 * s }, 4.5 * s, '#ffe3a6', '#ff9a1f');
        gem(ctx, { x: a.x + 5 * s, y: a.y - 1 * s }, 3 * s, '#ffe3a6', '#ff9a1f');
    },

    /** A little smoking chimney, the foundry's. */
    scrap_foundry(ctx, cam, m, { time, s, seed }) {
        const [cx, cy, cz] = m.corner;
        prism(ctx, cam, cx - 0.1, cy - 0.1, 0.2, 0.2, cz, 14, IRON);
        const top = toScreen(cam, cx, cy, cz + 14);
        halo(ctx, top.x, top.y, 9 * s, '#ff7a3d', 0.6);
        smoke(ctx, top, time, seed * 0.13, s * 0.6, 3);
    },

    /** A drop of mana floating over the corner. */
    mana_well(ctx, cam, m, { time, s, seed }) {
        const a = m.at;
        const c = { x: a.x, y: a.y - (10 + 2 * Math.sin(time * 2 + seed)) * s };
        halo(ctx, c.x, c.y, 16 * s, '#b48cff', 0.8);
        const g = ctx.createRadialGradient(c.x - 1.5 * s, c.y - 1.5 * s, 0.5, c.x, c.y, 4.5 * s);
        g.addColorStop(0, '#f1e6ff');
        g.addColorStop(1, '#6a3fc4');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();
    },

    /** The data node's lights, blinking on the face. */
    data_node(ctx, cam, m, { time, seed }) {
        const z = m.z0 + (m.z1 - m.z0) * 0.5;
        for (let row = 0; row < 2; row++) {
            for (let col = -1; col <= 1; col++) {
                const on = Math.sin(time * 4 + row * 1.7 + col * 2.9 + seed) > 0.1;
                ctx.fillStyle = on ? '#4dff9a' : 'rgba(77, 255, 154, 0.2)';
                wallRect(ctx, m.W, col * 6 - 2, col * 6 + 2, z + row * 6 - 1, z + row * 6 + 2);
                ctx.fill();
            }
        }
    },
};

/** A turning ring of rune dashes, one arc per colour. */
function runeRing(ctx, c, rx, ry, colors, turn, s) {
    ctx.save();
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = 'round';
    const n = colors.length;
    for (let i = 0; i < n; i++) {
        const from = turn + (i / n) * Math.PI * 2;
        ctx.strokeStyle = colors[i];
        softGlow(ctx, colors[i], 8 * s);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, from + 0.12, from + (Math.PI * 2) / n - 0.12);
        ctx.stroke();
        for (let k = 1; k < 4; k++) {                 // little rune ticks across the arc
            const a = from + (k / 4) * ((Math.PI * 2) / n);
            const px = c.x + Math.cos(a) * rx;
            const py = c.y + Math.sin(a) * ry;
            ctx.beginPath();
            ctx.moveTo(px - 2.5 * s, py - 2.5 * s);
            ctx.lineTo(px + 2.5 * s, py + 2.5 * s);
            ctx.stroke();
        }
    }
    ctx.restore();
}

/** One gem per grade, circling over the fused element. */
function gems(ctx, c, grade, colors, time, s) {
    for (let i = 0; i < grade; i++) {
        const a = time * 1.4 + (i / grade) * Math.PI * 2;
        const x = c.x + Math.cos(a) * 10 * s * Math.min(grade, 3) * 0.6;
        const y = c.y + Math.sin(a) * 3 * s;
        const color = colors[i % colors.length];
        const r = 3.4 * s;
        halo(ctx, x, y, 9 * s, color, 0.8);
        ctx.fillStyle = '#fff6e0';
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.4);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
    }
}

// ── heroes (drawn in the hero's own units: feet at 0, about 48 tall) ────
export function drawHeroFusionUnder(ctx, parts, time) {
    const colors = fusionColors(parts);
    runeRing(ctx, { x: 0, y: 0 }, 17, 6, colors, time * 1.2, 1);
}

export function drawHeroFusionOver(ctx, parts, grade, time) {
    gems(ctx, { x: 0, y: -58 }, grade, fusionColors(parts), time, 1);
}
