import { TILE_W, toScreen } from './iso.js';
import { perf, softGlow } from './perf.js';
import { FORM_INFO, HERO_INFO } from './labels.js';
import { drawUpgradeOver, drawUpgradeUnder } from './upgradeArt.js';
import { drawFusionOver, drawFusionUnder, drawHeroFusionOver, drawHeroFusionUnder } from './fusionArt.js';

/**
 * Hexforge art, "Forgia Infernale": iron, basalt and molten metal, drawn
 * from shapes on the canvas (no image files). Heights are unscaled screen
 * pixels, like iso.js; every painter takes the camera and draws in place.
 *
 * Each building keeps one signature glow that says what it is about:
 * amber stone, orange scrap, violet mana, green chips, gold vault, and the
 * molten orange of the forge itself.
 */

export const IRON = { top: '#4d3d31', left: '#2f251e', right: '#211913' };
export const BASALT = { top: '#3b3633', left: '#26221f', right: '#1b1816' };
const PALE = { top: '#6a7480', left: '#434b55', right: '#30363e' };
const COPPER = { top: '#6b4630', left: '#45291b', right: '#321d13' };
const EDGE = '#0b0705';

// ── primitives ──────────────────────────────────────────────────────────
export function prism(ctx, cam, x, y, w, d, z0, h, mat, edge = EDGE) {
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

/** An arched opening on a wall: sides from z0 to z1, the arch peaking at zTop. */
function wallArch(ctx, W, half, z0, z1, zTop) {
    const a = W(-half, z0);
    const b = W(-half, z1);
    const peak = W(0, zTop);
    const c = W(half, z1);
    const d = W(half, z0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.quadraticCurveTo(peak.x, peak.y, c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
}

/** A ring on a wall (a circle seen on the wall's slant), centre height z. */
function wallRing(ctx, W, rx, rz, z, steps = 28) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const a = (Math.PI * 2 * i) / steps;
        const p = W(Math.cos(a) * rx, z + Math.sin(a) * rz);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
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
export function seam(ctx, cam, x, y, w, d, z, color, width = 1.6) {
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

const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
};

// ── buildings ───────────────────────────────────────────────────────────
/**
 * `look` = { time, firing (0..1, a tower that just shot), health (0..1) }.
 */
export function drawBuilding(ctx, cam, b, look) {
    const painter = PAINTERS[b.type] ?? PAINTERS.rune_quarry;
    const upgraded = b.level > 1 && b.type !== 'rune_trap';
    const fused = Boolean(b.fusion?.parts?.length);
    if (fused) drawFusionUnder(ctx, cam, b, look.time ?? 0);
    if (upgraded) drawUpgradeUnder(ctx, cam, b, look.time ?? 0);
    painter(ctx, cam, b, look);
    if (upgraded) drawUpgradeOver(ctx, cam, b, look.time ?? 0);
    if (fused) drawFusionOver(ctx, cam, b, look.time ?? 0);
}

const PAINTERS = {
    core(ctx, cam, b, { time, health }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.12, y + 0.12, 2.76, 2.76, 0, 22, IRON);
        seam(ctx, cam, x + 0.12, y + 0.12, 2.76, 2.76, 9, withAlpha('#ff7a1a', 0.55 + 0.35 * health));
        prism(ctx, cam, x + 0.45, y + 0.45, 2.1, 2.1, 22, 14, IRON);
        // the molten pool
        const pool = [[0.75, 0.75], [2.25, 0.75], [2.25, 2.25], [0.75, 2.25]].map(([dx, dy]) => toScreen(cam, x + dx, y + dy, 36.5));
        const c = toScreen(cam, x + 1.5, y + 1.5, 36.5);
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
        const g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, 46 * s);
        g.addColorStop(0, health > 0.3 ? '#fff4c2' : '#ffb36b');
        g.addColorStop(0.35, `rgb(255, ${150 + Math.round(pulse * 50)}, 40)`);
        g.addColorStop(1, '#7a1c00');
        path(ctx, pool);
        ctx.fillStyle = g;
        ctx.fill();
        halo(ctx, c.x, c.y - 6 * s, (60 + 12 * pulse) * s, '#ff7a1a', 0.5 + 0.5 * health);
        // the anvil standing in the pool
        prism(ctx, cam, x + 1.3, y + 1.35, 0.4, 0.3, 36.5, 5, IRON);
        prism(ctx, cam, x + 1.12, y + 1.28, 0.76, 0.44, 41.5, 4, { top: '#6b5a4c', left: '#3d3129', right: '#2d241e' });
        // chimneys on the side corners, clear of the pool
        for (const [dx, dy, seed] of [[0.2, 2.38, 0], [2.38, 0.2, 0.37]]) {
            prism(ctx, cam, x + dx, y + dy, 0.42, 0.42, 22, 56, IRON);
            const top = toScreen(cam, x + dx + 0.21, y + dy + 0.21, 80);
            halo(ctx, top.x, top.y, 12 * s, '#ff7a1a', 0.6);
            smoke(ctx, top, time, seed, s);
        }
    },

    wall(ctx, cam, b) {
        const { x, y } = b;
        prism(ctx, cam, x + 0.04, y + 0.04, 0.92, 0.92, 0, 18, BASALT);
        for (const [mx, my] of [[0.04, 0.04], [0.56, 0.04], [0.04, 0.56], [0.56, 0.56]]) {
            prism(ctx, cam, x + mx, y + my, 0.4, 0.4, 18, 8, { top: '#4a4440', left: '#2d2926', right: '#211e1c' });
        }
    },

    rune_tower(ctx, cam, b, look) {
        towerBody(ctx, cam, b, BASALT, '#ffb347', look);
        const s = cam.scale;
        const top = toScreen(cam, b.x + 1, b.y + 1, 66);
        halo(ctx, top.x, top.y - 8 * s, (26 + 30 * look.firing) * s, '#ff8a2a', 0.8 + look.firing);
        flame(ctx, top, (11 + 7 * look.firing) * s, look.time, b.id, '#ffe08a', '#ff5a00');
    },

    lightning_tower(ctx, cam, b, look) {
        towerBody(ctx, cam, b, IRON, '#6fd3ff', look);
        const s = cam.scale;
        const { time, firing } = look;
        const left = toScreen(cam, b.x + 0.7, b.y + 1.3, 64);
        const right = toScreen(cam, b.x + 1.3, b.y + 0.7, 64);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = COPPER.top;
        ctx.lineWidth = 3.5 * s;
        const tips = [left, right].map((p, i) => ({ x: p.x + (i ? 5 : -5) * s, y: p.y - 26 * s }));
        [left, right].forEach((p, i) => {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + (i ? 8 : -8) * s, p.y - 14 * s, tips[i].x, tips[i].y); ctx.stroke();
        });
        // crackling arc between the horns
        if (firing > 0 || Math.sin(time * 13 + b.id) > 0.2) {
            softGlow(ctx, '#6fd3ff', 12 * s);
            ctx.strokeStyle = firing > 0 ? '#ffffff' : '#9fe8ff';
            ctx.lineWidth = (1.5 + 1.5 * firing) * s;
            ctx.beginPath();
            ctx.moveTo(tips[0].x, tips[0].y);
            for (let i = 1; i < 6; i++) {
                const k = i / 6;
                ctx.lineTo(tips[0].x + (tips[1].x - tips[0].x) * k, tips[0].y + (tips[1].y - tips[0].y) * k + Math.sin(time * 40 + i * 2.3) * 5 * s);
            }
            ctx.lineTo(tips[1].x, tips[1].y);
            ctx.stroke();
        }
        ctx.restore();
        const mid = { x: (tips[0].x + tips[1].x) / 2, y: (tips[0].y + tips[1].y) / 2 };
        halo(ctx, mid.x, mid.y, (22 + 30 * firing) * s, '#6fd3ff', 0.6 + firing);
    },

    frost_tower(ctx, cam, b, look) {
        towerBody(ctx, cam, b, PALE, '#9fe3ff', look);
        const s = cam.scale;
        const top = toScreen(cam, b.x + 1, b.y + 1, 66);
        for (const [dx, dy, r] of [[-9, -4, 6], [8, -3, 5], [0, -12, 8]]) {
            gem(ctx, { x: top.x + dx * s, y: top.y + dy * s }, r * s, '#f1fbff', '#7fcfff');
        }
        halo(ctx, top.x, top.y - 10 * s, (26 + 28 * look.firing) * s, '#9fe3ff', 0.7 + look.firing);
        flame(ctx, { x: top.x, y: top.y - 4 * s }, (8 + 6 * look.firing) * s, look.time, b.id, '#f1fbff', '#3ab0ff');
    },

    rune_quarry(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.1, y + 0.1, 1.8, 1.8, 0, 6, BASALT);
        const stone = { top: '#6d655d', left: '#433d38', right: '#322d29' };
        for (const [dx, dy, w, h] of [[0.3, 0.35, 0.55, 14], [1.0, 0.3, 0.45, 10], [0.4, 1.05, 0.5, 12]]) {
            prism(ctx, cam, x + dx, y + dy, w, w, 6, h, stone);
            const glint = toScreen(cam, x + dx + w / 2, y + dy + w / 2, 6 + h + 1);
            halo(ctx, glint.x, glint.y, 7 * s, '#ffb547', 0.6 + 0.4 * Math.sin(time * 3 + dx * 7));
            gem(ctx, glint, 2.6 * s, '#ffe3a6', '#ff9a1f');
        }
        // crane with a swinging block
        const base = toScreen(cam, x + 1.55, y + 1.5, 6);
        const mast = toScreen(cam, x + 1.55, y + 1.5, 44);
        const jib = toScreen(cam, x + 1.0, y + 0.95, 44);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#5b4a3c';
        ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(mast.x, mast.y); ctx.lineTo(jib.x, jib.y); ctx.stroke();
        const swing = Math.sin(time * 1.4) * 3 * s;
        ctx.lineWidth = 1 * s;
        ctx.strokeStyle = '#8b7a6a';
        ctx.beginPath(); ctx.moveTo(jib.x, jib.y); ctx.lineTo(jib.x + swing, jib.y + 16 * s); ctx.stroke();
        ctx.fillStyle = '#6d655d';
        ctx.fillRect(jib.x + swing - 4 * s, jib.y + 16 * s, 8 * s, 6 * s);
        ctx.restore();
    },

    scrap_foundry(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.2, y + 0.25, 1.5, 1.5, 0, 30, IRON);
        seam(ctx, cam, x + 0.2, y + 0.25, 1.5, 1.5, 24, withAlpha('#ff7a3d', 0.7));
        // furnace mouth on the front-left face
        const mouth = onWall(cam, 'left', x + 0.95, y + 1.75);
        const m = mouth(0, 6);
        const flick = 0.75 + 0.25 * Math.sin(time * 11 + b.id);
        ctx.save();
        softGlow(ctx, '#ff7a3d', 14 * s);
        ctx.fillStyle = `rgba(255, ${140 + Math.round(60 * flick)}, 50, 1)`;
        wallArch(ctx, mouth, 9, 2, 14, 24);
        ctx.fill();
        ctx.restore();
        halo(ctx, m.x, m.y, 26 * s * flick, '#ff7a3d', 0.7);
        prism(ctx, cam, x + 1.25, y + 0.35, 0.38, 0.38, 30, 34, IRON);
        const top = toScreen(cam, x + 1.44, y + 0.54, 64);
        halo(ctx, top.x, top.y, 10 * s, '#ff7a3d', 0.6);
        smoke(ctx, top, time, b.id * 0.13, s);
    },

    mana_well(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.2, y + 0.2, 1.6, 1.6, 0, 14, BASALT);
        const c = toScreen(cam, x + 1, y + 1, 14.5);
        const rx = 26 * s;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, rx / 2, 0, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, rx);
        g.addColorStop(0, '#f1e6ff');
        g.addColorStop(0.4, '#b48cff');
        g.addColorStop(1, '#3b1d70');
        ctx.fillStyle = g;
        ctx.fill();
        // swirl
        ctx.strokeStyle = 'rgba(241, 230, 255, 0.55)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx * 0.6, rx * 0.3, 0, time * 1.5, time * 1.5 + Math.PI * 1.2);
        ctx.stroke();
        ctx.restore();
        halo(ctx, c.x, c.y, 40 * s, '#b48cff', 0.55 + 0.15 * Math.sin(time * 2));
        // rising motes
        ctx.fillStyle = '#e6d8ff';
        for (let i = 0; i < 5; i++) {
            const life = (time * 0.5 + hash(i + b.id)) % 1;
            ctx.globalAlpha = 1 - life;
            ctx.beginPath();
            ctx.arc(c.x + (hash(i * 3 + b.id) - 0.5) * 30 * s, c.y - life * 40 * s, 1.6 * s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    data_node(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.25, y + 0.25, 1.5, 1.5, 0, 8, BASALT);
        prism(ctx, cam, x + 0.55, y + 0.55, 0.9, 0.9, 8, 38, { top: '#2f3a33', left: '#1b231e', right: '#131915' });
        // rune lights on the two front faces
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const on = Math.sin(time * 4 + row * 1.7 + col * 2.9 + b.id) > 0.1;
                const z = 14 + row * 8;
                ctx.fillStyle = on ? '#4dff9a' : 'rgba(77, 255, 154, 0.18)';
                for (const light of [onWall(cam, 'left', x + 0.62 + col * 0.26, y + 1.45),
                    onWall(cam, 'right', x + 1.45, y + 1.28 - col * 0.26)]) {
                    wallRect(ctx, light, -2, 2, z - 1, z + 2);
                    ctx.fill();
                }
            }
        }
        const top = toScreen(cam, x + 1, y + 1, 50);
        halo(ctx, top.x, top.y, 22 * s, '#4dff9a', 0.4 + 0.2 * Math.sin(time * 3));
        gem(ctx, { x: top.x, y: top.y - 4 * s }, 5 * s, '#c9ffe0', '#1fbf68');
    },

    vault(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, x + 0.2, y + 0.2, 1.6, 1.6, 0, 28, IRON);
        for (const z of [8, 20]) seam(ctx, cam, x + 0.2, y + 0.2, 1.6, 1.6, z, '#ffd75e', 1.2);
        prism(ctx, cam, x + 0.35, y + 0.35, 1.3, 1.3, 28, 6, { top: '#6a5638', left: '#45371f', right: '#342916' });
        const door = onWall(cam, 'left', x + 1, y + 1.8);
        ctx.save();
        ctx.strokeStyle = '#ffd75e';
        ctx.lineWidth = 2 * s;
        softGlow(ctx, '#ffd75e', 8 * s);
        wallRing(ctx, door, 9, 10, 14);
        ctx.stroke();
        // the wheel's spokes: one along the wall, one upright
        const [l, r, up, down] = [door(-5, 14), door(5, 14), door(0, 19), door(0, 9)];
        ctx.beginPath();
        ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y);
        ctx.moveTo(up.x, up.y); ctx.lineTo(down.x, down.y);
        ctx.stroke();
        ctx.restore();
        const top = toScreen(cam, x + 1, y + 1, 34);
        halo(ctx, top.x, top.y, 24 * s, '#ffd75e', 0.35 + 0.1 * Math.sin(time * 2));
    },
};

