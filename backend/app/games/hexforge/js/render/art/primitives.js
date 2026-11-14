import { TILE_W, toScreen } from '../../core/iso.js';
import { perf, softGlow } from '../perf.js';

/**
 * Hexforge art, "Forgia Infernale": iron, basalt and molten metal, drawn
 * from shapes on the canvas (no image files). Heights are unscaled screen
 * pixels, like iso.js; every painter takes the camera and draws in place.
 *
 * This is the kit every painter shares: materials, boxes and walls, glows,
 * flames, smoke, gems, the curves limbs swing along, colour helpers.
 */

export const IRON = { top: '#4d3d31', left: '#2f251e', right: '#211913' };
export const BASALT = { top: '#3b3633', left: '#26221f', right: '#1b1816' };
const EDGE = '#0b0705';

/**
 * An iso box: footprint x, y, w (along x), d (along y) in cells, from height
 * z0 up by h (unscaled px), faces in `mat` {top, left, right}, outlined in `edge`.
 */
export function prism(ctx, cam, { x, y, w, d, z0, h, mat, edge = EDGE }) {
    const P = (px, py, pz) => toScreen(cam, px, py, pz);
    const faces = [
        [mat.left, [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)]],
        [mat.right, [P(x + w, y + d, z0), P(x + w, y, z0), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h)]],
        [mat.top, [P(x, y, z0 + h), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)]],
    ];
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, cam.scale);
    for (const [fill, pts] of faces) {
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
        if (edge) {
            ctx.strokeStyle = edge;
            ctx.stroke();
        }
    }
    // a thin highlight on the two front top edges catches the forge light
    const t = faces[2][1];
    ctx.strokeStyle = 'rgba(255, 190, 120, 0.18)';
    ctx.beginPath();
    ctx.moveTo(t[3].x, t[3].y); ctx.lineTo(t[2].x, t[2].y); ctx.lineTo(t[1].x, t[1].y);
    ctx.stroke();
}

/**
 * Draw flat on a wall. `face` 'left' is the plane y = ay (the wall runs along
 * x), 'right' the plane x = ax (it runs along y). The returned W(u, z) maps
 * u screen pixels across the wall (positive to the right on screen) and a
 * height z to the canvas: doors, windows and lights drawn through it follow
 * the wall's slope instead of sitting level on the screen.
 */
export function onWall(cam, face, ax, ay) {
    const cells = (u) => u / (TILE_W / 2);
    return face === 'right'
        ? (u, z) => toScreen(cam, ax, ay - cells(u), z)
        : (u, z) => toScreen(cam, ax + cells(u), ay, z);
}

/** A rectangle on a wall, from u0 to u1 across and z0 to z1 up. */
export function wallRect(ctx, W, u0, u1, z0, z1) {
    path(ctx, [W(u0, z0), W(u1, z0), W(u1, z1), W(u0, z1)]);
}

export function path(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
}

export function halo(ctx, x, y, radius, color, strength = 1) {
    if (radius <= 0 || strength <= 0) return;
    if (perf.on) {
        haloSprite(ctx, x, y, radius, color, strength);
        return;
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, withAlpha(color, 0.55 * Math.min(1, strength)));
    g.addColorStop(1, withAlpha(color, 0));
    const before = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = before;
}

// Performance mode: each halo colour is painted once into a small canvas and
// then only stretched into place, instead of building a new gradient per halo.
const HALO_SIZE = 128;

const haloCache = new Map();

function haloSprite(ctx, x, y, radius, color, strength) {
    let sprite = haloCache.get(color);
    if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = HALO_SIZE;
        sprite.height = HALO_SIZE;
        const c = sprite.getContext('2d');
        const r = HALO_SIZE / 2;
        const g = c.createRadialGradient(r, r, 0, r, r, r);
        g.addColorStop(0, withAlpha(color, 0.55));
        g.addColorStop(1, withAlpha(color, 0));
        c.fillStyle = g;
        c.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
        haloCache.set(color, sprite);
    }
    const before = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * Math.min(1, strength);
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = before;
}

