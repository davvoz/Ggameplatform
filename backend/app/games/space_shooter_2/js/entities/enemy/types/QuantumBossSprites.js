/**
 * QuantumBossSprites v2 — Spectacular procedural boss art for World 4.
 *
 * Design pillars:
 *   1. SILHOUETTE — each boss has a unique, instantly-recognisable shape
 *   2. LAYERED DEPTH — dark outline → body → inner detail → specular → glow
 *   3. ANIMATED PERSONALITY — eyes track player, expressions react to HP,
 *      body parts breathe/pulse, energy FX loop smoothly
 *   4. INDIE POLISH — thick outlines, vibrant palette, hand-drawn feel
 *
 * Every boss is drawn as one unified piece (NOT per-part circles).
 * The hit-boxes remain BossPart[]  — the art simply paints OVER them.
 */

const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos, abs = Math.abs;
const hypot = Math.hypot, floor = Math.floor, min = Math.min, max = Math.max;

// ───────── colour helpers ─────────
function hexRgb(h) {
    if (h[0] !== '#') { const m = h.match(/(\d+)/g); return [+m[0], +m[1], +m[2]]; }
    const v = Number.parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function rgb(r, g, b) { return `rgb(${Math.trunc(r)},${Math.trunc(g)},${Math.trunc(b)})`; }
function rgba(r, g, b, a) { return `rgba(${Math.trunc(r)},${Math.trunc(g)},${Math.trunc(b)},${a})`; }
function colStr([r, g, b]) { return rgb(r, g, b); }
function darken(hex, k) { const c = hexRgb(hex); return rgb(c[0] * (1 - k), c[1] * (1 - k), c[2] * (1 - k)); }
function lighten(hex, k) { const c = hexRgb(hex); return rgb(c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k); }
function lerpCol(a, b, f) {
    const ca = hexRgb(a), cb = hexRgb(b);
    return rgb(ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f);
}

// ───────── drawing primitives ─────────

/** Glossy body fill with 3-stop radial + specular highlight */
function glossyBody(ctx, cx, cy, r, base, edgeDark) {
    edgeDark = edgeDark || 0.55;
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.28, r * 0.04, cx, cy, r);
    g.addColorStop(0, lighten(base, 0.45));
    g.addColorStop(0.35, base);
    g.addColorStop(1, darken(base, edgeDark));
    ctx.fillStyle = g;
    ctx.fill();
    // Specular spot
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.22, cy - r * 0.28, r * 0.18, r * 0.12, -0.4, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Thick cartoon outline */
function thickOutline(ctx, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** Expressive eye — large, reactive, with lid control
 *  mood: 0=neutral 1=angry 2=worried 3=smug 4=shocked 5=sleepy */
function drawBossEye(ctx, ex, ey, size, lookAng, irisColor, mood, lidOpen) {
    const s = size;
    lidOpen = lidOpen !== undefined ? lidOpen : 1;
    ctx.save();
    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 1.0, s * 0.78 * lidOpen, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
    // Iris
    const px = ex + cos(lookAng) * s * 0.2;
    const py = ey + sin(lookAng) * s * 0.2;
    const iG = ctx.createRadialGradient(px - s * 0.06, py - s * 0.06, s * 0.02, px, py, s * 0.42);
    iG.addColorStop(0, lighten(irisColor, 0.35));
    iG.addColorStop(0.5, irisColor);
    iG.addColorStop(1, darken(irisColor, 0.5));
    ctx.fillStyle = iG;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.42, 0, TAU);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(px, py, s * 0.22, 0, TAU);
    ctx.fill();
    // Pupil highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px - s * 0.1, py - s * 0.1, s * 0.11, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(px + s * 0.08, py + s * 0.08, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyelid (mood-driven)
    if (mood === 1 || mood === 3) { // angry/smug: V-brow
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = s * 0.18;
        ctx.lineCap = 'round';
        const tilt = mood === 1 ? -0.22 : 0.15;
        ctx.beginPath();
        ctx.moveTo(ex - s * 0.9, ey - s * (0.6 + tilt));
        ctx.lineTo(ex + s * 0.2, ey - s * (0.7 - tilt * 0.5));
        ctx.stroke();
    } else if (mood === 2) { // worried: raised inner brow
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = s * 0.14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - s * 0.8, ey - s * 0.55);
        ctx.quadraticCurveTo(ex, ey - s * 1.1, ex + s * 0.4, ey - s * 0.6);
        ctx.stroke();
    } else if (mood === 5) { // sleepy half-lid
        ctx.fillStyle = darken(irisColor, 0.3);
        ctx.beginPath();
        ctx.ellipse(ex, ey - s * 0.1, s * 1.05, s * 0.45, 0, Math.PI, TAU);
        ctx.fill();
    }
    ctx.restore();
}

// ─── Specialized Eye Types (diverse, refined) ─────────