function towerBody(ctx, cam, b, shaftMat, rune, { time, firing }) {
    const s = cam.scale;
    const { x, y } = b;
    prism(ctx, cam, x + 0.22, y + 0.22, 1.56, 1.56, 0, 12, BASALT);
    prism(ctx, cam, x + 0.5, y + 0.5, 1.0, 1.0, 12, 44, shaftMat);
    seam(ctx, cam, x + 0.5, y + 0.5, 1.0, 1.0, 34, withAlpha(rune, 0.6 + 0.4 * Math.max(firing, 0.5 + 0.5 * Math.sin(time * 2 + b.id))));
    // arrow-slit window on the front face
    ctx.save();
    softGlow(ctx, rune, 8 * s);
    ctx.fillStyle = withAlpha(rune, 0.9);
    wallArch(ctx, onWall(cam, 'left', x + 1.0, y + 1.5), 2.5, 18, 27, 31);
    ctx.fill();
    ctx.restore();
    // crenellated crown
    prism(ctx, cam, x + 0.38, y + 0.38, 1.24, 1.24, 56, 6, shaftMat);
    for (const [mx, my] of [[0.38, 0.38], [1.36, 0.38], [0.38, 1.36], [1.36, 1.36]]) {
        prism(ctx, cam, x + mx, y + my, 0.26, 0.26, 62, 6, shaftMat);
    }
}