/** A glowing seam across the two front faces of a box at height z. */
export function seam(ctx, cam, { x, y, w, d, z, color, width = 1.6 }) {
    const a = toScreen(cam, x, y + d, z);
    const b = toScreen(cam, x + w, y + d, z);
    const c = toScreen(cam, x + w, y, z);
    ctx.save();
    softGlow(ctx, color, 8 * cam.scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * cam.scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
    ctx.stroke();
    ctx.restore();
}

/** A flickering flame standing on point c. */
export function flame(ctx, c, size, time, seed, hot, mid) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
        const f = 0.75 + 0.25 * Math.sin(time * (9 + i * 3) + seed + i);
        ctx.globalAlpha = 0.9 - i * 0.22;
        ctx.fillStyle = i === 0 ? mid : hot;
        const w = size * (0.55 - i * 0.13);
        const h = size * f * (1.9 - i * 0.45);
        const sway = Math.sin(time * 7 + seed) * size * 0.15;
        ctx.beginPath();
        ctx.moveTo(c.x - w, c.y);
        ctx.quadraticCurveTo(c.x - w * 0.4, c.y - h * 0.6, c.x + sway, c.y - h);
        ctx.quadraticCurveTo(c.x + w * 0.4, c.y - h * 0.55, c.x + w, c.y);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

export function smoke(ctx, c, time, seed, s, count = 4) {
    for (let i = 0; i < count; i++) {
        const life = (time * 0.35 + i / count + seed) % 1;
        ctx.fillStyle = `rgba(70, 62, 58, ${0.32 * (1 - life)})`;
        ctx.beginPath();
        ctx.arc(c.x + life * 14 * s, c.y - life * 46 * s, (4 + life * 11) * s, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function gem(ctx, c, r, light, dark) {
    path(ctx, [{ x: c.x, y: c.y - r * 1.3 }, { x: c.x + r, y: c.y }, { x: c.x, y: c.y + r }, { x: c.x - r, y: c.y }]);
    ctx.fillStyle = dark;
    ctx.fill();
    path(ctx, [{ x: c.x, y: c.y - r * 1.3 }, { x: c.x + r, y: c.y }, { x: c.x, y: c.y }]);
    ctx.fillStyle = light;
    ctx.fill();
}

export const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
};

/**
 * Arm angle through a blow: rest → raised while winding up → hit on impact →
 * back to rest. `over` = true brings the arm down over the head (an overhead
 * smash) instead of swinging it up from below.
 */
export function swing(a, rest, raised, hit, over = false) {
    if (a === null) return rest;
    if (a < 0) {
        const w = 1 + a;
        if (w < 0.7) return lerp(rest, raised, easeOut(w / 0.7));
        return lerp(raised, over ? hit - Math.PI * 2 : hit, easeIn((w - 0.7) / 0.3));
    }
    return lerp(hit, rest, easeOut(a));
}

/** 0..1, peaking when the blow lands: how far the body lunges into it. */
export function lunge(a) {
    if (a === null) return 0;
    return Math.max(0, 1 - Math.abs(a) * (a < 0 ? 3 : 2));
}

function lerp(a, b, k) {
    return a + (b - a) * k;
}

function easeOut(k) {
    return 1 - (1 - k) * (1 - k);
}

function easeIn(k) {
    return k * k;
}

/** A limb from (x, y), `length` long, `angle` radians forward of straight down. */
export function limbEnd(x, y, length, angle) {
    return { x: x + Math.sin(angle) * length, y: y + Math.cos(angle) * length };
}

export function stroke(ctx, color, width, points) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const q of points.slice(1)) ctx.lineTo(q.x, q.y);
    ctx.stroke();
}

function hexToRgb(hex) {
    const n = Number.parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function shade(hex, factor) {
    const [r, g, b] = hexToRgb(hex).map((c) => Math.min(255, Math.round(c * factor)));
    return `rgb(${r}, ${g}, ${b})`;
}
