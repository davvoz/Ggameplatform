import { halo, onWall, path, prism, wallRect, withAlpha } from './forgeArt.js';
import { toScreen } from '../core/iso.js';
import { softGlow } from './perf.js';
import { BUILDING_INFO, PATH_INFO } from '../data/labels.js';

/**
 * What an upgrade looks like on the map, drawn around the building's own art:
 *   level 2+  a brass plinth under it (a second step from level 4)
 *   level 3+  the plinth glows in the path's colour, and the path shows:
 *             each path has its own piece of gear, growing at levels 4 and 5
 *   level 5   an aura and rising sparks
 * `under` draws before the building, `over` after it.
 */

const BRASS = { top: '#a07a3e', left: '#6b4c22', right: '#4e3616' };
const STEEL = { top: '#7d8894', left: '#525b66', right: '#3a4149' };
const GOLD = { top: '#ffd36b', left: '#c9952e', right: '#9a6d1c' };

const step = (level) => Math.max(0, level - 2);      // 0 at level 2, then 1, 2, 3 along the path

export function drawUpgradeUnder(ctx, cam, b, time) {
    const { x, y, size: n } = b;
    const pad = b.type === 'wall' ? 0.04 : 0.1;
    prism(ctx, cam, { x: x - pad, y: y - pad, w: n + pad * 2, d: n + pad * 2, z0: 0, h: 2.5, mat: BRASS });
    if (b.level >= 4 && b.type !== 'wall') prism(ctx, cam, { x: x - pad * 2, y: y - pad * 2, w: n + pad * 4, d: n + pad * 4, z0: -2.5, h: 2.5, mat: BRASS });
    if (b.level >= 3 && b.path) {
        const color = accent(b);
        const a = toScreen(cam, x - pad, y + n + pad, 2.5);
        const c = toScreen(cam, x + n + pad, y + n + pad, 2.5);
        const d = toScreen(cam, x + n + pad, y - pad, 2.5);
        ctx.save();
        softGlow(ctx, color, 8 * cam.scale);
        ctx.strokeStyle = withAlpha(color, 0.6 + 0.25 * Math.sin(time * 2 + b.id));
        ctx.lineWidth = 1.6 * cam.scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.restore();
    }
}

export function drawUpgradeOver(ctx, cam, b, time) {
    const k = b.path ? step(b.level) : 0;
    if (k > 0) PATH_ART[b.path]?.(ctx, cam, b, time, k);
    if (b.level >= 5 && b.type !== 'wall') aura(ctx, cam, b, time);
}

/** A band on the two front faces only (no top), so the building stays visible above and below it. */
function band(ctx, cam, x, y, w, d, z0, h, mat, rivets = false) {
    const P = (px, py, pz) => toScreen(cam, px, py, pz);
    const faces = [
        [mat.left, [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)]],
        [mat.right, [P(x + w, y + d, z0), P(x + w, y, z0), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h)]],
    ];
    ctx.lineWidth = Math.max(1, cam.scale);
    for (const [fill, pts] of faces) {
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = '#0b0705';
        ctx.stroke();
    }
    if (!rivets) return;
    ctx.fillStyle = 'rgba(255, 240, 210, 0.7)';
    const r = 1.1 * cam.scale;
    for (let i = 1; i < 4; i++) {
        for (const p of [P(x + (w * i) / 4, y + d, z0 + h / 2), P(x + w, y + d - (d * i) / 4, z0 + h / 2)]) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function accent(b) {
    return PATH_INFO[b.path]?.accent ?? '#ffb347';
}

function centre(cam, b, z) {
    return toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, z);
}

function aura(ctx, cam, b, time) {
    const s = cam.scale;
    const color = accent(b);
    const base = centre(cam, b, 0);
    halo(ctx, base.x, base.y, (26 + 4 * Math.sin(time * 2)) * s * b.size, color, 0.45);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i++) {
        const life = (time * 0.5 + i / 6 + b.id * 0.13) % 1;
        const angle = i * 1.7 + b.id;
        const r = 18 * s * b.size * 0.5;
        ctx.globalAlpha = 0.8 * (1 - life);
        ctx.fillRect(base.x + Math.cos(angle) * r, base.y + Math.sin(angle) * r * 0.5 - life * 50 * s, 2 * s, 2 * s);
    }
    ctx.restore();
}

const TOWER_TOP = 68;