// ── traps, rubble ───────────────────────────────────────────────────────
export function drawTrapMark(ctx, cam, b, time, radiusPx) {
    const c = toScreen(cam, b.x + 0.5, b.y + 0.5);
    const s = cam.scale;
    ctx.save();
    ctx.strokeStyle = withAlpha('#ff7a3d', 0.45 + 0.25 * Math.sin(time * 3 + b.id));
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, radiusPx, radiusPx / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {          // rune ticks
        const a = (i / 6) * Math.PI * 2 + time * 0.4;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * radiusPx * 0.55, c.y + Math.sin(a) * radiusPx * 0.275);
        ctx.lineTo(c.x + Math.cos(a) * radiusPx * 0.8, c.y + Math.sin(a) * radiusPx * 0.4);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawRubble(ctx, cam, b, time) {
    const s = cam.scale;
    const pts = [[0.1, 0.1], [b.size - 0.1, 0.1], [b.size - 0.1, b.size - 0.1], [0.1, b.size - 0.1]]
        .map(([dx, dy]) => toScreen(cam, b.x + dx, b.y + dy));
    path(ctx, pts);
    ctx.fillStyle = '#120d0a';
    ctx.fill();
    if (b.type === 'wall') return;
    const stone = { top: '#3a332e', left: '#241f1b', right: '#1a1613' };
    const n = 3 + b.size * 2;
    for (let i = 0; i < n; i++) {
        const dx = 0.2 + hash(b.id * 7 + i) * (b.size - 0.6);
        const dy = 0.2 + hash(b.id * 13 + i) * (b.size - 0.6);
        prism(ctx, cam, b.x + dx, b.y + dy, 0.28, 0.24, 0, 4 + hash(i + b.id) * 6, stone);
    }
    const c = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, 4);
    halo(ctx, c.x, c.y, 18 * s * b.size, '#ff5a00', 0.25 + 0.15 * Math.sin(time * 2 + b.id));
    smoke(ctx, c, time, b.id * 0.21, s, 3);
}

