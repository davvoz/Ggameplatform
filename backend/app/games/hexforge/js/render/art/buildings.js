import { toScreen } from '../../core/iso.js';
import { softGlow } from '../perf.js';
import { drawUpgradeOver, drawUpgradeUnder } from './upgradeArt.js';
import { drawFusionOver, drawFusionUnder } from './fusionArt.js';
import {
    BASALT, IRON, flame, gem, halo, hash, onWall, path, prism, seam, smoke, wallRect, withAlpha,
} from './primitives.js';

/**
 * The buildings, traps and rubble of a city. Each building keeps one
 * signature glow that says what it is about: amber stone, orange scrap,
 * violet mana, green chips, gold vault, and the molten orange of the forge
 * itself. Upgrades and fusions are drawn around it (upgradeArt.js, fusionArt.js).
 */

const PALE = { top: '#6a7480', left: '#434b55', right: '#30363e' };
const COPPER = { top: '#6b4630', left: '#45291b', right: '#321d13' };

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
        prism(ctx, cam, { x: x + 0.12, y: y + 0.12, w: 2.76, d: 2.76, z0: 0, h: 22, mat: IRON });
        seam(ctx, cam, { x: x + 0.12, y: y + 0.12, w: 2.76, d: 2.76, z: 9, color: withAlpha('#ff7a1a', 0.55 + 0.35 * health) });
        prism(ctx, cam, { x: x + 0.45, y: y + 0.45, w: 2.1, d: 2.1, z0: 22, h: 14, mat: IRON });
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
        prism(ctx, cam, { x: x + 1.3, y: y + 1.35, w: 0.4, d: 0.3, z0: 36.5, h: 5, mat: IRON });
        prism(ctx, cam, { x: x + 1.12, y: y + 1.28, w: 0.76, d: 0.44, z0: 41.5, h: 4, mat: { top: '#6b5a4c', left: '#3d3129', right: '#2d241e' } });
        // chimneys on the side corners, clear of the pool
        for (const [dx, dy, seed] of [[0.2, 2.38, 0], [2.38, 0.2, 0.37]]) {
            prism(ctx, cam, { x: x + dx, y: y + dy, w: 0.42, d: 0.42, z0: 22, h: 56, mat: IRON });
            const top = toScreen(cam, x + dx + 0.21, y + dy + 0.21, 80);
            halo(ctx, top.x, top.y, 12 * s, '#ff7a1a', 0.6);
            smoke(ctx, top, time, seed, s);
        }
    },

    wall(ctx, cam, b) {
        const { x, y } = b;
        prism(ctx, cam, { x: x + 0.04, y: y + 0.04, w: 0.92, d: 0.92, z0: 0, h: 18, mat: BASALT });
        for (const [mx, my] of [[0.04, 0.04], [0.56, 0.04], [0.04, 0.56], [0.56, 0.56]]) {
            prism(ctx, cam, { x: x + mx, y: y + my, w: 0.4, d: 0.4, z0: 18, h: 8, mat: { top: '#4a4440', left: '#2d2926', right: '#211e1c' } });
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
        prism(ctx, cam, { x: x + 0.1, y: y + 0.1, w: 1.8, d: 1.8, z0: 0, h: 6, mat: BASALT });
        const stone = { top: '#6d655d', left: '#433d38', right: '#322d29' };
        for (const [dx, dy, w, h] of [[0.3, 0.35, 0.55, 14], [1.0, 0.3, 0.45, 10], [0.4, 1.05, 0.5, 12]]) {
            prism(ctx, cam, { x: x + dx, y: y + dy, w, d: w, z0: 6, h, mat: stone });
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
        prism(ctx, cam, { x: x + 0.2, y: y + 0.25, w: 1.5, d: 1.5, z0: 0, h: 30, mat: IRON });
        seam(ctx, cam, { x: x + 0.2, y: y + 0.25, w: 1.5, d: 1.5, z: 24, color: withAlpha('#ff7a3d', 0.7) });
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
        prism(ctx, cam, { x: x + 1.25, y: y + 0.35, w: 0.38, d: 0.38, z0: 30, h: 34, mat: IRON });
        const top = toScreen(cam, x + 1.44, y + 0.54, 64);
        halo(ctx, top.x, top.y, 10 * s, '#ff7a3d', 0.6);
        smoke(ctx, top, time, b.id * 0.13, s);
    },

    mana_well(ctx, cam, b, { time }) {
        const s = cam.scale;
        const { x, y } = b;
        prism(ctx, cam, { x: x + 0.2, y: y + 0.2, w: 1.6, d: 1.6, z0: 0, h: 14, mat: BASALT });
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
        prism(ctx, cam, { x: x + 0.25, y: y + 0.25, w: 1.5, d: 1.5, z0: 0, h: 8, mat: BASALT });
        prism(ctx, cam, { x: x + 0.55, y: y + 0.55, w: 0.9, d: 0.9, z0: 8, h: 38, mat: { top: '#2f3a33', left: '#1b231e', right: '#131915' } });
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
        prism(ctx, cam, { x: x + 0.2, y: y + 0.2, w: 1.6, d: 1.6, z0: 0, h: 28, mat: IRON });
        for (const z of [8, 20]) seam(ctx, cam, { x: x + 0.2, y: y + 0.2, w: 1.6, d: 1.6, z, color: '#ffd75e', width: 1.2 });
        prism(ctx, cam, { x: x + 0.35, y: y + 0.35, w: 1.3, d: 1.3, z0: 28, h: 6, mat: { top: '#6a5638', left: '#45371f', right: '#342916' } });
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
    prism(ctx, cam, { x: x + 0.22, y: y + 0.22, w: 1.56, d: 1.56, z0: 0, h: 12, mat: BASALT });
    prism(ctx, cam, { x: x + 0.5, y: y + 0.5, w: 1.0, d: 1.0, z0: 12, h: 44, mat: shaftMat });
    seam(ctx, cam, {
        x: x + 0.5, y: y + 0.5, w: 1.0, d: 1.0, z: 34,
        color: withAlpha(rune, 0.6 + 0.4 * Math.max(firing, 0.5 + 0.5 * Math.sin(time * 2 + b.id))),
    });
    // arrow-slit window on the front face
    ctx.save();
    softGlow(ctx, rune, 8 * s);
    ctx.fillStyle = withAlpha(rune, 0.9);
    wallArch(ctx, onWall(cam, 'left', x + 1.0, y + 1.5), 2.5, 18, 27, 31);
    ctx.fill();
    ctx.restore();
    // crenellated crown
    prism(ctx, cam, { x: x + 0.38, y: y + 0.38, w: 1.24, d: 1.24, z0: 56, h: 6, mat: shaftMat });
    for (const [mx, my] of [[0.38, 0.38], [1.36, 0.38], [0.38, 1.36], [1.36, 1.36]]) {
        prism(ctx, cam, { x: x + mx, y: y + my, w: 0.26, d: 0.26, z0: 62, h: 6, mat: shaftMat });
    }
}

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
        prism(ctx, cam, { x: b.x + dx, y: b.y + dy, w: 0.28, d: 0.24, z0: 0, h: 4 + hash(i + b.id) * 6, mat: stone });
    }
    const c = toScreen(cam, b.x + b.size / 2, b.y + b.size / 2, 4);
    halo(ctx, c.x, c.y, 18 * s * b.size, '#ff5a00', 0.25 + 0.15 * Math.sin(time * 2 + b.id));
    smoke(ctx, c, time, b.id * 0.21, s, 3);
}