const PATH_ART = {
    // a long barrel with a glinting scope, longer at each level
    sniper(ctx, cam, b, time, k) {
        const s = cam.scale;
        const c = centre(cam, b, TOWER_TOP + 6);
        const len = (24 + 9 * k) * s;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#2a1d14';
        ctx.lineWidth = 7 * s;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + len, c.y - len * 0.25);
        ctx.stroke();
        ctx.strokeStyle = '#c99550';
        ctx.lineWidth = 3.6 * s;
        ctx.stroke();
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(c.x + len * 0.3, c.y - len * 0.08 - 8 * s, 10 * s, 4 * s);
        halo(ctx, c.x + len * 0.3 + 7 * s, c.y - len * 0.08 - 4.5 * s, 6 * s, '#fff1c8', 0.6 + 0.4 * Math.sin(time * 3));
        ctx.restore();
    },
    // a crown of spinning barrels, more barrels each level
    gatling(ctx, cam, b, time, k) {
        const s = cam.scale;
        const c = centre(cam, b, TOWER_TOP + 4);
        const count = 3 + k;
        ctx.save();
        const order = [...Array(count).keys()].map((i) => time * 4 + (i / count) * Math.PI * 2)
            .sort((a, b2) => Math.sin(a) - Math.sin(b2));            // back barrels first
        for (const a of order) {
            const bx = c.x + Math.cos(a) * 13 * s;
            const by = c.y + Math.sin(a) * 6 * s;
            ctx.fillStyle = Math.sin(a) > 0 ? '#7a6450' : '#3a2d22';
            ctx.fillRect(bx - 2.4 * s, by - 16 * s, 4.8 * s, 16 * s);
            ctx.strokeStyle = '#0b0705';
            ctx.lineWidth = 0.8 * s;
            ctx.strokeRect(bx - 2.4 * s, by - 16 * s, 4.8 * s, 16 * s);
            ctx.fillStyle = '#ff8a3d';
            ctx.fillRect(bx - 1.4 * s, by - 18 * s, 2.8 * s, 2.8 * s);
        }
        ctx.restore();
    },
    // tesla coils at the corners, arcs jumping between them
    storm(ctx, cam, b, time, k) {
        const s = cam.scale;
        const spots = [[b.x + 0.2, b.y + b.size - 0.2], [b.x + b.size - 0.2, b.y + 0.2], [b.x + b.size - 0.2, b.y + b.size - 0.2]]
            .slice(0, 1 + k);
        const tops = spots.map(([px, py]) => {
            prism(ctx, cam, { x: px - 0.12, y: py - 0.12, w: 0.24, d: 0.24, z0: 0, h: 22, mat: STEEL });
            const t = toScreen(cam, px, py, 26);
            halo(ctx, t.x, t.y, 7 * s, '#8fd6ff', 0.9);
            ctx.fillStyle = '#e8f8ff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2.4 * s, 0, Math.PI * 2);
            ctx.fill();
            return t;
        });
        const top = centre(cam, b, TOWER_TOP + 4);
        ctx.save();
        ctx.strokeStyle = 'rgba(190, 235, 255, 0.85)';
        ctx.lineWidth = 1.2 * s;
        tops.forEach((t, i) => {
            if (Math.sin(time * 9 + i * 2.1 + b.id) < 0.2) return;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            for (let j = 1; j < 5; j++) {
                const f = j / 5;
                ctx.lineTo(t.x + (top.x - t.x) * f + (hashy(time, j + i) - 0.5) * 8 * s, t.y + (top.y - t.y) * f);
            }
            ctx.lineTo(top.x, top.y);
            ctx.stroke();
        });
        ctx.restore();
    },
    // a big capacitor orb over the tower, bigger each level
    overload(ctx, cam, b, time, k) {
        const s = cam.scale;
        const c = centre(cam, b, TOWER_TOP + 18 + 3 * k);
        const r = (5 + 2 * k) * s;
        halo(ctx, c.x, c.y, r * 3.2, '#c58bff', 0.8 + 0.2 * Math.sin(time * 5));
        const g = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, 1, c.x, c.y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#d9b8ff');
        g.addColorStop(1, '#6a2fc0');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
    },
    // ice crystals growing round the base
    glacier(ctx, cam, b, time, k) {
        const s = cam.scale;
        const count = 3 + 2 * k;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + 0.4;
            const p = toScreen(cam, b.x + b.size / 2 + Math.cos(a) * b.size * 0.55, b.y + b.size / 2 + Math.sin(a) * b.size * 0.55, 0);
            const h = (8 + 5 * ((i * 7) % 3) + 2 * k) * s;
            path(ctx, [{ x: p.x - 3 * s, y: p.y }, { x: p.x, y: p.y - h }, { x: p.x + 3 * s, y: p.y }]);
            ctx.fillStyle = 'rgba(190, 236, 255, 0.85)';
            ctx.fill();
            path(ctx, [{ x: p.x, y: p.y }, { x: p.x, y: p.y - h }, { x: p.x + 3 * s, y: p.y }]);
            ctx.fillStyle = 'rgba(120, 190, 230, 0.9)';
            ctx.fill();
        }
    },
    // snow whirling round the top
    blizzard(ctx, cam, b, time, k) {
        const s = cam.scale;
        const c = centre(cam, b, TOWER_TOP - 10);
        ctx.save();
        ctx.fillStyle = '#f2fbff';
        const count = 10 + 6 * k;
        for (let i = 0; i < count; i++) {
            const a = time * (1.5 + (i % 3) * 0.4) + i * 2.4;
            const r = (14 + (i % 4) * 5 + 3 * k) * s;
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(i + time);
            ctx.fillRect(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.45 - (i % 5) * 6 * s, 2 * s, 2 * s);
        }
        ctx.restore();
    },
    // riveted steel plating on the wall
    bulwark(ctx, cam, b, time, k) {
        band(ctx, cam, b.x - 0.04, b.y - 0.04, b.size + 0.08, b.size + 0.08, 4, 5 + 2 * k, STEEL, true);
        if (k >= 2) band(ctx, cam, b.x - 0.04, b.y - 0.04, b.size + 0.08, b.size + 0.08, 16, 4, STEEL, true);
    },
    // iron spikes along the top, more each level
    spiked(ctx, cam, b, time, k) {
        const s = cam.scale;
        const n = 1 + k;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const p = toScreen(cam, b.x + (i + 0.5) / n, b.y + (j + 0.5) / n, 26);
                path(ctx, [{ x: p.x - 2.6 * s, y: p.y }, { x: p.x, y: p.y - 9 * s }, { x: p.x + 2.6 * s, y: p.y }]);
                ctx.fillStyle = '#c9cfd6';
                ctx.fill();
                ctx.strokeStyle = '#2a2f35';
                ctx.lineWidth = 0.8 * s;
                ctx.stroke();
            }
        }
    },
    // gold nuggets on the plinth and sparkles rising
    rich_vein(ctx, cam, b, time, k) {
        const s = cam.scale;
        for (let i = 0; i < 2 + k; i++) {
            const p = toScreen(cam, b.x + b.size - 0.15, b.y + 0.3 + i * 0.45, 3);
            ctx.fillStyle = i % 2 ? '#ffd36b' : '#e8a92e';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.6 * s, 0, Math.PI * 2);
            ctx.fill();
        }
        const c = centre(cam, b, BUILDING_INFO[b.type].height);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffe08a';
        for (let i = 0; i < 3 + k; i++) {
            const life = (time * 0.6 + i / (3 + k) + b.id * 0.2) % 1;
            ctx.globalAlpha = 1 - life;
            ctx.fillRect(c.x + Math.sin(i * 2.3) * 12 * s, c.y - life * 30 * s, 2 * s, 2 * s);
        }
        ctx.restore();
    },
    // extra storage bins beside the building, one more each level
    deep_store(ctx, cam, b, time, k) {
        for (let i = 0; i < k; i++) {
            prism(ctx, cam, { x: b.x + b.size - 0.05, y: b.y + 0.15 + i * 0.6, w: 0.45, d: 0.5, z0: 0, h: 10 + 3 * i, mat: { top: '#4a6a8a', left: '#2e4560', right: '#223348' } });
        }
    },
    // gold bands and a padlock
    strongbox(ctx, cam, b, time, k) {
        const s = cam.scale;
        band(ctx, cam, b.x - 0.03, b.y - 0.03, b.size + 0.06, b.size + 0.06, 6, 2 + k, GOLD);
        if (k >= 2) band(ctx, cam, b.x - 0.03, b.y - 0.03, b.size + 0.06, b.size + 0.06, 22, 2 + k, GOLD);
        const lock = onWall(cam, 'left', b.x + b.size / 2, b.y + b.size);
        ctx.fillStyle = '#ffd36b';
        wallRect(ctx, lock, -4, 4, 17, 24);
        ctx.fill();
        // the shackle: a half ring on the wall above the body
        ctx.strokeStyle = '#ffd36b';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
            const a = (Math.PI * i) / 12;
            const q = lock(-3 * Math.cos(a), 24 + 3 * Math.sin(a));
            if (i) ctx.lineTo(q.x, q.y);
            else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
    },
    // steel plates bolted on, thicker each level
    armored(ctx, cam, b, time, k) {
        band(ctx, cam, b.x - 0.06, b.y - 0.06, b.size + 0.12, b.size + 0.12, 3, 7 + 3 * k, STEEL, true);
    },
    // little turrets on the corners of the Core, one more each level
    citadel(ctx, cam, b, time, k) {
        const corners = [[b.x, b.y + b.size - 0.5], [b.x + b.size - 0.5, b.y], [b.x + b.size - 0.5, b.y + b.size - 0.5], [b.x, b.y]];
        for (const [px, py] of corners.slice(0, 1 + k)) {
            prism(ctx, cam, { x: px, y: py, w: 0.5, d: 0.5, z0: 0, h: 34, mat: BRASS });
            prism(ctx, cam, { x: px - 0.05, y: py - 0.05, w: 0.6, d: 0.6, z0: 34, h: 4, mat: GOLD });
        }
    },
    // a beam of light rising from the Core, wider each level
    beacon(ctx, cam, b, time, k) {
        const s = cam.scale;
        const c = centre(cam, b, BUILDING_INFO.core.height);
        const w = (4 + 2 * k) * s;
        const h = (70 + 20 * k) * s;
        const g = ctx.createLinearGradient(0, c.y, 0, c.y - h);
        g.addColorStop(0, withAlpha('#ff3d9a', 0.75));
        g.addColorStop(1, withAlpha('#ff3d9a', 0));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 3);
        ctx.fillStyle = g;
        ctx.fillRect(c.x - w / 2, c.y - h, w, h);
        ctx.restore();
        halo(ctx, c.x, c.y, 14 * s, '#ff3d9a', 0.9);
    },
};

function hashy(t, n) {
    const v = Math.sin(Math.floor(t * 12) * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
}