// ── heroes ──────────────────────────────────────────────────────────────
/**
 * A hero standing on (x, y), drawn `s` times its natural size.
 * `pose` (all optional): facing (1 right, -1 left), walking, attack (-1..0
 * winding up, 0..1 following through), nova, leap (0..1 through a jump),
 * down (0..1 collapsing). Heroes are drawn in profile, facing right, in
 * unscaled units with the feet at the origin; facing left mirrors them.
 * An evolved hero (`hero.form`, `hero.tier` 2 or 3) carries its form's
 * gear in the form's accent colour; an ascended one is a little taller
 * and burns with an aura.
 */
export function drawHero(ctx, hero, x, y, s, color, time, pose = {}) {
    const facing = (pose.facing ?? hero.facing ?? 1) < 0 ? -1 : 1;
    const tier = hero.form ? (hero.tier ?? 1) : 1;
    const p = {
        t: time + (hero.id ?? 0) * 0.37,
        walk: pose.walking ? time * WALK_RATE[hero.cls] + (hero.id ?? 0) : null,
        attack: pose.attack ?? null,
        nova: Boolean(pose.nova),
        leap: pose.leap ?? null,
        form: tier > 1 ? hero.form : null,
        tier,
        accent: tier > 1 ? FORM_INFO[hero.form]?.accent ?? color : color,
        marks: [],
    };
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pose.down !== undefined && pose.down !== null) {
        ctx.globalAlpha *= Math.max(0, 1 - pose.down);
        ctx.rotate(-Math.min(1, pose.down * 3) * Math.PI / 2);   // topples backwards
    }
    const fused = hero.fusion?.length > 0 && pose.down == null;
    const style = globalThis.__fusionStyle ?? 'current';
    const grade = hero.grade ?? 1;
    const donors = fused ? hero.fusion.slice(1).filter((part) => FORM_INFO[part.form]) : [];
    const colors = donors.map((d) => FORM_INFO[d.form].accent);
    if (fused && style === 'current') p.marks = donors.map((d) => d.form);
    if (fused && style === 'one' && donors.length) p.marks = [donors.reduce((a, b) => (b.power > a.power ? b : a)).form];
    if (tier > 1) ctx.scale(1 + 0.05 * (tier - 1), 1 + 0.05 * (tier - 1));
    if (fused) {
        const grow = style === 'current' ? 1.08 : 1.04 + 0.05 * Math.min(grade, 4);
        ctx.scale(grow, grow);
    }
    if (fused && style === 'current') drawHeroFusionUnder(ctx, hero.fusion, p.t);
    if (fused && style !== 'current') cleanRing(ctx, colors.length ? colors : [p.accent], p.t);
    if (fused && style === 'forged') auraFlames(ctx, colors.length ? colors : [p.accent], p.t, grade);
    if (tier === 3) halo(ctx, 0, -24, 34, p.accent, 0.4 + 0.12 * Math.sin(p.t * 3));
    paintHero(ctx, hero.cls, color, p);
    if (fused && style === 'forged') veins(ctx, colors.length ? colors : [p.accent], p.t);
    if (fused && style === 'current') drawHeroFusionOver(ctx, hero.fusion, grade, p.t);
    if (fused && style !== 'current') gradePips(ctx, grade, colors[0] ?? p.accent);
    ctx.restore();
}

/** A thin glowing ring at the feet, half in each donor's colour. */
function cleanRing(ctx, colors, t) {
    ctx.save();
    ctx.lineWidth = 1.4;
    const n = colors.length;
    for (let i = 0; i < n; i++) {
        const from = t * 0.8 + (i / n) * Math.PI * 2;
        ctx.strokeStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, 0, from, from + (Math.PI * 2) / n);
        ctx.stroke();
    }
    ctx.restore();
}

