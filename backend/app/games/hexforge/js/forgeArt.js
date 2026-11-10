import { toScreen } from './iso.js';

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

export function path(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
}

export function halo(ctx, x, y, radius, color, strength = 1) {
    if (radius <= 0 || strength <= 0) return;
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

/** A glowing seam across the two front faces of a box at height z. */
function seam(ctx, cam, x, y, w, d, z, color, width = 1.6) {
    const a = toScreen(cam, x, y + d, z);
    const b = toScreen(cam, x + w, y + d, z);
    const c = toScreen(cam, x + w, y, z);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * cam.scale;
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

function smoke(ctx, c, time, seed, s, count = 4) {
    for (let i = 0; i < count; i++) {
        const life = (time * 0.35 + i / count + seed) % 1;
        ctx.fillStyle = `rgba(70, 62, 58, ${0.32 * (1 - life)})`;
        ctx.beginPath();
        ctx.arc(c.x + life * 14 * s, c.y - life * 46 * s, (4 + life * 11) * s, 0, Math.PI * 2);
        ctx.fill();
    }
}

function gem(ctx, c, r, light, dark) {
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
    painter(ctx, cam, b, look);
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
            ctx.shadowColor = '#6fd3ff';
            ctx.shadowBlur = 12 * s;
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
        const m = toScreen(cam, x + 0.95, y + 1.75, 6);
        const flick = 0.75 + 0.25 * Math.sin(time * 11 + b.id);
        ctx.save();
        ctx.shadowColor = '#ff7a3d';
        ctx.shadowBlur = 14 * s;
        ctx.fillStyle = `rgba(255, ${140 + Math.round(60 * flick)}, 50, 1)`;
        ctx.beginPath();
        ctx.moveTo(m.x - 9 * s, m.y + 4 * s);
        ctx.lineTo(m.x - 9 * s, m.y - 8 * s);
        ctx.quadraticCurveTo(m.x, m.y - 18 * s, m.x + 9 * s, m.y - 8 * s);
        ctx.lineTo(m.x + 9 * s, m.y + 4 * s);
        ctx.closePath();
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
                const pl = toScreen(cam, x + 0.62 + col * 0.26, y + 1.45, z);
                const pr = toScreen(cam, x + 1.45, y + 1.28 - col * 0.26, z);
                ctx.fillStyle = on ? '#4dff9a' : 'rgba(77, 255, 154, 0.18)';
                ctx.fillRect(pl.x - 2 * s, pl.y - 2 * s, 4 * s, 3 * s);
                ctx.fillRect(pr.x - 2 * s, pr.y - 2 * s, 4 * s, 3 * s);
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
        const door = toScreen(cam, x + 1, y + 1.8, 14);
        ctx.save();
        ctx.strokeStyle = '#ffd75e';
        ctx.lineWidth = 2 * s;
        ctx.shadowColor = '#ffd75e';
        ctx.shadowBlur = 8 * s;
        ctx.beginPath();
        ctx.ellipse(door.x, door.y, 9 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(door.x - 5 * s, door.y); ctx.lineTo(door.x + 5 * s, door.y);
        ctx.moveTo(door.x, door.y - 5 * s); ctx.lineTo(door.x, door.y + 5 * s);
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
    const w = toScreen(cam, x + 1.0, y + 1.5, 20);
    ctx.save();
    ctx.shadowColor = rune;
    ctx.shadowBlur = 8 * s;
    ctx.fillStyle = withAlpha(rune, 0.9);
    ctx.beginPath();
    ctx.moveTo(w.x - 2.5 * s, w.y + 2 * s);
    ctx.lineTo(w.x - 2.5 * s, w.y - 7 * s);
    ctx.quadraticCurveTo(w.x, w.y - 11 * s, w.x + 2.5 * s, w.y - 7 * s);
    ctx.lineTo(w.x + 2.5 * s, w.y + 2 * s);
    ctx.closePath();
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
/** `s` already includes the hero scale; (x, y) is the foot point; `facing` -1 / 1. */
export function drawHero(ctx, hero, x, y, s, color, time) {
    if (hero.cls === 'guardian') guardian(ctx, x, y, s, color, hero.facing || 1);
    else if (hero.cls === 'neon_blade') blade(ctx, x, y, s, color, hero.facing || 1);
    else mage(ctx, x, y, s, color, time + hero.id);
}

function legs(ctx, x, y, s, step) {
    ctx.fillStyle = '#1a1411';
    ctx.fillRect(x - 5 * s, y - 9 * s + step, 4 * s, 9 * s - step);
    ctx.fillRect(x + 1 * s, y - 9 * s - step, 4 * s, 9 * s + step);
}

function guardian(ctx, x, y, s, color, facing) {
    legs(ctx, x, y, s, 0);
    // plate body and tabard
    ctx.fillStyle = '#3a3029';
    path(ctx, [{ x: x - 9 * s, y: y - 8 * s }, { x: x - 8 * s, y: y - 25 * s }, { x: x + 8 * s, y: y - 25 * s }, { x: x + 9 * s, y: y - 8 * s }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: x - 4 * s, y: y - 6 * s }, { x: x - 4 * s, y: y - 22 * s }, { x: x + 4 * s, y: y - 22 * s }, { x: x + 4 * s, y: y - 6 * s }]);
    ctx.fill();
    // helm with a glowing visor
    ctx.fillStyle = '#4d3d31';
    ctx.beginPath();
    ctx.arc(x, y - 29 * s, 6 * s, Math.PI, 0);
    ctx.lineTo(x + 6 * s, y - 25 * s);
    ctx.lineTo(x - 6 * s, y - 25 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(x - 4 * s, y - 29 * s, 8 * s, 1.6 * s);
    // tower shield on the facing side
    const sx = x + facing * 9 * s;
    ctx.fillStyle = shade(color, 0.6);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(sx - 6 * s, y - 26 * s);
    ctx.lineTo(sx + 6 * s, y - 26 * s);
    ctx.lineTo(sx + 6 * s, y - 10 * s);
    ctx.quadraticCurveTo(sx, y - 2 * s, sx - 6 * s, y - 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(sx - 1 * s, y - 23 * s, 2 * s, 12 * s);
}

function blade(ctx, x, y, s, color, facing) {
    legs(ctx, x, y, s, 1.5 * s);
    // hooded cloak
    ctx.fillStyle = shade(color, 0.55);
    path(ctx, [{ x: x - 8 * s, y: y - 6 * s }, { x: x, y: y - 32 * s }, { x: x + 8 * s, y: y - 6 * s }]);
    ctx.fill();
    ctx.fillStyle = color;
    path(ctx, [{ x: x - 4 * s, y: y - 7 * s }, { x: x, y: y - 27 * s }, { x: x + 4 * s, y: y - 7 * s }]);
    ctx.fill();
    // eyes in the hood
    ctx.fillStyle = '#ffe0ef';
    ctx.fillRect(x - 3 * s, y - 25 * s, 2 * s, 1.4 * s);
    ctx.fillRect(x + 1 * s, y - 25 * s, 2 * s, 1.4 * s);
    // twin daggers
    ctx.strokeStyle = '#ffe9f3';
    ctx.lineWidth = 1.6 * s;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
        const hx = x + side * 8 * s;
        ctx.beginPath();
        ctx.moveTo(hx, y - 14 * s);
        ctx.lineTo(hx + side * facing * 6 * s, y - 24 * s);
        ctx.stroke();
    }
}

function mage(ctx, x, y, s, color, phase) {
    // robe
    ctx.fillStyle = shade(color, 0.5);
    path(ctx, [{ x: x - 10 * s, y: y - 1 * s }, { x: x - 4 * s, y: y - 26 * s }, { x: x + 4 * s, y: y - 26 * s }, { x: x + 10 * s, y: y - 1 * s }]);
    ctx.fill();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 24 * s); ctx.lineTo(x, y - 2 * s);
    ctx.stroke();
    // hood
    ctx.fillStyle = shade(color, 0.7);
    ctx.beginPath();
    ctx.arc(x, y - 29 * s, 5.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1eaff';
    ctx.fillRect(x - 2.5 * s, y - 29 * s, 5 * s, 1.4 * s);
    // staff with a floating orb
    ctx.strokeStyle = '#6b4a2e';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 11 * s, y);
    ctx.lineTo(x + 11 * s, y - 34 * s);
    ctx.stroke();
    const oy = y - 39 * s + Math.sin(phase * 3) * 2 * s;
    halo(ctx, x + 11 * s, oy, 12 * s, color, 1);
    ctx.fillStyle = '#f1eaff';
    ctx.beginPath();
    ctx.arc(x + 11 * s, oy, 3.2 * s, 0, Math.PI * 2);
    ctx.fill();
}

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