/** Cat-slit eye — vertical slit pupil, feline grace */
function drawSlitEye(ctx, ex, ey, size, lookAng, irisColor) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 1.0, s * 0.68, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
    const px = ex + cos(lookAng) * s * 0.18;
    const py = ey + sin(lookAng) * s * 0.18;
    const iG = ctx.createRadialGradient(px, py - s * 0.05, s * 0.02, px, py, s * 0.42);
    iG.addColorStop(0, lighten(irisColor, 0.4));
    iG.addColorStop(0.6, irisColor);
    iG.addColorStop(1, darken(irisColor, 0.5));
    ctx.fillStyle = iG;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px, py, s * 0.06, s * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - s * 0.12, py - s * 0.1, s * 0.09, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(px + s * 0.06, py + s * 0.08, s * 0.04, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Compound faceted insect eye */
function drawCompoundEye(ctx, ex, ey, size, col) {
    const s = size;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, s, 0, TAU);
    const cG = ctx.createRadialGradient(ex - s * 0.2, ey - s * 0.2, s * 0.05, ex, ey, s);
    cG.addColorStop(0, lighten(col, 0.5));
    cG.addColorStop(0.5, col);
    cG.addColorStop(1, darken(col, 0.5));
    ctx.fillStyle = cG;
    ctx.fill();
    ctx.strokeStyle = darken(col, 0.4);
    ctx.lineWidth = s * 0.1;
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = darken(col, 0.3);
    ctx.lineWidth = 0.6;
    const hexR = s * 0.28;
    for (let row = -1; row <= 1; row++) {
        for (let c = -1; c <= 1; c++) {
            const hx = ex + c * hexR * 1.55 + (row % 2) * hexR * 0.77;
            const hy = ey + row * hexR * 1.35;
            if (hypot(hx - ex, hy - ey) > s * 0.75) continue;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = TAU / 6 * i;
                const fx = hx + cos(a) * hexR * 0.5;
                const fy = hy + sin(a) * hexR * 0.5;
                i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - s * 0.15, ey - s * 0.15, s * 0.15, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Diamond-pupil regal almond eye */
function drawDiamondEye(ctx, ex, ey, size, lookAng, irisColor) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#fffff8';
    ctx.beginPath();
    ctx.moveTo(ex - s * 1.1, ey);
    ctx.quadraticCurveTo(ex, ey - s * 0.8, ex + s * 1.1, ey);
    ctx.quadraticCurveTo(ex, ey + s * 0.8, ex - s * 1.1, ey);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.07;
    ctx.stroke();
    const px = ex + cos(lookAng) * s * 0.15;
    const py = ey + sin(lookAng) * s * 0.15;
    const iG = ctx.createRadialGradient(px, py - s * 0.04, s * 0.02, px, py, s * 0.4);
    iG.addColorStop(0, lighten(irisColor, 0.5));
    iG.addColorStop(0.5, irisColor);
    iG.addColorStop(1, darken(irisColor, 0.4));
    ctx.fillStyle = iG;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.22);
    ctx.lineTo(px + s * 0.11, py);
    ctx.lineTo(px, py + s * 0.22);
    ctx.lineTo(px - s * 0.11, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.18);
    ctx.lineTo(px + s * 0.07, py - s * 0.02);
    ctx.lineTo(px, py + s * 0.02);
    ctx.lineTo(px - s * 0.07, py - s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - s * 0.1, py - s * 0.12, s * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Spiral/hypnotic concentric-ring eye */
function drawSpiralEye(ctx, ex, ey, size, col, t) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
    const rings = 5;
    for (let i = rings; i >= 0; i--) {
        const r = s * 0.7 * (i / rings);
        ctx.fillStyle = i % 2 === 0 ? col : lighten(col, 0.6);
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, TAU);
        ctx.fill();
    }
    ctx.strokeStyle = darken(col, 0.3);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let a = 0; a < TAU * 3; a += 0.15) {
        const r = s * 0.05 + (a / (TAU * 3)) * s * 0.65;
        const px = ex + cos(a + t * 3) * r;
        const py = ey + sin(a + t * 3) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - s * 0.15, ey - s * 0.2, s * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Reticle/crosshair targeting eye */
function drawReticleEye(ctx, ex, ey, size, lookAng, irisColor) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
    const px = ex + cos(lookAng) * s * 0.15;
    const py = ey + sin(lookAng) * s * 0.15;
    ctx.fillStyle = irisColor;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px, py, s * 0.18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = lighten(irisColor, 0.5);
    ctx.lineWidth = s * 0.04;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.45, py); ctx.lineTo(px - s * 0.08, py);
    ctx.moveTo(px + s * 0.08, py); ctx.lineTo(px + s * 0.45, py);
    ctx.moveTo(px, py - s * 0.45); ctx.lineTo(px, py - s * 0.08);
    ctx.moveTo(px, py + s * 0.08); ctx.lineTo(px, py + s * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, s * 0.35, 0, TAU);
    ctx.strokeStyle = lighten(irisColor, 0.3);
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - s * 0.1, py - s * 0.1, s * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Prismatic rainbow-iris eye */
function drawPrismaticEye(ctx, ex, ey, size, lookAng, t) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#fffff8';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.9, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.07;
    ctx.stroke();
    const px = ex + cos(lookAng) * s * 0.15;
    const py = ey + sin(lookAng) * s * 0.15;
    const rainbowCols = ['#ff2244', '#ff8822', '#ffdd22', '#22dd66', '#2266ff', '#8833ff'];
    const irisR = s * 0.42;
    for (let i = 0; i < rainbowCols.length; i++) {
        ctx.fillStyle = rainbowCols[i];
        ctx.beginPath();
        const a1 = TAU / rainbowCols.length * i + t * 0.5;
        const a2 = TAU / rainbowCols.length * (i + 1) + t * 0.5;
        ctx.moveTo(px, py);
        ctx.arc(px, py, irisR, a1, a2);
        ctx.closePath();
        ctx.fill();
    }
    const sG = ctx.createRadialGradient(px, py, irisR * 0.5, px, py, irisR);
    sG.addColorStop(0, 'rgba(255,255,255,0)');
    sG.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = sG;
    ctx.beginPath();
    ctx.arc(px, py, irisR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px, py, s * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - s * 0.1, py - s * 0.1, s * 0.09, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(px + s * 0.06, py + s * 0.08, s * 0.04, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Starburst eye — radiating rays from pupil */
function drawStarburstEye(ctx, ex, ey, size, lookAng, irisColor, t) {
    const s = size;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 1.0, s * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = s * 0.07;
    ctx.stroke();
    const px = ex + cos(lookAng) * s * 0.18;
    const py = ey + sin(lookAng) * s * 0.18;
    ctx.fillStyle = irisColor;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.42, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = lighten(irisColor, 0.6);
    ctx.lineWidth = s * 0.04;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 8; i++) {
        const a = TAU / 8 * i + t * 2;
        ctx.beginPath();
        ctx.moveTo(px + cos(a) * s * 0.1, py + sin(a) * s * 0.1);
        ctx.lineTo(px + cos(a) * s * 0.38, py + sin(a) * s * 0.38);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px, py, s * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - s * 0.1, py - s * 0.09, s * 0.09, 0, TAU);
    ctx.fill();
    ctx.restore();
}

/** Draw an energy tendril between two points */
function energyTendril(ctx, x1, y1, x2, y2, t, col, width, wiggle) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = width || 2;
    ctx.globalAlpha = 0.65;
    ctx.lineCap = 'round';
    const segs = 10;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
        const f = i / segs;
        const mx = x1 + (x2 - x1) * f;
        const my = y1 + (y2 - y1) * f;
        const perp = sin(f * Math.PI * 4 + t * 7) * (wiggle || 6);
        const nx = -(y2 - y1), ny = (x2 - x1);
        const len = hypot(nx, ny) || 1;
        ctx.lineTo(mx + nx / len * perp, my + ny / len * perp);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Core glow
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = (width || 2) * 3;
    ctx.stroke();
    ctx.restore();
}

/** Pulsing halo ring */
function haloRing(ctx, cx, cy, r, t, col, speed) {
    ctx.save();
    const pulse = 0.4 + 0.3 * sin(t * (speed || 3));
    ctx.globalAlpha = pulse * 0.35;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const n = 48;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const wobble = sin(a * 5 + t * 4) * 2.5 + sin(a * 9 + t * 6) * 1.2;
        const px = cx + cos(a) * (r + wobble);
        const py = cy + sin(a) * (r + wobble);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

/** Orbiting energy motes around a center */
function orbitMotes(ctx, cx, cy, r, count, t, cols, moteR) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
        const a = TAU / count * i + t * 1.5;
        const mr = r + sin(t * 2 + i * 1.7) * 5;
        const mx = cx + cos(a) * mr;
        const my = cy + sin(a) * mr;
        ctx.globalAlpha = 0.5 + 0.3 * sin(t * 3 + i);
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(mx, my, moteR || 2.5, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
}

/** HP-reactive state: returns { hpRatio, isLow, isCritical, breathe(t), rage } */
function bossState(boss, t) {
    const r = boss.health / boss.maxHealth;
    return {
        hpRatio: r,
        isLow: r < 0.5,
        isCritical: r < 0.25,
        breathe: 1 + sin(t * 2.5) * 0.03,
        rage: r < 0.3 ? 1 : 0,
        enraged: !!boss.enraged
    };
}

/** Mouth helper — arcs/lines with a few teeth for angry bosses */
function drawMouth(ctx, cx, cy, w, mood, t, color) {
    ctx.save();
    ctx.strokeStyle = color || '#000000';
    ctx.fillStyle = color || '#000000';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    if (mood === 'grin') {
        ctx.beginPath();
        ctx.arc(cx, cy - w * 0.1, w * 0.45, 0.15, Math.PI - 0.15);
        ctx.stroke();
        // Teeth
        for (let i = 0; i < 3; i++) {
            const tx = cx - w * 0.2 + w * 0.2 * i;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tx, cy - w * 0.05, w * 0.1, w * 0.12);
            ctx.strokeRect(tx, cy - w * 0.05, w * 0.1, w * 0.12);
        }
    } else if (mood === 'rage') {
        // Open mouth with jagged teeth
        ctx.fillStyle = '#220000';
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.4, w * 0.25 + sin(t * 8) * w * 0.05, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = color || '#440000';
        ctx.stroke();
        // Top teeth
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
            const tx = cx - w * 0.3 + w * 0.15 * i;
            ctx.beginPath();
            ctx.moveTo(tx, cy - w * 0.18);
            ctx.lineTo(tx + w * 0.05, cy - w * 0.04);
            ctx.lineTo(tx + w * 0.1, cy - w * 0.18);
            ctx.fill();
        }
    } else if (mood === 'smirk') {
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.25, cy);
        ctx.quadraticCurveTo(cx, cy + w * 0.15, cx + w * 0.3, cy - w * 0.05);
        ctx.stroke();
    } else if (mood === 'worry') {
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
            const mx = cx - w * 0.2 + w * 0.4 * (i / 6);
            const my = cy + sin(i * 1.5 + t * 6) * w * 0.06;
            i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
        }
        ctx.stroke();
    } else if (mood === 'serene') {
        ctx.beginPath();
        ctx.arc(cx, cy - w * 0.05, w * 0.2, 0.2, Math.PI - 0.2);
        ctx.stroke();
    } else { // neutral
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.15, cy);
        ctx.lineTo(cx + w * 0.15, cy);
        ctx.stroke();
    }
    ctx.restore();
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 19 : PROTON CRUSHER
//  Visual: 3 glowing quark spheres in a triangular cage
//  bound by helical gluon springs. Each quark has its own
//  face and color. When hit, the cage sparks.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawProtonCrusher(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const quarkCols = ['#ff2244', '#22dd66', '#2255ff'];
    const quarkNames = ['u', 'd', 's'];

    // === Confinement cage field ===
    const cores = boss.parts.filter(p => p.isCore && p.active);
    if (cores.length >= 2) {
        // Triangular confinement region
        ctx.save();
        ctx.globalAlpha = 0.07 + (st.isCritical ? 0.06 * sin(t * 12) : 0);
        ctx.beginPath();
        cores.forEach((c, i) => {
            const px = c.worldX + c.width / 2, py = c.worldY + c.height / 2;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,120,255,0.4)';
        ctx.fill();
        ctx.restore();
    }

    // === Gluon springs (helical energy tendrils) ===
    for (let i = 0; i < cores.length; i++) {
        for (let j = i + 1; j < cores.length; j++) {
            const a = cores[i], b = cores[j];
            const ax = a.worldX + a.width / 2, ay = a.worldY + a.height / 2;
            const bx = b.worldX + b.width / 2, by = b.worldY + b.height / 2;
            // Double helix
            for (let strand = 0; strand < 2; strand++) {
                const phase = strand * Math.PI;
                ctx.save();
                ctx.strokeStyle = quarkCols[(i + j + strand) % 3];
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = 0.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                const segs = 18;
                for (let s = 0; s <= segs; s++) {
                    const f = s / segs;
                    const mx = ax + (bx - ax) * f;
                    const my = ay + (by - ay) * f;
                    const perp = sin(f * Math.PI * 6 + t * 8 + phase) * 7;
                    const nx = -(by - ay), ny = (bx - ax);
                    const len = hypot(nx, ny) || 1;
                    const px = mx + nx / len * perp;
                    const py = my + ny / len * perp;
                    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // === Draw parts (arms/turrets with styled circles) ===
    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        _drawStyledPart(ctx, part, t, '#cc66ff', st);
    }

    // === Quark cores — large glossy spheres with faces ===
    for (let ci = 0; ci < cores.length; ci++) {
        const c = cores[ci];
        const pcx = c.worldX + c.width / 2;
        const pcy = c.worldY + c.height / 2;
        const pr = c.width / 2 * st.breathe;
        const col = quarkCols[ci % 3];

        ctx.save();
        // Outer glow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.55, 0, TAU);
        ctx.fill();

        // Body
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, col);
        thickOutline(ctx, darken(col, 0.45), 3);

        // Decoration: spinning charge ring inside body
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = lighten(col, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 0.6, t * 3 + ci * 2, t * 3 + ci * 2 + Math.PI * 1.3);
        ctx.stroke();

        // Face — each quark has a unique personality
        ctx.globalAlpha = 1;
        const lookAng = Math.PI * 0.5 + sin(t * 1.5 + ci) * 0.4;
        const eSize = pr * 0.22;
        if (ci === 0) {
            // Red quark — fierce angular eyes, fiery
            drawBossEye(ctx, pcx - pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#aa1100', 1);
            drawBossEye(ctx, pcx + pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#aa1100', 1);
            drawMouth(ctx, pcx, pcy + pr * 0.32, pr * 0.8, st.isCritical ? 'rage' : 'grin', t, '#660000');
        } else if (ci === 1) {
            // Green quark — sly cat-slit pupils
            drawSlitEye(ctx, pcx - pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#116633');
            drawSlitEye(ctx, pcx + pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#116633');
            drawMouth(ctx, pcx, pcy + pr * 0.32, pr * 0.8, st.isCritical ? 'rage' : 'smirk', t, '#004400');
        } else {
            // Blue quark — large cold diamond eyes
            drawDiamondEye(ctx, pcx - pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#1133aa');
            drawDiamondEye(ctx, pcx + pr * 0.26, pcy - pr * 0.05, eSize, lookAng, '#1133aa');
            drawMouth(ctx, pcx, pcy + pr * 0.32, pr * 0.8, st.isCritical ? 'rage' : 'serene', t, '#001166');
        }

        // Quark flavour letter (faint watermark)
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.55)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(quarkNames[ci % 3], pcx, pcy);

        _drawPartHitFlash(ctx, c, pcx, pcy, pr);
        ctx.restore();
    }

    // === Confinement timer arc ===
    if (boss._confinementTimer > 0) {
        const ratio = boss._confinementTimer / 5;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ff3355';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff3355';
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, boss.width * 0.44, -Math.PI / 2, -Math.PI / 2 + ratio * TAU);
        ctx.stroke();
        ctx.restore();
    }
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 20 : ELECTROWEAK UNIFIER
//  Visual: yin-yang duality body, left=gold(EM) right=blue(Weak),
//  rotating energy vortex, phase-dependent glow, confident face.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawElectroweakUnifier(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const isEM = boss._electroweakPhase === 'em';
    const pCol = isEM ? '#ffaa22' : '#3366ff';
    const emCol = '#ffaa22', wkCol = '#3366ff';

    // === Phase energy vortex ===
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.06;
    for (let ray = 0; ray < 16; ray++) {
        const a = TAU / 16 * ray + t * (isEM ? 1.8 : 0.5);
        const col = ray % 2 === 0 ? emCol : wkCol;
        ctx.strokeStyle = col;
        ctx.lineWidth = isEM ? 1 : 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const len = boss.width * 0.52;
        ctx.lineTo(cx + cos(a) * len, cy + sin(a) * len);
        ctx.stroke();
    }
    ctx.restore();

    haloRing(ctx, cx, cy, boss.width * 0.45, t, pCol, isEM ? 5 : 2);

    // === Non-core parts ===
    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        const partCol = (part.offsetX || 0) < 0 ? emCol : wkCol;
        _drawStyledPart(ctx, part, t, partCol, st);
    }

    // === Unified core body ===
    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        // Glow halo
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = pCol;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.5, 0, TAU);
        ctx.fill();

        // Yin-yang split body
        ctx.globalAlpha = 1;
        // Left half (EM gold)
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        glossyBody(ctx, pcx - pr * 0.15, pcy, pr, emCol);
        // Right half (Weak blue)
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, Math.PI / 2, Math.PI * 1.5);
        ctx.closePath();
        glossyBody(ctx, pcx + pr * 0.15, pcy, pr, wkCol);

        // Full outline overtop
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        thickOutline(ctx, darken(pCol, 0.35), 3.5);

        // Yin-yang dividing S-curve
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pcx, pcy - pr);
        ctx.bezierCurveTo(pcx + pr * 0.5, pcy - pr * 0.3,
            pcx - pr * 0.5, pcy + pr * 0.3,
            pcx, pcy + pr);
        ctx.stroke();
        ctx.restore();

        // Small yin-yang dots
        ctx.fillStyle = wkCol; ctx.beginPath();
        ctx.arc(pcx, pcy - pr * 0.3, pr * 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = emCol; ctx.beginPath();
        ctx.arc(pcx, pcy + pr * 0.3, pr * 0.1, 0, TAU); ctx.fill();

        // Active phase glow overlay
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 + 0.08 * sin(t * 5);
        ctx.fillStyle = pCol;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 0.6, 0, TAU);
        ctx.fill();
        ctx.restore();

        // Face — dual-nature: EM (starburst) left, Weak (heavy-lid) right
        const lookAng = Math.PI * 0.5 + sin(t * 1.2) * 0.35;
        const eS = pr * 0.17;
        drawStarburstEye(ctx, pcx - pr * 0.25, pcy - pr * 0.08, eS, lookAng, '#cc6600', t);
        drawBossEye(ctx, pcx + pr * 0.25, pcy - pr * 0.08, eS, lookAng, '#2244aa', 5);
        const mMood = st.isCritical ? 'rage' : (isEM ? 'smirk' : 'grin');
        drawMouth(ctx, pcx, pcy + pr * 0.3, pr * 0.7, mMood, t, '#333');

        // Phase label watermark
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.32)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isEM ? 'EM' : 'WEAK', pcx, pcy + pr * 0.02);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 21 : GLUON OVERLORD
//  Visual: Large menacing core with 8 orbiting color-charge turrets
//  connected by crackling energy arcs. Inner rotating mandala.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawGluonOverlord(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const chargeCols = ['#ff2244', '#22dd66', '#2266ff', '#ffdd22'];

    // === Field rings (dashed) ===
    ctx.save();
    for (let i = 0; i < 3; i++) {
        const r = 50 + i * 15;
        ctx.globalAlpha = 0.05 + 0.02 * sin(t * 2 + i);
        ctx.strokeStyle = chargeCols[i];
        ctx.lineWidth = 1;
        ctx.setLineDash([4 + i * 2, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // === Energy arcs between paired turrets ===
    const turrets = boss.parts.filter(p => p.role === 'turret' && p.active);
    for (let i = 0; i < turrets.length; i += 2) {
        if (i + 1 >= turrets.length) break;
        const a = turrets[i], b = turrets[i + 1];
        energyTendril(ctx,
            a.worldX + a.width / 2, a.worldY + a.height / 2,
            b.worldX + b.width / 2, b.worldY + b.height / 2,
            t, chargeCols[floor(i / 2) % 4], 2, 8);
    }

    // === Non-core parts ===
    for (let i = 0; i < turrets.length; i++) {
        _drawStyledPart(ctx, turrets[i], t, chargeCols[floor(i / 2) % 4], st);
    }
    for (const p of boss.parts) {
        if (p.active && !p.isCore && p.role !== 'turret') _drawStyledPart(ctx, p, t, '#33ff88', st);
    }

    // === Massive core ===
    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        // Large glow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#22cc66';
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.6, 0, TAU);
        ctx.fill();

        // Body
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, '#22cc66');
        thickOutline(ctx, '#0a4422', 3.5);

        // Inner mandala — 8-fold spinning pattern
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.translate(pcx, pcy);
        ctx.rotate(t * 0.4);
        for (let i = 0; i < 8; i++) {
            const a = TAU / 8 * i;
            ctx.strokeStyle = chargeCols[i % 4];
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cos(a) * pr * 0.85, sin(a) * pr * 0.85);
            ctx.stroke();
            // Decorative arc at end
            ctx.beginPath();
            ctx.arc(cos(a) * pr * 0.65, sin(a) * pr * 0.65, pr * 0.12, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();

        // Imperious face — three compound eyes in inverted triangle
        const ceS = pr * 0.14;
        drawCompoundEye(ctx, pcx - pr * 0.22, pcy - pr * 0.12, ceS, '#ff2244');
        drawCompoundEye(ctx, pcx + pr * 0.22, pcy - pr * 0.12, ceS, '#2266ff');
        drawCompoundEye(ctx, pcx, pcy + pr * 0.08, ceS, '#22dd66');
        // Triangular stern mouth
        ctx.save();
        ctx.strokeStyle = '#002200';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pcx - pr * 0.2, pcy + pr * 0.28);
        ctx.lineTo(pcx, pcy + pr * 0.36);
        ctx.lineTo(pcx + pr * 0.2, pcy + pr * 0.28);
        ctx.stroke();
        if (st.isCritical) {
            ctx.fillStyle = '#220000';
            ctx.fill();
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 4; i++) {
                const tx = pcx - pr * 0.12 + pr * 0.08 * i;
                ctx.beginPath();
                ctx.moveTo(tx, pcy + pr * 0.29);
                ctx.lineTo(tx + pr * 0.02, pcy + pr * 0.33);
                ctx.lineTo(tx + pr * 0.04, pcy + pr * 0.29);
                ctx.fill();
            }
        }
        ctx.restore();

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 22 : HIGGS MANIFESTATION
//  Visual: Magnificent golden entity with crystalline crown,
//  concentric mass-well rings, floating golden motes,
//  serene regal face that turns menacing at low HP.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawHiggsManifestation(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);

    // === Mexican hat potential rings ===
    ctx.save();
    for (let ring = 0; ring < 7; ring++) {
        const r = 25 + ring * 16 + sin(t * 0.8 + ring * 0.7) * 3;
        ctx.globalAlpha = 0.04 + 0.02 * (6 - ring) / 6;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5 + (6 - ring) * 0.25;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
    }
    ctx.restore();

    // === Mass well field lines ===
    if (boss._massWellActive) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        for (let i = 0; i < 20; i++) {
            const angle = TAU / 20 * i + t * 0.2;
            ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : '#ffeeaa';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let s = 0; s < 10; s++) {
                const dist = 130 - s * 13;
                const spiral = sin(s * 0.5 + t * 3) * 6;
                const px = cx + cos(angle + spiral * 0.01) * dist;
                const py = cy + sin(angle + spiral * 0.01) * dist;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // === Floating golden motes ===
    orbitMotes(ctx, cx, cy, 55, 12, t * 0.5, ['#ffd700', '#ffe066', '#ffcc33'], 3);

    // === Non-core parts ===
    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        const col = part.role === 'weakpoint' ? '#ff4444' : '#ffd700';
        _drawStyledPart(ctx, part, t, col, st);
    }

    // === Golden core with crown ===
    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        // Majestic glow
        ctx.globalAlpha = 0.1;
        const gG = ctx.createRadialGradient(pcx, pcy, pr * 0.3, pcx, pcy, pr * 1.7);
        gG.addColorStop(0, '#ffd700');
        gG.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = gG;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.7, 0, TAU);
        ctx.fill();

        // Main body
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, '#ffcc00');
        thickOutline(ctx, '#996600', 3.5);

        // === Crown — crystalline spikes ===
        ctx.save();
        const spikes = 7;
        for (let i = 0; i < spikes; i++) {
            const a = -Math.PI * 0.85 + (Math.PI * 0.7 / (spikes - 1)) * i;
            const bx = pcx + cos(a) * pr * 0.92;
            const by = pcy + sin(a) * pr * 0.92;
            // Only draw if above center
            if (by < pcy - pr * 0.05) {
                const spikeLen = 10 + (i === 3 ? 5 : 0) + sin(t * 2 + i) * 2;
                const tipX = bx + cos(a) * spikeLen;
                const tipY = by + sin(a) * spikeLen;
                // Spike body (gradient)
                const sG = ctx.createLinearGradient(bx, by, tipX, tipY);
                sG.addColorStop(0, '#ffd700');
                sG.addColorStop(1, '#ffffff');
                ctx.fillStyle = sG;
                ctx.beginPath();
                ctx.moveTo(bx - cos(a + Math.PI / 2) * 4, by - sin(a + Math.PI / 2) * 4);
                ctx.lineTo(tipX, tipY);
                ctx.lineTo(bx + cos(a + Math.PI / 2) * 4, by + sin(a + Math.PI / 2) * 4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#cc9900';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Jewel at tip
                ctx.fillStyle = i % 2 === 0 ? '#ff3355' : '#3388ff';
                ctx.beginPath();
                ctx.arc(tipX, tipY, 2.5, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();

        // Horizontal crown band
        ctx.save();
        ctx.globalAlpha = 0.6;
        const bandY = pcy - pr * 0.55;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(pcx, bandY, pr * 0.65, 3, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        // Face — regal diamond-pupil eyes, elegant serene expression
        const lookAng = Math.PI * 0.5 + sin(t * 0.7) * 0.25;
        const eS = pr * 0.16;
        drawDiamondEye(ctx, pcx - pr * 0.22, pcy - pr * 0.02, eS, lookAng, '#8B6914');
        drawDiamondEye(ctx, pcx + pr * 0.22, pcy - pr * 0.02, eS, lookAng, '#8B6914');
        // Crown-like lash decorations above each eye
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        for (let side = -1; side <= 1; side += 2) {
            const ex = pcx + side * pr * 0.22;
            const eyTop = pcy - pr * 0.02 - eS * 0.7;
            for (let l = -2; l <= 2; l++) {
                const lx = ex + l * eS * 0.25;
                ctx.beginPath();
                ctx.moveTo(lx, eyTop);
                ctx.lineTo(lx, eyTop - eS * (0.22 + (l === 0 ? 0.1 : 0)));
                ctx.stroke();
            }
        }
        ctx.restore();
        const mMood = st.isCritical ? 'rage' : (st.isLow ? 'grin' : 'serene');
        drawMouth(ctx, pcx, pcy + pr * 0.32, pr * 0.65, mMood, t, '#6B4914');

        // H⁰ inscription
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.35)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('H⁰', pcx, pcy);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }

    // === Mass well indicator ===
    if (boss._massWellActive) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, boss.width * 0.38, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MASS WELL', cx, cy - boss.height / 2 - 28);
        ctx.restore();
    }
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 23 : ANTIMATTER SOVEREIGN
//  Visual: Twin cores — matter(blue) / antimatter(pink) —
//  floating in a crackling annihilation boundary zone.
//  Sparks, mirror symmetry, opposing faces.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawAntimatterSovereign(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const matCol = '#3388ff', antiCol = '#ff3388';

    // === Annihilation boundary — crackling energy column ===
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff88cc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let y = cy - boss.height * 0.42; y < cy + boss.height * 0.42; y += 2) {
        const wx = cx + sin((y - cy) * 0.1 + t * 6) * 5;
        y === cy - boss.height * 0.42 ? ctx.moveTo(wx, y) : ctx.lineTo(wx, y);
    }
    ctx.stroke();
    ctx.restore();

    // === Annihilation sparks ===
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
        const sy = cy + (i / 11 - 0.5) * boss.height * 0.8;
        const sx = cx + sin(t * 10 + i * 2.5) * 6;
        ctx.globalAlpha = 0.35 + 0.35 * sin(t * 14 + i * 3);
        ctx.fillStyle = i % 2 ? antiCol : matCol;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + sin(t * 7 + i) * 1, 0, TAU);
        ctx.fill();
    }
    ctx.restore();

    // === Non-core parts ===
    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        const isLeft = (part.offsetX || 0) < 0;
        _drawStyledPart(ctx, part, t, isLeft ? matCol : antiCol, st);
    }

    // === Twin cores ===
    for (const core of boss.coreParts) {
        if (!core.active) continue;
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;
        const isMatter = (core.offsetX || 0) < 0;
        const col = isMatter ? matCol : antiCol;
        const lightCol = isMatter ? '#aaccff' : '#ffaacc';
        const label = isMatter ? 'e⁻' : 'e⁺';

        ctx.save();
        // Antipodal glow
        ctx.globalAlpha = 0.1 + 0.04 * sin(t * 4);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.5, 0, TAU);
        ctx.fill();

        // Body
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, col);
        thickOutline(ctx, darken(col, 0.4), 3);

        // Spinning inner ring (mirror direction)
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = lightCol;
        ctx.lineWidth = 1;
        const dir = isMatter ? 1 : -1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 0.55, t * 2 * dir, t * 2 * dir + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();

        // Face — matter=wise diamond eyes, antimatter=chaotic wild
        const lookDir = isMatter ? 0.3 : -0.3 + Math.PI;
        const lookAng = Math.PI * 0.5 + lookDir + sin(t * 1.5) * 0.2;
        const eS = pr * 0.19;
        if (isMatter) {
            drawDiamondEye(ctx, pcx - pr * 0.24, pcy - pr * 0.05, eS, lookAng, '#1155cc');
            drawDiamondEye(ctx, pcx + pr * 0.24, pcy - pr * 0.05, eS, lookAng, '#1155cc');
            drawMouth(ctx, pcx, pcy + pr * 0.3, pr * 0.6, st.isCritical ? 'rage' : 'serene', t, darken(col, 0.5));
        } else {
            // Antimatter: mismatched chaotic eyes
            drawBossEye(ctx, pcx - pr * 0.24, pcy - pr * 0.08, eS * 1.15, lookAng, '#cc1155', 1);
            drawBossEye(ctx, pcx + pr * 0.28, pcy - pr * 0.02, eS * 0.85, lookAng, '#ff3388', 4);
            drawMouth(ctx, pcx, pcy + pr * 0.3, pr * 0.6, st.isCritical ? 'rage' : 'grin', t, darken(col, 0.5));
        }

        // Label watermark
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.35)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, pcx, pcy);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }

    // === Damage balance bar ===
    if (boss._damageBalance !== undefined) {
        const bal = boss._damageBalance;
        const barW = 80, barH = 6;
        const barX = cx - barW / 2;
        const barY = cy - boss.height / 2 - 36;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        const mid = barX + barW / 2;
        const offset = max(-barW / 2, min(barW / 2, bal * 2));
        ctx.fillStyle = offset > 0 ? matCol : antiCol;
        ctx.fillRect(mid, barY, offset, barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mid, barY - 1); ctx.lineTo(mid, barY + barH + 1);
        ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BALANCE', cx, barY - 2);
        ctx.restore();
    }
}

// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//  BOSS 24 : GRAND UNIFIED THEORY (final boss)
//  Visual: Enormous white/prismatic core radiating 4 colour
//  quadrant energy. Third eye. Force-cycling mandala.
//  The most impressive entity in the game.
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

function drawGrandUnifiedTheory(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const fCols = ['#ff2244', '#ffdd22', '#3366ff', '#22dd66'];
    const fNames = ['STRONG', 'EM', 'WEAK', 'GRAVITY'];
    const af = boss._activeForce || 0;

    // === Grand mandala — rotating 4-color quadrants ===
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.15);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = fCols[i];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, boss.width * 0.55, TAU / 4 * i, TAU / 4 * (i + 1));
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // === Force lightning to each quadrant ===
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 4; i++) {
        const angle = TAU / 4 * i + TAU / 8 + t * 0.3;
        const ex = cx + cos(angle) * boss.width * 0.42;
        const ey = cy + sin(angle) * boss.width * 0.42;
        energyTendril(ctx, cx, cy, ex, ey, t, fCols[i], i === af ? 3 : 1.5, 10);
    }
    ctx.restore();

    // === Active force ring ===
    haloRing(ctx, cx, cy, boss.width * 0.42, t, fCols[af], 4);

    // === Non-core parts ===
    const turretParts = boss.parts.filter(p => p.role === 'turret' && p.active);
    for (let i = 0; i < turretParts.length; i++) {
        _drawStyledPart(ctx, turretParts[i], t, fCols[i % 4], st);
    }
    for (const p of boss.parts) {
        if (!p.active || p.isCore || p.role === 'turret') continue;
        _drawStyledPart(ctx, p, t, '#ccccff', st);
    }

    // === Epic core ===
    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        // Prismatic glow
        ctx.globalAlpha = 0.12;
        const pG = ctx.createRadialGradient(pcx, pcy, pr * 0.2, pcx, pcy, pr * 1.8);
        pG.addColorStop(0, '#ffffff');
        pG.addColorStop(0.4, fCols[af]);
        pG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pG;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 1.8, 0, TAU);
        ctx.fill();

        // White body
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, '#eeeeff', 0.3);

        // 4-color border segments (active one thicker)
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = fCols[i];
            ctx.lineWidth = i === af ? 5 : 2.5;
            ctx.globalAlpha = i === af ? 0.85 : 0.35;
            ctx.beginPath();
            ctx.arc(pcx, pcy, pr, TAU / 4 * i - Math.PI / 4, TAU / 4 * (i + 1) - Math.PI / 4);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Inner rotating force sigil
        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(t * 0.8);
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = fCols[i];
            ctx.lineWidth = 1;
            const a = TAU / 4 * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cos(a) * pr * 0.7, sin(a) * pr * 0.7);
            ctx.stroke();
        }
        ctx.restore();

        // Face — cosmic prismatic eyes
        ctx.globalAlpha = 1;
        const lookAng = Math.PI * 0.5 + sin(t * 0.6) * 0.4;
        const eS = pr * 0.15;
        drawPrismaticEye(ctx, pcx - pr * 0.22, pcy - pr * 0.02, eS, lookAng, t);
        drawPrismaticEye(ctx, pcx + pr * 0.22, pcy - pr * 0.02, eS, lookAng, t);

        // THIRD EYE — vertical almond, pulsing with active force color
        ctx.save();
        const teY = pcy - pr * 0.32;
        const teS = eS * 0.8;
        const teAlpha = 0.6 + 0.3 * sin(t * 3);
        ctx.globalAlpha = teAlpha;
        ctx.fillStyle = fCols[af];
        ctx.beginPath();
        ctx.arc(pcx, teY, teS * 1.4, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Vertical almond third eye with slit pupil
        ctx.fillStyle = '#fffff8';
        ctx.beginPath();
        ctx.moveTo(pcx, teY - teS * 1.0);
        ctx.quadraticCurveTo(pcx + teS * 0.7, teY, pcx, teY + teS * 1.0);
        ctx.quadraticCurveTo(pcx - teS * 0.7, teY, pcx, teY - teS * 1.0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = fCols[af];
        ctx.beginPath();
        ctx.arc(pcx, teY, teS * 0.45, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(pcx, teY, teS * 0.07, teS * 0.35, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(pcx - teS * 0.1, teY - teS * 0.1, teS * 0.1, 0, TAU);
        ctx.fill();
        // Radiating beams from third eye
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = fCols[af];
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = TAU / 6 * i + t * 1.5;
            ctx.beginPath();
            ctx.moveTo(pcx + cos(a) * teS * 0.5, teY + sin(a) * teS * 0.5);
            ctx.lineTo(pcx + cos(a) * teS * 1.8, teY + sin(a) * teS * 1.8);
            ctx.stroke();
        }
        ctx.restore();

        // Calm cosmic mouth
        const mMood = st.isCritical ? 'rage' : (st.isLow ? 'grin' : 'serene');
        drawMouth(ctx, pcx, pcy + pr * 0.28, pr * 0.7, mMood, t, '#333');

        // Force symbol watermark
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = fCols[af];
        ctx.font = `bold ${Math.trunc(pr * 0.4)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['g', 'γ', 'W', 'G'][af], pcx, pcy + pr * 0.05);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }

    // === Active force label ===
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = fCols[af];
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fNames[af] + ' FORCE', cx, cy - boss.height / 2 - 28);
    ctx.restore();
}


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
//  MINI-BOSSES (13–16)
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

// ────── MB 13 : CHARM QUARK ──────
// Colourful, cocky, fast. Rotates through R/G/B phases.

function drawCharmQuark(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const pCols = ['#ff4477', '#44ff77', '#4477ff'];
    const pi = boss._charmPhase || 0;
    const col = pCols[pi];

    haloRing(ctx, cx, cy, boss.width * 0.4, t * 2, col, 5);
    orbitMotes(ctx, cx, cy, boss.width * 0.3, 8, t * 2, pCols, 3);

    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        _drawStyledPart(ctx, part, t, col, st);
    }

    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(pcx, pcy, pr * 1.4, 0, TAU); ctx.fill();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, col);
        thickOutline(ctx, darken(col, 0.4), 2.5);

        // Cheeky face — feline slit-pupil eyes, Cheshire grin
        const eS = pr * 0.2;
        const look = Math.PI * 0.5 + sin(t * 3) * 0.5;
        drawSlitEye(ctx, pcx - pr * 0.24, pcy - pr * 0.06, eS, look, darken(col, 0.4));
        drawSlitEye(ctx, pcx + pr * 0.24, pcy - pr * 0.06, eS, look, darken(col, 0.4));
        // Wide Cheshire grin
        ctx.save();
        ctx.strokeStyle = darken(col, 0.5);
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(pcx, pcy + pr * 0.18, pr * 0.35, 0.15, Math.PI - 0.15);
        ctx.stroke();
        // Curved grin ends
        ctx.beginPath();
        ctx.arc(pcx - pr * 0.34, pcy + pr * 0.18, pr * 0.08, 0, -Math.PI * 0.6, true);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pcx + pr * 0.34, pcy + pr * 0.18, pr * 0.08, Math.PI, Math.PI + Math.PI * 0.6);
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.4)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('c', pcx, pcy);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }
}

// ────── MB 14 : STRANGE OSCILLATOR ──────
// Shape-shifts between circle/star/hexagon. Nervous energy.

function drawStrangeOscillator(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const sCols = ['#55ddff', '#ff55dd', '#55ffdd'];
    const sLabels = ['NORMAL', 'RAPID', 'INVULN'];
    const si = boss._oscillationState || 0;
    const col = sCols[si];

    // State rings
    ctx.save();
    for (let i = 0; i < 3; i++) {
        const r = boss.width * 0.32 + i * 8;
        const phase = t * 4 + i * TAU / 3;
        ctx.globalAlpha = i === si ? 0.22 : 0.04;
        ctx.strokeStyle = sCols[i];
        ctx.lineWidth = i === si ? 2.5 : 1;
        ctx.beginPath();
        const n = 40;
        for (let a = 0; a <= n; a++) {
            const ang = (a / n) * TAU;
            const wobble = sin(ang * 6 + phase) * 3;
            const px = cx + cos(ang) * (r + wobble);
            const py = cy + sin(ang) * (r + wobble);
            a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }
    ctx.restore();

    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        _drawStyledPart(ctx, part, t, col, st);
    }

    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        ctx.globalAlpha = 1;
        // Morphing body shape
        ctx.beginPath();
        if (si === 0) {
            ctx.arc(pcx, pcy, pr, 0, TAU);
        } else if (si === 1) {
            // Star
            for (let i = 0; i < 10; i++) {
                const a = TAU / 10 * i - TAU / 4;
                const rr = i % 2 === 0 ? pr : pr * 0.6;
                const px = pcx + cos(a) * rr, py = pcy + sin(a) * rr;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else {
            // Hexagon
            for (let i = 0; i < 6; i++) {
                const a = TAU / 6 * i - TAU / 4;
                const px = pcx + cos(a) * pr, py = pcy + sin(a) * pr;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        glossyBody(ctx, pcx, pcy, pr, col);
        thickOutline(ctx, darken(col, 0.4), 3);

        // Unstable face — hypnotic spiral eyes, oscillating wave mouth
        const eS = pr * 0.18;
        drawSpiralEye(ctx, pcx - pr * 0.22, pcy - pr * 0.06, eS, col, t);
        drawSpiralEye(ctx, pcx + pr * 0.22, pcy - pr * 0.06, eS, col, t);
        // Sine-wave mouth
        ctx.save();
        ctx.strokeStyle = darken(col, 0.5);
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const mY = pcy + pr * 0.3;
        for (let i = 0; i <= 12; i++) {
            const mx = pcx - pr * 0.25 + pr * 0.5 * (i / 12);
            const my = mY + sin(i * 1.2 + t * 6) * pr * 0.06;
            i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
        }
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.35)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('s', pcx, pcy);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }

    // State label
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = col;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sLabels[si], cx, cy - boss.height / 2 - 22);
    ctx.restore();
}

// ────── MB 15 : TOP RESONANCE ──────
// Golden, shielded, focused. Rotating shield wall.

function drawTopResonance(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);

    // Resonance rings
    ctx.save();
    for (let i = 0; i < 3; i++) {
        const r = boss.width * 0.26 + i * 10;
        ctx.globalAlpha = 0.06 + 0.03 * sin(t * 6 + i * 2);
        ctx.strokeStyle = '#ffcc33';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    ctx.restore();

    // Shields
    for (const part of boss.parts) {
        if (!part.active || part.role !== 'shield') continue;
        const pcx = part.worldX + part.width / 2;
        const pcy = part.worldY + part.height / 2;
        const pr = part.width / 2;
        ctx.save();
        const sa = Math.atan2(pcy - cy, pcx - cx);
        ctx.translate(pcx, pcy);
        ctx.rotate(sa + Math.PI / 2);
        ctx.translate(-pcx, -pcy);
        ctx.beginPath();
        ctx.ellipse(pcx, pcy, pr, pr * 0.35, 0, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr * 0.6, '#4488ff');
        ctx.strokeStyle = '#2266cc';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Shimmer
        ctx.globalAlpha = 0.3 + 0.2 * sin(t * 5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(pcx, pcy - pr * 0.1, pr * 0.5, pr * 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    // Non-shield non-core parts
    for (const part of boss.parts) {
        if (!part.active || part.isCore || part.role === 'shield') continue;
        _drawStyledPart(ctx, part, t, '#ffcc33', st);
    }

    // Core
    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, '#ffcc33');
        thickOutline(ctx, '#886600', 3);

        // Focused tactical face — reticle crosshair eyes
        const eS = pr * 0.18;
        drawReticleEye(ctx, pcx - pr * 0.22, pcy - pr * 0.06, eS, Math.PI * 0.5, '#886600');
        drawReticleEye(ctx, pcx + pr * 0.22, pcy - pr * 0.06, eS, Math.PI * 0.5, '#886600');
        // Stern flat mouth with slight downturn
        ctx.save();
        ctx.strokeStyle = '#664400';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pcx - pr * 0.18, pcy + pr * 0.28);
        ctx.lineTo(pcx, pcy + pr * 0.3);
        ctx.lineTo(pcx + pr * 0.18, pcy + pr * 0.28);
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.35)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('t', pcx, pcy);

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }
}

// ────── MB 16 : BOTTOM DECAYER ──────
// Unstable, worried, vibrating. Gets worse as HP drops.

function drawBottomDecayer(ctx, boss, t) {
    const cx = boss.centerX, cy = boss.centerY;
    const st = bossState(boss, t);
    const instability = 1 - st.hpRatio; // 0..1

    // Instability cracks (deterministic, not random per frame)
    ctx.save();
    ctx.globalAlpha = 0.35 * instability;
    ctx.strokeStyle = '#88ff55';
    ctx.lineWidth = 1.5;
    const crackN = floor(instability * 8) + 1;
    for (let i = 0; i < crackN; i++) {
        const seed = i * 137.508; // golden angle for determinism
        const angle = TAU / crackN * i + t * 0.15;
        ctx.beginPath();
        let px = cx, py = cy;
        ctx.moveTo(px, py);
        for (let s = 0; s < 5; s++) {
            // Deterministic jitter based on seed
            const jx = sin(seed + s * 7.3) * 0.6;
            const jy = cos(seed + s * 11.1) * 0.6;
            px += cos(angle + jx) * 11;
            py += sin(angle + jy) * 11;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Unstable glow
    ctx.save();
    ctx.globalAlpha = 0.04 + 0.14 * instability;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#88ff55';
    ctx.beginPath(); ctx.arc(cx, cy, boss.width * 0.4, 0, TAU); ctx.fill();
    ctx.restore();

    for (const part of boss.parts) {
        if (!part.active || part.isCore) continue;
        _drawStyledPart(ctx, part, t, '#88ff55', st);
    }

    const core = boss.coreParts[0];
    if (core && core.active) {
        const pcx = core.worldX + core.width / 2;
        const pcy = core.worldY + core.height / 2;
        const pr = core.width / 2 * st.breathe;

        // Deterministic vibration
        const vib = instability * 3;
        const vx = sin(t * 40) * vib;
        const vy = cos(t * 40 + 1) * vib;

        ctx.save();
        ctx.translate(vx, vy);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, TAU);
        glossyBody(ctx, pcx, pcy, pr, '#88ff55');
        thickOutline(ctx, '#336622', 2.5);

        // Worried face — asymmetric unstable eyes, crack through face
        const eS = pr * 0.19;
        const look = Math.PI * 0.5 + sin(t * 5) * 0.3;
        // Left eye bigger and drooping
        drawBossEye(ctx, pcx - pr * 0.23, pcy - pr * 0.04, eS * 1.15, look, '#336600', 2);
        // Right eye smaller and twitchy
        drawBossEye(ctx, pcx + pr * 0.25, pcy - pr * 0.08, eS * 0.8, look + sin(t * 12) * 0.3, '#448800', 2);
        // Crack line through face
        ctx.save();
        ctx.strokeStyle = 'rgba(136,255,85,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pcx + pr * 0.05, pcy - pr * 0.35);
        ctx.lineTo(pcx - pr * 0.02, pcy - pr * 0.1);
        ctx.lineTo(pcx + pr * 0.08, pcy + pr * 0.1);
        ctx.lineTo(pcx - pr * 0.03, pcy + pr * 0.35);
        ctx.stroke();
        ctx.restore();
        // Wobbling worried mouth
        drawMouth(ctx, pcx + sin(t * 8) * pr * 0.02, pcy + pr * 0.3, pr * 0.6, 'worry', t, '#336600');

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.trunc(pr * 0.35)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('b', pcx, pcy);

        // Decay warning
        if (st.hpRatio < 0.35) {
            ctx.globalAlpha = 0.5 + 0.3 * sin(t * 10);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ DECAY', pcx, pcy - pr - 12);
        }

        _drawPartHitFlash(ctx, core, pcx, pcy, pr);
        ctx.restore();
    }
}


// ───────── shared part renderer ─────────

function _drawStyledPart(ctx, part, t, baseColor, st) {
    if (!part.active) return;
    const pcx = part.worldX + part.width / 2;
    const pcy = part.worldY + part.height / 2;
    const pr = part.width / 2;

    ctx.save();
    if (part.rotation) {
        ctx.translate(pcx, pcy);
        ctx.rotate(part.rotation);
        ctx.translate(-pcx, -pcy);
    }

    const roleColor = part.isCore ? baseColor :
        part.role === 'turret' ? lighten(baseColor, 0.25) :
            part.role === 'shield' ? '#4488ff' :
                part.role === 'weakpoint' ? '#ff4444' :
                    darken(baseColor, 0.2);

    // Soft glow
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = roleColor;
    ctx.beginPath(); ctx.arc(pcx, pcy, pr * 1.35, 0, TAU); ctx.fill();

    // Body
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, TAU);
    glossyBody(ctx, pcx, pcy, pr, roleColor);
    thickOutline(ctx, darken(roleColor, 0.45), 2.5);

    // Role decorations
    if (part.role === 'turret') {
        // Barrel
        ctx.fillStyle = darken(roleColor, 0.35);
        ctx.fillRect(pcx - pr * 0.14, pcy + pr * 0.45, pr * 0.28, pr * 0.65);
        ctx.fillRect(pcx - pr * 0.2, pcy + pr * 0.95, pr * 0.4, pr * 0.15);
        // Muzzle glow
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.35 + 0.2 * sin(t * 8);
        ctx.beginPath();
        ctx.arc(pcx, pcy + pr * 1.0, pr * 0.12, 0, TAU);
        ctx.fill();
    } else if (part.role === 'shield') {
        ctx.globalAlpha = 0.35 + 0.15 * sin(t * 3);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr * 0.75, -0.85, 0.85);
        ctx.stroke();
    } else if (part.role === 'weakpoint') {
        ctx.globalAlpha = 0.4 + 0.3 * sin(t * 5);
        ctx.fillStyle = '#ff6666';
        ctx.beginPath(); ctx.arc(pcx, pcy, pr * 0.35, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(pcx - pr * 0.5, pcy); ctx.lineTo(pcx + pr * 0.5, pcy);
        ctx.moveTo(pcx, pcy - pr * 0.5); ctx.lineTo(pcx, pcy + pr * 0.5);
        ctx.stroke();
    }

    _drawPartHitFlash(ctx, part, pcx, pcy, pr);
    ctx.restore();
}

function _drawPartHitFlash(ctx, part, pcx, pcy, pr) {
    if (part.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = part.hitFlash * 0.55;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, TAU); ctx.fill();
        ctx.restore();
    }
}


// ═══════════════════════════════════════════════
//  PUBLIC DISPATCHERS
// ═══════════════════════════════════════════════

const BOSS_RENDERERS = {
    19: drawProtonCrusher,
    20: drawElectroweakUnifier,
    21: drawGluonOverlord,
    22: drawHiggsManifestation,
    23: drawAntimatterSovereign,
    24: drawGrandUnifiedTheory,
};

const MINIBOSS_RENDERERS = {
    13: drawCharmQuark,
    14: drawStrangeOscillator,
    15: drawTopResonance,
    16: drawBottomDecayer,
};

export function drawW4Boss(ctx, boss, t) {
    const fn = BOSS_RENDERERS[boss.bossId];
    if (fn) { fn(ctx, boss, t); return true; }
    return false;
}

export function drawW4MiniBoss(ctx, boss, t) {
    const fn = MINIBOSS_RENDERERS[boss.bossId];
    if (fn) { fn(ctx, boss, t); return true; }
    return false;
}