/** Tongues of light rising behind the body, in the donors' colours: taller with the grade. */
function auraFlames(ctx, colors, t, grade) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tall = 40 + 6 * Math.min(grade, 4);
    for (let i = 0; i < 5; i++) {
        const x = -10 + i * 5;
        const h = tall * (0.7 + 0.3 * Math.sin(t * 5 + i * 1.9)) * (i === 2 ? 1.1 : 0.85);
        const g = ctx.createLinearGradient(0, 0, 0, -h);
        const c = colors[i % colors.length];
        g.addColorStop(0, withAlpha(c, 0.45));
        g.addColorStop(1, withAlpha(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 5, -2);
        ctx.quadraticCurveTo(x - 3, -h * 0.55, x + Math.sin(t * 4 + i) * 2, -h);
        ctx.quadraticCurveTo(x + 3, -h * 0.55, x + 5, -2);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

/** Glowing seams across the body, like metal welded together: one per donor colour. */
function veins(ctx, colors, t) {
    const lines = [
        [[-6, -28], [-3, -24], [-6, -20], [-2, -16]],
        [[4, -29], [1, -25], [4, -21], [1, -17]],
    ];
    ctx.save();
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    lines.forEach((pts, i) => {
        const c = colors[i % colors.length];
        ctx.strokeStyle = withAlpha('#ffffff', 0.9);
        ctx.shadowColor = c;
        ctx.shadowBlur = 6 + 3 * Math.sin(t * 4 + i);
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.lineWidth = 1.3;
    });
    ctx.restore();
}

/** The grade as small diamonds in a row over the head. */
function gradePips(ctx, grade, color) {
    const n = Math.min(grade, 5);
    for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 6;
        const y = -54;
        halo(ctx, x, y, 6, color, 0.7);
        ctx.fillStyle = '#fff6e0';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 3.2);
        ctx.lineTo(x + 2.2, y);
        ctx.lineTo(x, y + 2.4);
        ctx.lineTo(x - 2.2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function paintHero(ctx, cls, color, p) {
    if (cls === 'guardian') guardian(ctx, color, p);
    else if (cls === 'neon_blade') blade(ctx, color, p);
    else if (cls === 'explorer') explorer(ctx, color, p);
    else mage(ctx, color, p);
}

/**
 * A fused hero wears what its donors were known for, in their form's colour:
 * the Warlord's cape, the Bastion's shield on the back, the Phantom's wings,
 * the Reaper's horns, the Archon's rune ring, the Arcanist's shards.
 * `backMarks` goes behind the body, `headMarks` on the head at (x, y).
 */
function backMarks(ctx, p) {
    for (const form of p.marks) {
        const accent = FORM_INFO[form].accent;
        if (form === 'warlord') cape(ctx, accent, p.t, -5, -31, 22);
        else if (form === 'phantom') wings(ctx, accent, p.t);
        else if (form === 'bastion') backShield(ctx, accent);
        else if (form === 'arcanist') shards(ctx, accent, p.t);
    }
}

function headMarks(ctx, p, x, y) {
    for (const form of p.marks) {
        const accent = FORM_INFO[form].accent;
        if (form === 'reaper') horns(ctx, accent, x, y);
        else if (form === 'archon') runeRing(ctx, accent, p.t, 2);
    }
}

/** A kite shield slung on the back, its rim in the Bastion's gold. */
function backShield(ctx, trim) {
    ctx.save();
    ctx.fillStyle = shade(HERO_INFO.guardian.color, 0.5);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-18, -34);
    ctx.lineTo(-7, -32);
    ctx.lineTo(-7, -15);
    ctx.quadraticCurveTo(-12, -6, -18, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.fillRect(-13.4, -30, 1.8, 14);
    ctx.fillRect(-17, -24, 9, 1.8);
    ctx.restore();
}

const WALK_RATE = { guardian: 8, neon_blade: 15, technomancer: 4, explorer: 9 };

/**
 * Arm angle through a blow: rest → raised while winding up → hit on impact →
 * back to rest. `over` = true brings the arm down over the head (an overhead
 * smash) instead of swinging it up from below.
 */
function swing(a, rest, raised, hit, over = false) {
    if (a === null) return rest;
    if (a < 0) {
        const w = 1 + a;
        if (w < 0.7) return lerp(rest, raised, easeOut(w / 0.7));
        return lerp(raised, over ? hit - Math.PI * 2 : hit, easeIn((w - 0.7) / 0.3));
    }
    return lerp(hit, rest, easeOut(a));
}

/** 0..1, peaking when the blow lands: how far the body lunges into it. */
function lunge(a) {
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
function limbEnd(x, y, length, angle) {
    return { x: x + Math.sin(angle) * length, y: y + Math.cos(angle) * length };
}

function stroke(ctx, color, width, points) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const q of points.slice(1)) ctx.lineTo(q.x, q.y);
    ctx.stroke();
}

function leg(ctx, hipX, hipY, length, angle, color, width) {
    const knee = limbEnd(hipX, hipY, length * 0.5, angle);
    const foot = limbEnd(knee.x, knee.y, length * 0.5, angle * 0.4);
    stroke(ctx, color, width, [{ x: hipX, y: hipY }, knee, foot]);
    ctx.fillStyle = color;
    ctx.fillRect(foot.x - width * 0.5, foot.y - width * 0.45, width * 1.5, width * 0.9);
}

// ── Guardian: plate armour, tower shield, rune hammer ──────────────────
function guardian(ctx, color, p) {
    const step = p.walk === null ? 0 : Math.sin(p.walk);
    const bob = p.walk === null ? 0 : -Math.abs(Math.cos(p.walk)) * 1.4;
    const push = lunge(p.attack) * 4;
    ctx.translate(push, bob);
    const steel = '#5b5f69';
    const dark = '#2a2c33';

    backMarks(ctx, p);
    if (p.form === 'warlord') cape(ctx, p.accent, p.t, -2, -30, 16);
    leg(ctx, -2, -15, 15, -step * 0.5, dark, 5);
    // hammer arm behind the body while resting or winding up
    const arm = swing(p.attack, 0.35, -2.7, 1.1, true);
    const striking = p.attack !== null && (p.attack > -0.3);
    const head = p.form === 'warlord' ? 1.25 + 0.15 * (p.tier - 2) : 1;
    if (!striking) hammer(ctx, color, arm, head, p.accent);

    // body: plate cuirass with the class tabard
    const body = ctx.createLinearGradient(-9, 0, 9, 0);
    body.addColorStop(0, '#3a3d45');
    body.addColorStop(0.5, '#7a7f8a');
    body.addColorStop(1, '#3a3d45');
    ctx.fillStyle = body;
    path(ctx, [{ x: -9, y: -14 }, { x: -10, y: -31 }, { x: 9, y: -31 }, { x: 8, y: -14 }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: -3, y: -29 }, { x: 4, y: -29 }, { x: 5, y: -9 }, { x: 0.5, y: -6 }, { x: -4, y: -9 }]);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#d9a441';
    ctx.fillRect(-9, -16, 17, 2.4);
    leg(ctx, 2, -15, 15, step * 0.5, steel, 5);

    // great helm with a glowing visor and a plume
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(-6, -31);
    ctx.lineTo(-6.5, -39);
    ctx.quadraticCurveTo(0, -46, 6.5, -39);
    ctx.lineTo(6, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(0, -38, 6.5, 1.8);
    ctx.fillRect(3, -38, 1.6, 5);
    ctx.fillStyle = p.form === 'warlord' ? p.accent : color;        // the warlord's plume burns red
    ctx.beginPath();
    ctx.moveTo(-1, -44);
    ctx.quadraticCurveTo(-10, -48 + Math.sin(p.t * 6) * 1.5, -13, -40);
    ctx.quadraticCurveTo(-7, -43, -1, -42);
    ctx.fill();
    // pauldron
    ctx.fillStyle = '#80858f';
    ctx.beginPath();
    ctx.ellipse(-1, -30, 7, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    if (p.form) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    if (p.tier === 3) horns(ctx, p.form === 'warlord' ? '#2a2c33' : p.accent, 0, -41);
    headMarks(ctx, p, 0, -41);

    if (striking) hammer(ctx, color, arm, head, p.accent);
    const big = p.form === 'bastion' ? 1.2 + 0.15 * (p.tier - 2) : 1;
    shield(ctx, color, push * 0.5, big, p.form ? p.accent : '#d9a441');
}

/** A cloak hanging from the shoulders, waving. */
function cape(ctx, color, t, x, y, length) {
    const wave = Math.sin(t * 3) * 1.5;
    ctx.fillStyle = shade(color, 0.6);
    path(ctx, [{ x: x + 2, y }, { x: x - 8, y: y + length * 0.5 + wave }, { x: x - 10, y: y + length + wave }, { x: x + 1, y: y + length - 2 }]);
    ctx.fill();
}

/** Two horns (ascended Guardian and Reaper) above a head centred at (x, y). */
function horns(ctx, color, x, y) {
    ctx.fillStyle = color;
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * 3, y + 3);
        ctx.quadraticCurveTo(x + side * 8, y - 1, x + side * 7, y - 7);
        ctx.quadraticCurveTo(x + side * 5, y - 2, x + side * 1, y + 1);
        ctx.closePath();
        ctx.fill();
    }
}

function hammer(ctx, color, angle, size = 1, accent = color) {
    const shoulder = { x: -2, y: -29 };
    const hand = limbEnd(shoulder.x, shoulder.y, 10, angle);
    stroke(ctx, '#4a4d55', 4.5, [shoulder, hand]);
    const tip = limbEnd(hand.x, hand.y, 15, angle);
    stroke(ctx, '#6b4a2e', 2.4, [limbEnd(hand.x, hand.y, -4, angle), tip]);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(-angle);
    ctx.scale(size, size);
    ctx.fillStyle = '#3d4048';
    ctx.fillRect(-6, -3.5, 12, 7);
    ctx.fillStyle = '#9aa0ab';
    ctx.fillRect(-6, -3.5, 12, 1.6);
    if (size > 1) {
        // the warlord's spikes
        ctx.fillStyle = accent;
        path(ctx, [{ x: -6, y: -3.5 }, { x: -9, y: 0 }, { x: -6, y: 3.5 }]);
        ctx.fill();
        path(ctx, [{ x: 6, y: -3.5 }, { x: 9, y: 0 }, { x: 6, y: 3.5 }]);
        ctx.fill();
        halo(ctx, 0, 0, 9, accent, 0.5);
    }
    ctx.fillStyle = color;
    ctx.fillRect(-1.5, -2.5, 3, 5);
    ctx.restore();
}

function shield(ctx, color, push, size = 1, trim = '#d9a441') {
    const x = 9 + push;
    ctx.save();
    ctx.translate(x, -20);
    ctx.scale(size, size);
    ctx.translate(-x, 20);
    ctx.fillStyle = shade(color, 0.55);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 4, -33);
    ctx.lineTo(x + 5, -31);
    ctx.lineTo(x + 5, -12);
    ctx.quadraticCurveTo(x + 1, -3, x - 4, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = size > 1 ? trim : color;
    ctx.fillRect(x - 0.5, -28, 2, 14);
    ctx.fillRect(x - 3, -22, 7, 2);
    ctx.restore();
}

// ── Neon Blade: hooded assassin, twin energy daggers ───────────────────
function blade(ctx, color, p) {
    const running = p.walk !== null;
    const step = running ? Math.sin(p.walk) : 0;
    const push = lunge(p.attack) * 7;
    ctx.translate(push, running ? -Math.abs(Math.cos(p.walk)) * 1.5 : 0);
    if (p.leap !== null) {
        // a front flip over the wall, tucked
        ctx.translate(0, -16);
        ctx.rotate(p.leap * Math.PI * 2);
        ctx.translate(0, 16);
    } else if (running) {
        ctx.rotate(0.22);                         // leaning into the run
    }
    const tuck = p.leap === null ? 1 : 0.55;
    const dark = '#1d1418';

    // scarf and cloak streaming behind
    const wave = Math.sin(p.t * (running ? 14 : 4));
    backMarks(ctx, p);
    if (p.tier === 3 && p.form === 'phantom') wings(ctx, p.accent, p.t);
    if (p.form === 'phantom') {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-1, -27);
        ctx.quadraticCurveTo(-12, -27 - wave * 2, -21, -21 + wave * 2);
        ctx.stroke();
    }
    ctx.fillStyle = shade(color, 0.45);
    path(ctx, [{ x: -3, y: -30 }, { x: -14, y: -22 + wave * 2 }, { x: -11, y: -8 + wave }, { x: -2, y: -12 }]);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-1, -29);
    ctx.quadraticCurveTo(-9, -31 + wave * 2, -16, -27 - wave * 2);
    ctx.stroke();

    leg(ctx, -1, -13, 13 * tuck, -step * 0.9, dark, 3.6);
    const reach = p.form === 'reaper' ? 1.35 + 0.15 * (p.tier - 2) : 1;
    const edge = p.form === 'reaper' ? p.accent : color;
    dagger(ctx, edge, swing(p.attack, 0.9, -1.6, 2.1) - 0.5, { x: -2, y: -26 }, reach);
    // slim body
    ctx.fillStyle = '#2b1f27';
    path(ctx, [{ x: -5, y: -13 }, { x: -4, y: -29 }, { x: 4, y: -29 }, { x: 5, y: -13 }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: -1, y: -28 }, { x: 2, y: -28 }, { x: 3, y: -14 }, { x: -2, y: -14 }]);
    ctx.fill();
    leg(ctx, 1, -13, 13 * tuck, step * 0.9, '#2b1f27', 3.6);
    // hood with burning eyes
    ctx.fillStyle = shade(color, 0.6);
    ctx.beginPath();
    ctx.moveTo(-5, -28);
    ctx.quadraticCurveTo(-6, -40, 1, -42);
    ctx.quadraticCurveTo(7, -38, 5, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(2.5, -33, 3, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#ffe0ef';
    ctx.fillRect(2.5, -34, 2.6, 1.3);
    if (p.tier === 3 && p.form === 'reaper') horns(ctx, p.accent, 0, -40);
    headMarks(ctx, p, 0, -40);
    dagger(ctx, edge, swing(p.attack, 1.2, -1.2, 2.4), { x: 2, y: -26 }, reach);
    if (p.attack !== null && p.attack > -0.35 && p.attack < 0.8) slash(ctx, edge, p.attack);
}

/** Two thin wings of light (the ascended Phantom). */
function wings(ctx, color, t) {
    const beat = Math.sin(t * 6) * 0.15;
    ctx.save();
    ctx.globalAlpha *= 0.75;
    ctx.strokeStyle = color;
    ctx.fillStyle = withAlpha(color, 0.18);
    for (const k of [0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-2, -27);
        ctx.quadraticCurveTo(-14 - k * 4, -44 + k * 6 - beat * 20, -22 - k * 3, -30 + k * 8);
        ctx.quadraticCurveTo(-12, -30 + k * 4, -2, -24);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.restore();
}

function dagger(ctx, color, angle, shoulder, reach = 1) {
    const hand = limbEnd(shoulder.x, shoulder.y, 8, angle);
    stroke(ctx, '#2b1f27', 3, [shoulder, hand]);
    const tip = limbEnd(hand.x, hand.y, 10 * reach, angle - 0.6 * reach);
    halo(ctx, (hand.x + tip.x) / 2, (hand.y + tip.y) / 2, 8, color, 0.7);
    stroke(ctx, color, 2.6, [hand, tip]);
    stroke(ctx, '#ffffff', 1, [hand, tip]);
}

/** The bright arc a dagger leaves when it cuts. */
function slash(ctx, color, a) {
    const fade = a < 0 ? (a + 0.35) / 0.35 : 1 - a / 0.8;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, fade);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(2, -24, 17, -1.4, 0.9);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, -24, 17, -1.1, 0.7);
    ctx.stroke();
    ctx.restore();
}

// ── Technomancer: floating robe, rune staff, charged orb ───────────────
function mage(ctx, color, p) {
    const hover = -3 + Math.sin(p.t * 2.2) * 1.5;
    ctx.translate(lunge(p.attack) * 2, hover);
    backMarks(ctx, p);
    const robe = ctx.createLinearGradient(0, -30, 0, 0);
    robe.addColorStop(0, shade(color, 0.55));
    robe.addColorStop(1, shade(color, 0.25));
    // robe with a hem that ripples as it floats
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.lineTo(4, -28);
    ctx.lineTo(9, 0);
    for (let i = 1; i <= 6; i++) {
        const hx = 9 - (18 * i) / 6;
        ctx.lineTo(hx, Math.sin(p.t * 5 + i) * 1.2 + (i % 2 ? 1.5 : 0));
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -27);
    ctx.lineTo(3, -1);
    ctx.stroke();
    // a rune glowing on the chest
    halo(ctx, 0, -20, 6, color, 0.8 + 0.2 * Math.sin(p.t * 4));
    ctx.fillStyle = '#f1eaff';
    ctx.fillRect(-0.8, -23, 1.6, 6);
    ctx.fillRect(-2.5, -21, 5, 1.4);
    // hood
    ctx.fillStyle = shade(color, 0.75);
    ctx.beginPath();
    ctx.moveTo(-5, -27);
    ctx.quadraticCurveTo(-7, -38, 0, -40);
    ctx.quadraticCurveTo(6, -37, 5, -27);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#120a1c';
    ctx.beginPath();
    ctx.ellipse(1.5, -32, 3, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.form ? p.accent : '#e6d8ff';
    ctx.fillRect(1.2, -33, 3, 1.3);
    if (p.form === 'archon') runeRing(ctx, p.accent, p.t, p.tier);
    if (p.tier === 3 && p.form === 'arcanist') shards(ctx, p.accent, p.t);
    headMarks(ctx, p, 0.5, -40);
    staff(ctx, color, p);
}

/** The Explorer: wide-brimmed hat, a pack with a bedroll, a cape and a brass spyglass. */
function explorer(ctx, color, p) {
    const step = p.walk === null ? 0 : Math.sin(p.walk);
    const bob = Math.abs(step) * -1.2;
    ctx.translate(0, bob);
    // boots and legs
    ctx.strokeStyle = '#3b2a1c';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(-3 + step * 3, 0);
    ctx.moveTo(2, -12);
    ctx.lineTo(3 - step * 3, 0);
    ctx.stroke();
    ctx.fillStyle = '#20150c';
    ctx.fillRect(-5.5 + step * 3, -2, 5, 2.4);
    ctx.fillRect(0.5 - step * 3, -2, 5, 2.4);
    // the pack on the back, a rolled blanket on top
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(-11, -27, 7, 13);
    ctx.fillStyle = '#9c6b3a';
    ctx.fillRect(-11, -27, 7, 2.5);
    ctx.fillStyle = shade(color, 0.8);
    ctx.beginPath();
    ctx.ellipse(-7.5, -29.5, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // a cape that sways
    ctx.fillStyle = shade(color, 0.45);
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.quadraticCurveTo(-9 - step, -16, -7 + Math.sin(p.t * 3) * 1.2, -9);
    ctx.lineTo(-1, -12);
    ctx.closePath();
    ctx.fill();
    // coat, belt and buckle
    const coat = ctx.createLinearGradient(0, -29, 0, -11);
    coat.addColorStop(0, shade(color, 0.85));
    coat.addColorStop(1, shade(color, 0.5));
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-4.5, -29);
    ctx.lineTo(4.5, -29);
    ctx.lineTo(6, -11);
    ctx.lineTo(-6, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3b2a1c';
    ctx.fillRect(-5.5, -18, 11, 2.2);
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(-1, -18.3, 2.4, 2.8);
    // head and scarf
    ctx.fillStyle = '#e8b98c';
    ctx.beginPath();
    ctx.arc(0.5, -33, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94a2e';
    ctx.fillRect(-4, -30, 9, 2.4);
    ctx.fillStyle = '#20150c';
    ctx.fillRect(2, -34, 1.6, 1.6);
    // the wide-brimmed hat
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath();
    ctx.ellipse(0.5, -36.5, 9, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -36.5);
    ctx.quadraticCurveTo(-3.5, -43, 0.5, -43);
    ctx.quadraticCurveTo(5, -43, 5, -36.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-3.8, -38.6, 8.6, 1.6);
    // arm raising a brass spyglass, glinting
    const raise = 0.5 + 0.5 * Math.sin(p.t * 0.9);
    ctx.save();
    ctx.translate(4, -26);
    ctx.rotate(-0.4 - raise * 0.6);
    ctx.strokeStyle = shade(color, 0.7);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(5, -1.8, 9, 3.6);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(12, -1.4, 2.4, 2.8);
    ctx.restore();
}

/** A ring of runes turning round the head (Archon); ascended, three orbs crown it. */
function runeRing(ctx, color, t, tier) {
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0.5, -41, 9, 2.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const a = t * 1.5 + (i / 6) * Math.PI * 2;
        ctx.fillRect(0.5 + Math.cos(a) * 9 - 0.8, -41 + Math.sin(a) * 2.6 - 0.8, 1.6, 1.6);
    }
    if (tier === 3) {
        for (let i = 0; i < 3; i++) {
            const a = t * 0.8 + (i / 3) * Math.PI * 2;
            const ox = 0.5 + Math.cos(a) * 6;
            const oy = -47 + Math.sin(a) * 1.5;
            halo(ctx, ox, oy, 4, color, 0.9);
            ctx.fillStyle = '#fff6d8';
            ctx.beginPath();
            ctx.arc(ox, oy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

/** Crystal shards floating round the ascended Arcanist. */
function shards(ctx, color, t) {
    for (let i = 0; i < 3; i++) {
        const a = t * 1.2 + (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * 12;
        const y = -24 + Math.sin(a) * 4 - 6;
        crystal(ctx, color, x, y, 2.4);
    }
}

function crystal(ctx, color, x, y, r) {
    halo(ctx, x, y, r * 3, color, 0.7);
    ctx.fillStyle = color;
    path(ctx, [{ x, y: y - r * 1.8 }, { x: x + r, y }, { x, y: y + r * 1.8 }, { x: x - r, y }]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    path(ctx, [{ x, y: y - r * 1.8 }, { x: x + r * 0.4, y }, { x, y: y + r * 0.6 }]);
    ctx.fill();
}

function staff(ctx, color, p) {
    const angle = swing(p.attack, 0.12, -0.45, 0.95);   // from straight up, forward is positive
    const hand = { x: 6, y: -19 };
    const up = { x: Math.sin(angle), y: -Math.cos(angle) };
    stroke(ctx, '#3f2a5a', 3, [{ x: 2, y: -26 }, hand]);
    const long = p.form === 'arcanist' ? 6 : 0;
    const bottom = { x: hand.x - up.x * 13, y: hand.y - up.y * 13 };
    const top = { x: hand.x + up.x * (21 + long), y: hand.y + up.y * (21 + long) };
    stroke(ctx, p.form === 'arcanist' ? '#3a3f4a' : '#6b4a2e', 2, [bottom, top]);
    let charge = 0;
    if (p.attack !== null) charge = p.attack < 0 ? 1 + p.attack : Math.max(0, 1 - p.attack * 2);
    const orb = { x: top.x + up.x * 4, y: top.y + up.y * 4 + Math.sin(p.t * 3) * 1.2 };
    if (p.form === 'arcanist') {
        halo(ctx, orb.x, orb.y, 8 + charge * 14, p.accent, 0.8 + charge * 0.2);
        crystal(ctx, p.accent, orb.x, orb.y, 2.6 + charge);
        return;
    }
    halo(ctx, orb.x, orb.y, 9 + charge * (p.nova ? 26 : 14), p.form === 'archon' ? p.accent : color, 0.8 + charge * 0.2);
    ctx.fillStyle = '#f1eaff';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3 + charge * 1.6, 0, Math.PI * 2);
    ctx.fill();
}

/** Where the Technomancer's orb sits, relative to the feet, in unscaled units (for its bolts). */
export const MAGE_ORB = { x: 9, y: -46 };

// ── colour helpers ──────────────────────────────────────────────────────
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

export { hash };
